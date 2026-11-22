'use strict';

/**
 * Listing stock, sub-category and catalogue-copy columns (docs/catalogue/03-spec.md §D1).
 *
 *  1. Creates shop_listings when it is missing (until now only the model created it).
 *  2. Adds sub_category_id, catalog_item_id, catalog_snapshot, catalog_synced_at, stock_mode
 *     (NOT NULL, default 'toggle'), stock_qty and low_stock_threshold.
 *  3. Backfills them: the sub-category from metadata or the shop's primary, the catalogue id
 *     from metadata.catalog_item_id, services → always, products with a numeric
 *     metadata.stock_quantity → tracked with that quantity; everything else stays toggle with
 *     its is_available unchanged. Catalogue copies get a snapshot when catalog.items_enriched
 *     exists.
 *  4. CHECK constraints on the stock columns (added NOT VALID, then validated).
 *  5. Indexes for shop-scoped paging and a unique (shop_id, catalog_item_id) for copies
 *     (non-unique, with a warning, if duplicates already exist).
 *  6. order_items.stock_deducted (what an order took, so a cancel restocks exactly once).
 *
 * Every step is guarded, so running it again changes nothing. down() drops what it added
 * (not the table).
 */

const CONSTRAINTS = [
  ['shop_listings_stock_mode_chk', "stock_mode IN ('tracked', 'toggle', 'always')"],
  ['shop_listings_stock_qty_chk', 'stock_qty IS NULL OR stock_qty >= 0'],
  ['shop_listings_tracked_qty_chk', "stock_mode <> 'tracked' OR stock_qty IS NOT NULL"],
  ['shop_listings_low_stock_chk', 'low_stock_threshold IS NULL OR low_stock_threshold >= 0'],
];

const INDEXES = [
  ['shop_listings_shop_sub_idx', 'CREATE INDEX IF NOT EXISTS shop_listings_shop_sub_idx ON shop_listings (shop_id, sub_category_id)'],
  ['shop_listings_shop_name_idx', 'CREATE INDEX IF NOT EXISTS shop_listings_shop_name_idx ON shop_listings (shop_id, lower(name))'],
  ['shop_listings_shop_avail_idx', 'CREATE INDEX IF NOT EXISTS shop_listings_shop_avail_idx ON shop_listings (shop_id, is_available)'],
];

const CATALOG_INDEX = 'shop_listings_shop_catalog_uidx';

const ADDED_COLUMNS = [
  'sub_category_id',
  'catalog_item_id',
  'catalog_snapshot',
  'catalog_synced_at',
  'stock_mode',
  'stock_qty',
  'low_stock_threshold',
];

