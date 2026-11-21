'use strict';

/**
 * Several sub-categories per shop, a per-shop cap, catalogue item links, and starter cleanup.
 *
 *  1. shop_sub_categories (shop_id, sub_category_id, position): a shop's ordered sub-categories.
 *     Backfilled from shops.sub_category_id (position 0). shops.sub_category_id stays and is
 *     always the primary (position 0) one.
 *  2. shops.max_sub_categories: the cap on how many a shop may have (default 5).
 *  3. Starter listings: the onboarding flow seeded sample items (src/screens/client_register)
 *     but never stored a marker for them, so they are matched by the starter names the client
 *     shipped with, on listings that are not catalogue copies. Matches go to
 *     starter_listings_backup (full rows) and are deleted, except those an order still points
 *     at. down() restores them and drops the backup.
 *  4. catalog_item_sub_categories (catalog_item_id, sub_category_id, source): which catalogue
 *     items browse under which sub-category. Backfilled with the rule catalog/search uses
 *     (catalog_nodes and their descendants, plus attributes.shop_type = sub-category key) when
 *     the catalog schema exists. When it does not yet, the table is created empty and the
 *     foreign key is skipped; the catalogue must then be linked with the same rule.
 */

// The starter names shipped in src/screens/client_register/index.jsx (STARTERS), frozen here.
const STARTER_NAMES = [
  'Chakki Atta Flour (5kg)',
  'Refined Sunflower Oil (1L)',
  'Basmati Rice (1kg)',
  'Chicken Dum Biryani (Full)',
  'Paneer Butter Masala',
  'Fresh Mint Lime Juice',
  'Paracetamol 500mg (Strip of 10)',
  'Digital Thermometer',
  'First Aid Antiseptic Liquid (100ml)',
  'Doorstep Inspection & Safety Check',
  'Tap / Pipe Leak Repair',
  'Doorstep Inspection & Diagnosis',
  'AC Filter Cleaning & Gas Check',
  'Men’s Haircut & Styling',
  'Beard Trim & Shave',
  'Herbal Glow Facial (45 min)',
  'Eyebrow Threading',
  'Cotton Round-Neck T-Shirt',
  'Classic Leather Wallet',
];

const BACKUP_TABLE = 'starter_listings_backup';

