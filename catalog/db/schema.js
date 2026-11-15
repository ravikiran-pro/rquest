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