module.exports = {
  up: async (queryInterface) => {
    const { sequelize } = queryInterface;
    const t = await sequelize.transaction();
    const exec = (sql, replacements) => sequelize.query(sql, { replacements, transaction: t });
    const one = async (sql, replacements) => {
      const [row] = await sequelize.query(sql, { replacements, transaction: t, type: sequelize.QueryTypes.SELECT });
      return row;
    };
    const exists = async (relation) => Boolean((await one('SELECT to_regclass(:r) IS NOT NULL AS ok', { r: relation })).ok);
    try {
      // ── 1. The table ────────────────────────────────────────────────────────────────
      if (!(await exists('shop_listings'))) {
        const productsFk = (await exists('products'))
          ? 'REFERENCES products(id) ON UPDATE CASCADE ON DELETE SET NULL'
          : '';
        await exec(`CREATE TABLE shop_listings (
          id UUID PRIMARY KEY,
          shop_id UUID NOT NULL REFERENCES shops(id) ON UPDATE CASCADE ON DELETE CASCADE,
          master_product_id INTEGER ${productsFk},
          listing_type VARCHAR(255) DEFAULT 'product',
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DOUBLE PRECISION NOT NULL,
          mrp DOUBLE PRECISION,
          unit VARCHAR(255) DEFAULT 'piece',
          is_available BOOLEAN DEFAULT true,
          metadata JSONB DEFAULT '{}'::jsonb,
          img_url TEXT,
          "createdAt" TIMESTAMPTZ NOT NULL,
          "updatedAt" TIMESTAMPTZ NOT NULL
        )`);
        console.log('shop_listings: created (it did not exist)');
      }

      // ── 2. Columns ─────────────────────────────────────────────────────────────────
      await exec(`ALTER TABLE shop_listings
        ADD COLUMN IF NOT EXISTS sub_category_id INTEGER REFERENCES sub_categories(id) ON UPDATE CASCADE ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS catalog_item_id TEXT,
        ADD COLUMN IF NOT EXISTS catalog_snapshot JSONB,
        ADD COLUMN IF NOT EXISTS catalog_synced_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS stock_mode VARCHAR(10) NOT NULL DEFAULT 'toggle',
        ADD COLUMN IF NOT EXISTS stock_qty INTEGER,
        ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER`);

      // ── 3. Backfill ────────────────────────────────────────────────────────────────
      await exec(`UPDATE shop_listings l SET sub_category_id = COALESCE(
          (SELECT s.id FROM sub_categories s
            WHERE (l.metadata->>'sub_category_id') ~ '^[0-9]{1,9}$'
              AND s.id = (l.metadata->>'sub_category_id')::int),
          (SELECT sh.sub_category_id FROM shops sh WHERE sh.id = l.shop_id))
        WHERE l.sub_category_id IS NULL`);
      await exec(`UPDATE shop_listings SET catalog_item_id = metadata->>'catalog_item_id'
        WHERE catalog_item_id IS NULL AND COALESCE(metadata->>'catalog_item_id', '') <> ''`);
      // Only rows still on the default are touched, so a re-run keeps later owner choices
      await exec(`UPDATE shop_listings SET stock_mode = 'always'
        WHERE listing_type = 'service' AND stock_mode = 'toggle' AND stock_qty IS NULL`);
      await exec(`UPDATE shop_listings
          SET stock_mode = 'tracked', stock_qty = (metadata->>'stock_quantity')::int,
              is_available = (metadata->>'stock_quantity')::int > 0
        WHERE COALESCE(listing_type, 'product') = 'product' AND stock_mode = 'toggle' AND stock_qty IS NULL
          AND metadata->>'stock_quantity' ~ '^[0-9]{1,9}$'`);
      await exec("UPDATE shop_listings SET is_available = true WHERE stock_mode = 'always' AND is_available IS DISTINCT FROM true");
      await exec(`UPDATE shop_listings SET low_stock_threshold = 5
        WHERE stock_mode = 'tracked' AND low_stock_threshold IS NULL`);

      if (await exists('catalog.items_enriched')) {
        const [, result] = await exec(`UPDATE shop_listings l SET
            catalog_snapshot = jsonb_build_object(
              'item_id', e.id, 'kind', e.kind, 'name', e.name, 'brand', e.brand_name,
              'manufacturer', e.manufacturer, 'gtin', e.gtin, 'net_quantity', e.net_quantity,
              'unit', e.unit, 'quantity_text', e.quantity_text,
              'hsn_code', COALESCE(e.effective_hsn, e.hsn_code), 'gst_rate', e.gst_rate,
              'country_of_origin', e.country_of_origin, 'image_url', e.image_url,
              'category_path', e.category_path, 'attributes', COALESCE(e.attributes, '{}'::jsonb),
              'captured_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
            catalog_synced_at = now()
          FROM catalog.items_enriched e
          WHERE e.id = l.catalog_item_id AND l.catalog_snapshot IS NULL`);
        console.log(`catalog snapshots: ${result?.rowCount ?? 0} listings`);
      } else {
        console.log('catalog snapshots: catalog.items_enriched not found, left empty');
      }
      const modes = await sequelize.query('SELECT stock_mode, count(*)::int AS n FROM shop_listings GROUP BY 1 ORDER BY 1', {
        transaction: t,
        type: sequelize.QueryTypes.SELECT,
      });
      console.log(`stock modes: ${modes.map((m) => `${m.stock_mode}=${m.n}`).join(', ') || 'no listings'}`);

      // ── 4. Constraints ─────────────────────────────────────────────────────────────
      for (const [name, check] of CONSTRAINTS) {
        const found = await one('SELECT count(*)::int AS n FROM pg_constraint WHERE conname = :name', { name });
        if (found.n) continue;
        await exec(`ALTER TABLE shop_listings ADD CONSTRAINT ${name} CHECK (${check}) NOT VALID`);
        await exec(`ALTER TABLE shop_listings VALIDATE CONSTRAINT ${name}`);
      }

      // ── 5. Indexes ─────────────────────────────────────────────────────────────────
      for (const [, sql] of INDEXES) await exec(sql);
      if (!(await exists(CATALOG_INDEX))) {
        const dup = await one(`SELECT count(*)::int AS n FROM (
            SELECT 1 FROM shop_listings WHERE catalog_item_id IS NOT NULL
             GROUP BY shop_id, catalog_item_id HAVING count(*) > 1) d`);
        if (dup.n) {
          console.warn(
            `shop_listings: ${dup.n} shop/catalogue-item pairs have more than one listing; ${CATALOG_INDEX} is created non-unique`
          );
          await exec(`CREATE INDEX ${CATALOG_INDEX} ON shop_listings (shop_id, catalog_item_id) WHERE catalog_item_id IS NOT NULL`);
        } else {
          await exec(
            `CREATE UNIQUE INDEX ${CATALOG_INDEX} ON shop_listings (shop_id, catalog_item_id) WHERE catalog_item_id IS NOT NULL`
          );
        }
      }

      // ── 6. order_items ─────────────────────────────────────────────────────────────
      if (await exists('order_items')) {
        await exec('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS stock_deducted INTEGER NOT NULL DEFAULT 0');
        await exec('CREATE INDEX IF NOT EXISTS order_items_listing_idx ON order_items (listing_id)');
      }

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  down: async (queryInterface) => {
    const { sequelize } = queryInterface;
    const t = await sequelize.transaction();
    const exec = (sql) => sequelize.query(sql, { transaction: t });
    try {
      await exec('DROP INDEX IF EXISTS order_items_listing_idx');
      await exec(
        "DO $$ BEGIN IF to_regclass('order_items') IS NOT NULL THEN ALTER TABLE order_items DROP COLUMN IF EXISTS stock_deducted; END IF; END $$"
      );
      await exec(`DROP INDEX IF EXISTS ${CATALOG_INDEX}`);
      for (const [name] of INDEXES) await exec(`DROP INDEX IF EXISTS ${name}`);
      for (const [name] of CONSTRAINTS) await exec(`ALTER TABLE shop_listings DROP CONSTRAINT IF EXISTS ${name}`);
      for (const column of ADDED_COLUMNS) await exec(`ALTER TABLE shop_listings DROP COLUMN IF EXISTS ${column}`);
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },
};