module.exports = {
  up: async (queryInterface) => {
    const { sequelize } = queryInterface;
    const t = await sequelize.transaction();
    const exec = (sql, replacements) => sequelize.query(sql, { replacements, transaction: t });
    const count = async (sql, replacements) => {
      const [row] = await sequelize.query(sql, { replacements, transaction: t, type: sequelize.QueryTypes.SELECT });
      return Number(row.n);
    };
    try {
      // ── 1 + 2. Shop sub-categories and the cap ───────────────────────────────────────
      await exec(`CREATE TABLE shop_sub_categories (
        id SERIAL PRIMARY KEY,
        shop_id UUID NOT NULL REFERENCES shops(id) ON UPDATE CASCADE ON DELETE CASCADE,
        sub_category_id INTEGER NOT NULL REFERENCES sub_categories(id) ON UPDATE CASCADE ON DELETE CASCADE,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT shop_sub_categories_shop_sub_unique UNIQUE (shop_id, sub_category_id)
      )`);
      await exec('CREATE INDEX shop_sub_categories_sub_category_idx ON shop_sub_categories (sub_category_id)');
      await exec(`INSERT INTO shop_sub_categories (shop_id, sub_category_id, position)
                  SELECT id, sub_category_id, 0 FROM shops WHERE sub_category_id IS NOT NULL`);
      await exec('ALTER TABLE shops ADD COLUMN max_sub_categories INTEGER NOT NULL DEFAULT 5');

      // ── 3. Starter listings ──────────────────────────────────────────────────────────
      const starterWhere = `name IN (:starterNames)
        AND master_product_id IS NULL
        AND NOT (COALESCE(metadata, '{}'::jsonb) ? 'catalog_item_id')`;
      const hasOrderItems = await count(
        "SELECT (to_regclass('order_items') IS NOT NULL)::int AS n",
        {}
      );
      const orderGuard = hasOrderItems
        ? 'AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.listing_id = shop_listings.id)'
        : '';
      await exec(
        `CREATE TABLE ${BACKUP_TABLE} AS SELECT * FROM shop_listings WHERE ${starterWhere} ${orderGuard}`,
        { starterNames: STARTER_NAMES }
      );
      await exec(`DELETE FROM shop_listings WHERE id IN (SELECT id FROM ${BACKUP_TABLE})`);
      const removed = await count(`SELECT count(*)::int AS n FROM ${BACKUP_TABLE}`, {});
      console.log(`starter cleanup: ${removed} starter listings moved to ${BACKUP_TABLE}`);

      // ── 4. Catalogue item ↔ sub-category links ──────────────────────────────────────
      await exec(`CREATE TABLE catalog_item_sub_categories (
        id SERIAL PRIMARY KEY,
        catalog_item_id TEXT NOT NULL,
        sub_category_id INTEGER NOT NULL REFERENCES sub_categories(id) ON UPDATE CASCADE ON DELETE CASCADE,
        source TEXT NOT NULL DEFAULT 'rule',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT catalog_item_sub_categories_pair_unique UNIQUE (catalog_item_id, sub_category_id)
      )`);
      await exec('CREATE INDEX catalog_item_sub_categories_sub_category_idx ON catalog_item_sub_categories (sub_category_id)');

      const catalogPresent = await count("SELECT (to_regclass('catalog.items') IS NOT NULL)::int AS n", {});
      if (catalogPresent) {
        await exec(`ALTER TABLE catalog_item_sub_categories ADD CONSTRAINT catalog_item_sub_categories_item_fk
          FOREIGN KEY (catalog_item_id) REFERENCES catalog.items(id) ON UPDATE CASCADE ON DELETE CASCADE`);
        // Same rule as catalog/routes items.js subCategoryCondition(): a node of the
        // sub-category or any of its descendants, or a service tagged with its key.
        await exec(`
          INSERT INTO catalog_item_sub_categories (catalog_item_id, sub_category_id, source)
          WITH RECURSIVE tree(sub_id, node_id) AS (
            SELECT s.id, r.node
              FROM sub_categories s
              CROSS JOIN LATERAL jsonb_array_elements_text(
                CASE WHEN jsonb_typeof(s.catalog_nodes) = 'array' THEN s.catalog_nodes ELSE '[]'::jsonb END
              ) AS r(node)
             WHERE r.node LIKE '%:%'
            UNION
            SELECT t.sub_id, n.id FROM tree t JOIN catalog.taxonomy_nodes n ON n.parent_id = t.node_id
          )
          SELECT DISTINCT i.id, t.sub_id, 'rule' FROM tree t JOIN catalog.items i ON i.taxonomy_node_id = t.node_id
          UNION
          SELECT DISTINCT i.id, s.id, 'rule' FROM sub_categories s
            JOIN catalog.items i ON i.attributes->>'shop_type' = s.key
           WHERE s.key IS NOT NULL
          ON CONFLICT (catalog_item_id, sub_category_id) DO NOTHING`);
      }
      const linked = await count('SELECT count(*)::int AS n FROM catalog_item_sub_categories', {});
      console.log(`catalog links: ${linked} item/sub-category rows (catalog schema ${catalogPresent ? 'found' : 'not found yet'})`);

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  down: async (queryInterface) => {
    const { sequelize } = queryInterface;
    const t = await sequelize.transaction();
    const exec = (sql, replacements) => sequelize.query(sql, { replacements, transaction: t });
    try {
      await exec('DROP TABLE IF EXISTS catalog_item_sub_categories');

      // Restore the starter listings first (no shop_sub_categories dependency either way)
      const backupColumns = Object.keys(await queryInterface.describeTable(BACKUP_TABLE));
      const cols = backupColumns.map((c) => `"${c.replace(/"/g, '""')}"`).join(', ');
      await exec(`INSERT INTO shop_listings (${cols}) SELECT ${cols} FROM ${BACKUP_TABLE}`);
      await exec(`DROP TABLE ${BACKUP_TABLE}`);

      await exec('ALTER TABLE shops DROP COLUMN IF EXISTS max_sub_categories');
      await exec('DROP TABLE IF EXISTS shop_sub_categories');
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },
};
