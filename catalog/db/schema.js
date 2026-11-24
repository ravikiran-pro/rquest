'use strict';

/**
 * Versioned DDL for the `catalog` schema. Kept as .js (not .sql) because the repo's
 * root .gitignore ignores *.sql files.
 *
 * Rules:
 *  - Everything lives in schema `catalog`; nothing here references `public` tables.
 *  - Migrations are append-only. Never edit an applied migration — add a new one.
 *  - Each migration runs in its own transaction.
 */

// Columns every loader-managed table carries (see lib/loader.js).
const TRACKING = `
  content_hash        char(64)    NOT NULL,
  is_active           boolean     NOT NULL DEFAULT true,
  first_run_id        bigint      REFERENCES catalog.import_runs(id),
  last_changed_run_id bigint      REFERENCES catalog.import_runs(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()`;

const MIGRATIONS = [
  {
    version: 1,
    name: 'core run tracking + HSN/SAC codes and GST rates',
    sql: `
CREATE TABLE catalog.import_runs (
  id             bigserial PRIMARY KEY,
  source         text        NOT NULL,
  source_version text,
  input_sha256   text,
  status         text        NOT NULL
                 CHECK (status IN ('running', 'succeeded', 'failed', 'dry_run', 'skipped')),
  stats          jsonb       NOT NULL DEFAULT '{}'::jsonb,
  error          text,
  started_at     timestamptz NOT NULL DEFAULT now(),
  finished_at    timestamptz
);
CREATE INDEX import_runs_source_idx ON catalog.import_runs (source, id DESC);

CREATE TABLE catalog.rejects (
  id         bigserial PRIMARY KEY,
  run_id     bigint NOT NULL REFERENCES catalog.import_runs(id) ON DELETE CASCADE,
  source     text   NOT NULL,
  entity     text   NOT NULL,
  source_key text,
  reason     text   NOT NULL,
  raw        jsonb
);
CREATE INDEX rejects_run_idx ON catalog.rejects (run_id);

-- Anything a human must decide: invalid rates, possible duplicates, low-confidence matches.
CREATE TABLE catalog.review_queue (
  id           bigserial PRIMARY KEY,
  source       text        NOT NULL,
  kind         text        NOT NULL,
  entity       text        NOT NULL,
  entity_key   text        NOT NULL,
  payload      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status       text        NOT NULL DEFAULT 'open'
               CHECK (status IN ('open', 'resolved', 'dismissed')),
  first_run_id bigint      REFERENCES catalog.import_runs(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz,
  resolution   text
);
-- One open item per (kind, entity, key): re-runs update it instead of piling up duplicates.
CREATE UNIQUE INDEX review_queue_open_uniq
  ON catalog.review_queue (kind, entity, entity_key) WHERE status = 'open';

-- ── HSN / SAC master ───────────────────────────────────────────────────────────
-- One row per code. The code is the identity, so duplicates are impossible by design.
-- Codes are stored digits-only, zero-padded to an even length (2/4/6/8).
CREATE TABLE catalog.hsn_codes (
  code              varchar(8)  PRIMARY KEY CHECK (code ~ '^[0-9]{2}([0-9]{2}){0,3}$'),
  type              varchar(3)  NOT NULL CHECK (type IN ('HSN', 'SAC')),
  level             smallint    GENERATED ALWAYS AS (length(code)) STORED,
  chapter           char(2)     GENERATED ALWAYS AS (left(code, 2)) STORED,
  parent_code       varchar(8)  REFERENCES catalog.hsn_codes(code) DEFERRABLE INITIALLY DEFERRED,
  description       text        NOT NULL CHECK (length(btrim(description)) > 0),
  description_raw   text,
  -- source: from the data; curated: seeds/; derived: built from child descriptions;
  -- placeholder: the source had no usable text (always paired with a review item)
  description_basis text        NOT NULL DEFAULT 'source'
                    CHECK (description_basis IN ('source', 'curated', 'derived', 'placeholder')),
  ${TRACKING},
  CONSTRAINT hsn_sac_is_chapter_99 CHECK ((type = 'SAC') = (left(code, 2) = '99')),
  CONSTRAINT hsn_parent_is_prefix CHECK (
    (length(code) = 2 AND parent_code IS NULL)
    OR (length(code) > 2
        AND parent_code IS NOT NULL
        AND length(parent_code) = length(code) - 2
        AND left(code, length(parent_code)) = parent_code)
  )
);
CREATE INDEX hsn_codes_parent_idx ON catalog.hsn_codes (parent_code);
CREATE INDEX hsn_codes_description_trgm ON catalog.hsn_codes USING gin (description gin_trgm_ops);

-- Each source's wording for a code. Disagreeing sources add rows here, never new codes.
CREATE TABLE catalog.hsn_source_descriptions (
  code        varchar(8) NOT NULL REFERENCES catalog.hsn_codes(code) DEFERRABLE INITIALLY DEFERRED,
  source      text       NOT NULL,
  description text       NOT NULL,
  ${TRACKING},
  PRIMARY KEY (code, source)
);

-- GST rates are versioned by date: a rate change is a new row, never an overwrite.
-- A rate on a short code (e.g. chapter "04") applies to every longer code under it,
-- unless a more specific row exists — see catalog.gst_rate().
CREATE TABLE catalog.hsn_rates (
  code             varchar(8)   NOT NULL REFERENCES catalog.hsn_codes(code) DEFERRABLE INITIALLY DEFERRED,
  effective_from   date         NOT NULL,
  effective_to     date,
  igst_rate        numeric(5,2) NOT NULL CHECK (igst_rate >= 0 AND igst_rate <= 40),
  cess_rate        numeric(6,2) NOT NULL DEFAULT 0 CHECK (cess_rate >= 0),
  basis            text         NOT NULL CHECK (basis IN ('item', 'subheading', 'heading', 'chapter')),
  verified         boolean      NOT NULL DEFAULT false,
  source           text         NOT NULL,
  notification_ref text,
  ${TRACKING},
  PRIMARY KEY (code, effective_from),
  CHECK (effective_to IS NULL OR effective_to > effective_from),
  -- GST 2.0 (22 Sep 2025) removed the 12% and 28% slabs.
  CONSTRAINT hsn_rates_gst2_slabs CHECK (
    effective_from < DATE '2025-09-22'
    OR igst_rate IN (0, 0.1, 0.25, 1.5, 3, 5, 18, 40)
  ),
  -- At most one active rate per code for any given day.
  CONSTRAINT hsn_rates_no_overlap EXCLUDE USING gist (
    code WITH =,
    daterange(effective_from, effective_to, '[)') WITH &&
  ) WHERE (is_active)
);

-- Normalise any user/source input to the canonical stored form. Mirrors lib/hsn.js.
CREATE FUNCTION catalog.normalize_hsn(p_raw text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $fn$
  SELECT CASE
    WHEN d = '' THEN NULL
    WHEN length(d) % 2 = 1 AND left(d, 2) = '99' THEN NULL  -- 5-digit SAC groups unsupported
    WHEN length(d) % 2 = 1 AND length(d) < 8 THEN '0' || d  -- lost leading zero (chapters 01-09)
    WHEN length(d) BETWEEN 2 AND 8 AND length(d) % 2 = 0 THEN d
    ELSE NULL
  END
  FROM (SELECT regexp_replace(coalesce(p_raw, ''), '[^0-9]', '', 'g') AS d) s
$fn$;

-- Most specific active rate for a code on a date (longest matching prefix wins).
CREATE FUNCTION catalog.gst_rate(p_code text, p_on date DEFAULT current_date)
RETURNS TABLE (
  matched_code   varchar,
  igst_rate      numeric,
  cgst_rate      numeric,
  sgst_rate      numeric,
  cess_rate      numeric,
  basis          text,
  verified       boolean,
  effective_from date,
  source         text
)
LANGUAGE sql STABLE AS $fn$
  SELECT r.code, r.igst_rate, r.igst_rate / 2, r.igst_rate / 2, r.cess_rate,
         r.basis, r.verified, r.effective_from, r.source
  FROM catalog.hsn_rates r
  WHERE r.is_active
    AND catalog.normalize_hsn(p_code) LIKE r.code || '%'
    AND daterange(r.effective_from, r.effective_to, '[)') @> p_on
  ORDER BY length(r.code) DESC, r.verified DESC
  LIMIT 1
$fn$;
`,
  },
  {
    version: 2,
    name: 'taxonomies: nodes, attributes, cross-mappings, default HSN per node',
    sql: `
-- One table for every classification scheme. id = '<scheme>:<external_id>' so ids never
-- collide across schemes, and a node can only have a parent from its own scheme.
CREATE TABLE catalog.taxonomy_nodes (
  id          text       PRIMARY KEY,
  scheme      text       NOT NULL CHECK (scheme IN ('shopify', 'ondc', 'shop_type', 'service')),
  external_id text       NOT NULL,
  parent_id   text       REFERENCES catalog.taxonomy_nodes(id) DEFERRABLE INITIALLY DEFERRED,
  name        text       NOT NULL CHECK (length(btrim(name)) > 0),
  full_path   text       NOT NULL,
  level       smallint   NOT NULL CHECK (level >= 0),
  attributes  jsonb      NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(attributes) = 'array'),
  extra       jsonb      NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(extra) = 'object'),
  ${TRACKING},
  UNIQUE (scheme, external_id),
  CONSTRAINT taxonomy_id_format CHECK (id = scheme || ':' || external_id),
  CONSTRAINT taxonomy_parent_same_scheme CHECK (parent_id IS NULL OR parent_id LIKE scheme || ':%'),
  CONSTRAINT taxonomy_root_level CHECK ((parent_id IS NULL) = (level = 0))
);
CREATE INDEX taxonomy_nodes_parent_idx ON catalog.taxonomy_nodes (parent_id);
CREATE INDEX taxonomy_nodes_name_trgm ON catalog.taxonomy_nodes USING gin (name gin_trgm_ops);

CREATE TABLE catalog.taxonomy_attributes (
  id          text PRIMARY KEY,
  scheme      text NOT NULL,
  handle      text NOT NULL,
  name        text NOT NULL,
  description text,
  ${TRACKING},
  UNIQUE (scheme, handle),
  CONSTRAINT taxonomy_attribute_id_format CHECK (id = scheme || ':' || handle)
);

-- Curated links between schemes (e.g. ONDC domain ↔ Shopify vertical, shop type → domain).
CREATE TABLE catalog.taxonomy_mappings (
  from_id  text NOT NULL REFERENCES catalog.taxonomy_nodes(id) DEFERRABLE INITIALLY DEFERRED,
  to_id    text NOT NULL REFERENCES catalog.taxonomy_nodes(id) DEFERRABLE INITIALLY DEFERRED,
  relation text NOT NULL CHECK (relation IN ('exact', 'broader', 'narrower', 'related')),
  source   text NOT NULL,
  ${TRACKING},
  PRIMARY KEY (from_id, to_id),
  CHECK (from_id <> to_id)
);

-- Suggested HSN/SAC for products in a category. One default per node; 'broad' means the
-- code is a chapter/heading that must be refined per product.
CREATE TABLE catalog.taxonomy_hsn_defaults (
  node_id    text       PRIMARY KEY REFERENCES catalog.taxonomy_nodes(id) DEFERRABLE INITIALLY DEFERRED,
  hsn_code   varchar(8) NOT NULL REFERENCES catalog.hsn_codes(code) DEFERRABLE INITIALLY DEFERRED,
  confidence text       NOT NULL CHECK (confidence IN ('exact', 'broad')),
  source     text       NOT NULL,
  note       text,
  ${TRACKING}
);
`,
  },
  {
    version: 3,
    name: 'products: brands, items, item_sources, enrichment view',
    sql: `
-- GS1 check digit for a canonical 14-digit GTIN. Mirrors lib/gtin.js.
CREATE FUNCTION catalog.gtin_is_valid(g text) RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $fn$
  SELECT g ~ '^[0-9]{14}$' AND g !~ '^0+$' AND
    (10 - (SELECT sum(substr(g, i, 1)::int * CASE WHEN i % 2 = 1 THEN 3 ELSE 1 END)
             FROM generate_series(1, 13) AS i) % 10) % 10 = substr(g, 14, 1)::int
$fn$;

CREATE TABLE catalog.brands (
  brand_key text PRIMARY KEY CHECK (brand_key ~ '^[a-z0-9]+( [a-z0-9]+)*$'),
  name      text NOT NULL CHECK (length(btrim(name)) > 0),
  aliases   jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(aliases) = 'array'),
  source    text NOT NULL,
  ${TRACKING}
);
CREATE INDEX brands_name_trgm ON catalog.brands USING gin (name gin_trgm_ops);

-- The master product. The id is deterministic, so duplicates cannot be created:
--   gtin:<14 digits>                 any valid barcode → one item, whatever the source
--   key:<sha256(dedupe_key)[0:20]>   no barcode: brand | name | base quantity | unit
--   src:<source>:<source id>         too incomplete to identify across sources
CREATE TABLE catalog.items (
  id                   text PRIMARY KEY
                       CHECK (id ~ '^(gtin:[0-9]{14}|key:[0-9a-f]{20}|src:[a-z0-9-]+:.+)$'),
  gtin                 varchar(14) UNIQUE CHECK (gtin IS NULL OR catalog.gtin_is_valid(gtin)),
  kind                 text NOT NULL DEFAULT 'product' CHECK (kind IN ('product', 'service')),
  name                 text NOT NULL CHECK (length(btrim(name)) > 0),
  name_key             text NOT NULL,
  brand_key            text REFERENCES catalog.brands(brand_key) DEFERRABLE INITIALLY DEFERRED,
  net_quantity         numeric(12,3) CHECK (net_quantity > 0),
  unit                 text CHECK (unit IN ('g', 'ml', 'pc')),
  quantity_text        text,
  taxonomy_node_id     text REFERENCES catalog.taxonomy_nodes(id) DEFERRABLE INITIALLY DEFERRED,
  classification_basis text CHECK (classification_basis IN ('source_category', 'keyword', 'curated', 'manual')),
  -- Item-specific HSN only. Otherwise the category default applies (see items_enriched).
  hsn_code             varchar(8) REFERENCES catalog.hsn_codes(code) DEFERRABLE INITIALLY DEFERRED,
  country_of_origin    char(2) CHECK (country_of_origin ~ '^[A-Z]{2}$'),
  manufacturer         text,
  image_url            text,
  attributes           jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(attributes) = 'object'),
  dedupe_key           text,
  -- incomplete/ready are set by sources; verified/rejected only by people, and sources
  -- never change an item in those states.
  status               text NOT NULL CHECK (status IN ('incomplete', 'ready', 'verified', 'rejected')),
  quality_score        smallint NOT NULL CHECK (quality_score BETWEEN 0 AND 100),
  primary_source       text NOT NULL,
  ${TRACKING},
  CONSTRAINT items_gtin_id CHECK ((gtin IS NULL) = (id NOT LIKE 'gtin:%') AND (gtin IS NULL OR id = 'gtin:' || gtin)),
  CONSTRAINT items_quantity_pair CHECK ((net_quantity IS NULL) = (unit IS NULL))
);
CREATE INDEX items_name_trgm ON catalog.items USING gin (name gin_trgm_ops);
CREATE INDEX items_taxonomy_idx ON catalog.items (taxonomy_node_id);
CREATE INDEX items_brand_idx ON catalog.items (brand_key);
CREATE UNIQUE INDEX items_dedupe_key_uniq ON catalog.items (dedupe_key)
  WHERE gtin IS NULL AND dedupe_key IS NOT NULL;

-- Provenance: every source record that contributed to an item.
CREATE TABLE catalog.item_sources (
  source             text NOT NULL,
  source_id          text NOT NULL,
  item_id            text NOT NULL REFERENCES catalog.items(id) DEFERRABLE INITIALLY DEFERRED,
  license            text NOT NULL,
  source_url         text,
  source_modified_at timestamptz,
  raw                jsonb NOT NULL DEFAULT '{}'::jsonb,
  ${TRACKING},
  PRIMARY KEY (source, source_id)
);
CREATE INDEX item_sources_item_idx ON catalog.item_sources (item_id);

-- Nearest active default HSN walking up the taxonomy from a node.
CREATE FUNCTION catalog.default_hsn(p_node text)
RETURNS TABLE (node_id text, hsn_code varchar, confidence text)
LANGUAGE sql STABLE AS $fn$
  WITH RECURSIVE up AS (
    SELECT id, parent_id, 0 AS depth FROM catalog.taxonomy_nodes WHERE id = p_node
    UNION ALL
    SELECT n.id, n.parent_id, up.depth + 1 FROM catalog.taxonomy_nodes n JOIN up ON n.id = up.parent_id
  )
  SELECT d.node_id, d.hsn_code, d.confidence
  FROM up JOIN catalog.taxonomy_hsn_defaults d ON d.node_id = up.id AND d.is_active
  ORDER BY up.depth LIMIT 1
$fn$;

-- What consumers read: item + brand + category + effective HSN + suggested GST rate.
-- HSN/rates are computed, not copied, so fixing a default or a rate fixes every item.
CREATE VIEW catalog.items_enriched AS
SELECT i.*,
       b.name                                  AS brand_name,
       n.full_path                             AS category_path,
       coalesce(i.hsn_code, dh.hsn_code)       AS effective_hsn,
       CASE WHEN i.hsn_code IS NOT NULL THEN 'item'
            WHEN dh.hsn_code IS NOT NULL THEN 'category_' || dh.confidence END AS hsn_basis,
       r.igst_rate                             AS gst_rate,
       r.verified                              AS gst_rate_verified
FROM catalog.items i
LEFT JOIN catalog.brands b ON b.brand_key = i.brand_key
LEFT JOIN catalog.taxonomy_nodes n ON n.id = i.taxonomy_node_id
LEFT JOIN LATERAL catalog.default_hsn(i.taxonomy_node_id) dh ON i.hsn_code IS NULL
LEFT JOIN LATERAL catalog.gst_rate(coalesce(i.hsn_code, dh.hsn_code)) r ON true;
`,
  },
  {
    version: 4,
    name: 'attributes: definitions, per-shop-type attribute sets, item families and variants',
    get sql() {
      return `
-- Every attribute the catalogue knows, defined once (seeds/attributes, source attribute-sets).
CREATE TABLE catalog.attribute_definitions (
  key            text PRIMARY KEY CHECK (key ~ '^[a-z][a-z0-9_]{0,39}$'),
  label          text NOT NULL CHECK (length(btrim(label)) > 0),
  type           text NOT NULL CHECK (type IN ('text', 'textarea', 'number', 'boolean', 'date', 'enum', 'multi_enum', 'measure')),
  unit_family    text CHECK (unit_family IN ('mass', 'volume', 'length', 'area', 'power', 'energy', 'data', 'duration', 'count', 'temperature', 'currency', 'percent')),
  default_unit   text,
  "values"       jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof("values") = 'array'),
  open_values    boolean NOT NULL DEFAULT false,
  description    text,
  shopify_handle text,
  ondc_attribute text,
  sources        jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(sources) = 'array'),
  source         text NOT NULL,
  ${TRACKING},
  CONSTRAINT attribute_measure_unit CHECK ((type = 'measure') = (unit_family IS NOT NULL)),
  CONSTRAINT attribute_enum_values CHECK (type NOT IN ('enum', 'multi_enum') OR jsonb_array_length("values") > 0 OR open_values)
);

-- What a kind of shop (shop_type node = app sub-category) records about what it sells.
CREATE TABLE catalog.attribute_sets (
  node_id       text NOT NULL REFERENCES catalog.taxonomy_nodes(id) DEFERRABLE INITIALLY DEFERRED,
  attribute_key text NOT NULL REFERENCES catalog.attribute_definitions(key) DEFERRABLE INITIALLY DEFERRED,
  level         text NOT NULL CHECK (level IN ('statutory', 'required', 'recommended', 'optional')),
  owner         text NOT NULL CHECK (owner IN ('catalog', 'store')),
  per_variant   boolean NOT NULL DEFAULT false,
  filterable    boolean NOT NULL DEFAULT false,
  axis_order    smallint CHECK (axis_order BETWEEN 1 AND 5),
  in_basic_form boolean NOT NULL DEFAULT false,
  sort_order    integer NOT NULL DEFAULT 0,
  note          text,
  source        text NOT NULL,
  ${TRACKING},
  PRIMARY KEY (node_id, attribute_key),
  -- A variant axis always differs per SKU
  CONSTRAINT attribute_set_axis_per_variant CHECK (axis_order IS NULL OR per_variant)
);
CREATE INDEX attribute_sets_attribute_idx ON catalog.attribute_sets (attribute_key);
-- One axis per position is guaranteed by the attribute-sets transform (positions come from
-- an ordered list). Not a unique index: a reload that swaps two axes would collide mid-upsert.

-- A product sold in several variants (sizes, colours, pack sizes…). Each SKU is one item.
CREATE TABLE catalog.item_families (
  id               text PRIMARY KEY CHECK (id ~ '^fam:[0-9a-f]{20}$'),
  name             text NOT NULL CHECK (length(btrim(name)) > 0),
  brand_key        text REFERENCES catalog.brands(brand_key) DEFERRABLE INITIALLY DEFERRED,
  taxonomy_node_id text REFERENCES catalog.taxonomy_nodes(id) DEFERRABLE INITIALLY DEFERRED,
  variant_axes     jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(variant_axes) = 'array'),
  attributes       jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(attributes) = 'object'),
  source           text NOT NULL,
  ${TRACKING}
);
CREATE INDEX item_families_name_trgm ON catalog.item_families USING gin (name gin_trgm_ops);

ALTER TABLE catalog.items
  ADD COLUMN family_id      text REFERENCES catalog.item_families(id) DEFERRABLE INITIALLY DEFERRED,
  ADD COLUMN variant_values jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(variant_values) = 'object'),
  ADD CONSTRAINT items_variant_needs_family CHECK (family_id IS NOT NULL OR variant_values = '{}'::jsonb);
CREATE INDEX items_family_idx ON catalog.items (family_id);
CREATE UNIQUE INDEX items_family_variant_uniq ON catalog.items (family_id, variant_values)
  WHERE family_id IS NOT NULL;

-- i.* was expanded when the view was created: rebuild it so it carries the new columns.
DROP VIEW catalog.items_enriched;
${MIGRATIONS[2].sql.slice(MIGRATIONS[2].sql.indexOf('CREATE VIEW catalog.items_enriched'))}
`;
    },
  },
];

