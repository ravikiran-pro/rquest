'use strict';

/**
 * Storefront sections (docs/catalogue/03-spec.md §C4, §D2).
 *
 *  1. shop_sections (shop_id, name, name_key, sub_category_id, sort_order, is_auto, is_hidden):
 *     unique (shop_id, name_key), and one auto section per (shop, sub-category).
 *  2. shop_listings.section_id → shop_sections (ON DELETE SET NULL).
 *  3. Backfill:
 *     a. an auto section for every shop sub-category (sort_order 1000 + position);
 *     b. the merchant's existing tabs: per shop, the trimmed non-empty
 *        COALESCE(metadata.section, metadata.category) grouped by name key, named after the
 *        most common spelling, ordered by first use (0, 1, 2…) so they come before the
 *        auto sections; a tab whose name matches an auto section joins it;
 *     c. listings get the section matching their tab, else their sub-category's auto section.
 *     metadata.section is left in place (rollback); new code reads section_id only.
 *
 * name_key = lower(trim(collapse-spaces(name))), the same as services/sections.sectionNameKey.
 * Every insert is ON CONFLICT DO NOTHING and every update only fills NULLs, so a re-run is a
 * no-op. down() drops section_id and the table.
 */

// Display name cut to the column width, then its key (SQL twin of sections.fitName / sectionNameKey)
const FIT = (x) => `btrim(left(btrim(regexp_replace(${x}, '\\s+', ' ', 'g')), 60))`;
const KEY = (x) => `lower(${FIT(x)})`;
const TAB = "COALESCE(NULLIF(btrim(l.metadata->>'section'), ''), NULLIF(btrim(l.metadata->>'category'), ''))";

module.exports = {
  up: async (queryInterface) => {
    const { sequelize } = queryInterface;
    const t = await sequelize.transaction();
    const exec = (sql) => sequelize.query(sql, { transaction: t });
    const count = async (sql) => {
      const [row] = await sequelize.query(sql, { transaction: t, type: sequelize.QueryTypes.SELECT });
      return Number(row.n);
    };
    try {
      // ── 1. Table ───────────────────────────────────────────────────────────────────
      await exec(`CREATE TABLE IF NOT EXISTS shop_sections (
        id SERIAL PRIMARY KEY,
        shop_id UUID NOT NULL REFERENCES shops(id) ON UPDATE CASCADE ON DELETE CASCADE,
        name VARCHAR(60) NOT NULL,
        name_key VARCHAR(60) NOT NULL,
        sub_category_id INTEGER REFERENCES sub_categories(id) ON UPDATE CASCADE ON DELETE SET NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_auto BOOLEAN NOT NULL DEFAULT false,
        is_hidden BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT shop_sections_name_unique UNIQUE (shop_id, name_key)
      )`);
      await exec(
        'CREATE UNIQUE INDEX IF NOT EXISTS shop_sections_auto_uidx ON shop_sections (shop_id, sub_category_id) WHERE is_auto'
      );
      await exec('CREATE INDEX IF NOT EXISTS shop_sections_shop_order_idx ON shop_sections (shop_id, sort_order)');

      // ── 2. Listing column ──────────────────────────────────────────────────────────
      await exec(
        'ALTER TABLE shop_listings ADD COLUMN IF NOT EXISTS section_id INTEGER REFERENCES shop_sections(id) ON DELETE SET NULL'
      );
      await exec(
        'CREATE INDEX IF NOT EXISTS shop_listings_shop_section_idx ON shop_listings (shop_id, section_id, is_available)'
      );

      // ── 3a. Auto sections ──────────────────────────────────────────────────────────
      const before = await count('SELECT count(*)::int AS n FROM shop_sections');
      await exec(`INSERT INTO shop_sections (shop_id, name, name_key, sub_category_id, sort_order, is_auto)
        SELECT src.shop_id, ${FIT('s.name')}, ${KEY('s.name')}, s.id, 1000 + src.position, true
          FROM (
            SELECT ssc.shop_id, ssc.sub_category_id, ssc.position FROM shop_sub_categories ssc
            UNION ALL
            SELECT sh.id, sh.sub_category_id, 0 FROM shops sh
             WHERE sh.sub_category_id IS NOT NULL
               AND NOT EXISTS (SELECT 1 FROM shop_sub_categories x WHERE x.shop_id = sh.id)
          ) src
          JOIN sub_categories s ON s.id = src.sub_category_id
         WHERE ${KEY('s.name')} <> ''
         ORDER BY src.shop_id, src.position
        ON CONFLICT DO NOTHING`);
      const autoCount = (await count('SELECT count(*)::int AS n FROM shop_sections')) - before;

      // ── 3b. Existing tabs ──────────────────────────────────────────────────────────
      await exec(`INSERT INTO shop_sections (shop_id, name, name_key, sort_order, is_auto)
        SELECT g.shop_id, g.name, g.name_key,
               (row_number() OVER (PARTITION BY g.shop_id ORDER BY g.first_used, g.name_key) - 1)::int,
               false
          FROM (
            SELECT l.shop_id, ${KEY(TAB)} AS name_key,
                   mode() WITHIN GROUP (ORDER BY ${FIT(TAB)}) AS name,
                   min(l."createdAt") AS first_used
              FROM shop_listings l
             WHERE ${TAB} IS NOT NULL AND ${KEY(TAB)} <> ''
             GROUP BY l.shop_id, ${KEY(TAB)}
          ) g
        ON CONFLICT DO NOTHING`);
      const tabCount = (await count('SELECT count(*)::int AS n FROM shop_sections')) - before - autoCount;

      // ── 3c. Listings → sections ────────────────────────────────────────────────────
      await exec(`UPDATE shop_listings l SET section_id = s.id
          FROM shop_sections s
         WHERE l.section_id IS NULL AND ${TAB} IS NOT NULL
           AND s.shop_id = l.shop_id AND s.name_key = ${KEY(TAB)}`);
      await exec(`UPDATE shop_listings l SET section_id = s.id
          FROM shop_sections s
         WHERE l.section_id IS NULL AND l.sub_category_id IS NOT NULL
           AND s.shop_id = l.shop_id AND s.is_auto AND s.sub_category_id = l.sub_category_id`);
      const placed = await count('SELECT count(*)::int AS n FROM shop_listings WHERE section_id IS NOT NULL');
      const unplaced = await count('SELECT count(*)::int AS n FROM shop_listings WHERE section_id IS NULL');
      console.log(
        `shop sections: ${autoCount} auto, ${tabCount} from existing tabs; listings with a section: ${placed}, without: ${unplaced}`
      );

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
      await exec('DROP INDEX IF EXISTS shop_listings_shop_section_idx');
      await exec('ALTER TABLE shop_listings DROP COLUMN IF EXISTS section_id');
      await exec('DROP TABLE IF EXISTS shop_sections');
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },
};