const REQUIRED_EXTENSIONS = ['btree_gist', 'pg_trgm', 'unaccent'];

async function ensureExtensions(client) {
  for (const ext of REQUIRED_EXTENSIONS) {
    const { rowCount } = await client.query(
      'SELECT 1 FROM pg_extension WHERE extname = $1',
      [ext]
    );
    if (rowCount) continue;
    try {
      // Installed into `catalog` so the pipeline adds nothing to `public`.
      await client.query(`CREATE EXTENSION ${ext} WITH SCHEMA catalog`);
    } catch (err) {
      throw new Error(
        `Extension "${ext}" is missing and could not be created (${err.message}). ` +
          `Ask a superuser to run: CREATE EXTENSION ${ext};`
      );
    }
  }
}

async function migrate(client, { log = console.log } = {}) {
  await client.query('CREATE SCHEMA IF NOT EXISTS catalog');
  await client.query(
    "COMMENT ON SCHEMA catalog IS 'Rquest master catalog. Managed only by the catalog/ pipeline.'"
  );
  await ensureExtensions(client);
  await client.query(`
    CREATE TABLE IF NOT EXISTS catalog.schema_migrations (
      version    integer PRIMARY KEY,
      name       text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
  const { rows } = await client.query(
    'SELECT version FROM catalog.schema_migrations'
  );
  const applied = new Set(rows.map((r) => r.version));
  let count = 0;
  for (const m of MIGRATIONS) {
    if (applied.has(m.version)) continue;
    await client.query('BEGIN');
    try {
      await client.query(m.sql);
      await client.query(
        'INSERT INTO catalog.schema_migrations (version, name) VALUES ($1, $2)',
        [m.version, m.name]
      );
      await client.query('COMMIT');
      log(`  applied migration ${m.version}: ${m.name}`);
      count += 1;
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${m.version} failed: ${err.message}`);
    }
  }
  return count;
}

const latestVersion = () => MIGRATIONS[MIGRATIONS.length - 1].version;

async function assertMigrated(client) {
  const { rows } = await client.query(
    "SELECT to_regclass('catalog.schema_migrations') IS NOT NULL AS ok"
  );
  let current = 0;
  if (rows[0].ok) {
    const res = await client.query(
      'SELECT coalesce(max(version), 0) AS v FROM catalog.schema_migrations'
    );
    current = Number(res.rows[0].v);
  }
  if (current < latestVersion()) {
    throw new Error(
      `catalog schema is at version ${current}, need ${latestVersion()}. Run: npm run migrate`
    );
  }
}

module.exports = { MIGRATIONS, migrate, assertMigrated, latestVersion };
