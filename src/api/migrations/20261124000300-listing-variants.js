'use strict';

/**
 * Real product variants (catalog/attributes/DESIGN.md §4).
 *
 *  1. sub_categories.variant_axes   jsonb NOT NULL DEFAULT '[]' (ordered axis keys; the
 *     taxonomy sync fills it later)
 *  2. shop_listings.variant_axes    jsonb NOT NULL DEFAULT '[]' ([] = a simple listing)
 *  3. listing_variants              one row per sellable option of a listing; unique
 *     (listing_id, option_values); cascades with the listing
 *  4. order_items.variant_id        → listing_variants(id) ON DELETE SET NULL, and
 *     order_items.variant_label     the label snapshot ("M / Navy")
 *
 * Every step checks what exists first (describeTable / IF NOT EXISTS), so running it again
 * changes nothing. down() drops what it added.
 */

const VARIANT_CONSTRAINTS = [
  ['listing_variants_price_chk', 'price > 0'],
  ['listing_variants_mrp_chk', 'mrp IS NULL OR mrp >= 0'],
  ['listing_variants_stock_qty_chk', 'stock_qty IS NULL OR stock_qty >= 0'],
  ['listing_variants_low_stock_chk', 'low_stock_threshold IS NULL OR low_stock_threshold >= 0'],
  ['listing_variants_options_chk', "jsonb_typeof(option_values) = 'object'"],
];

const tableExists = async (queryInterface, name, transaction) => {
  const [row] = await queryInterface.sequelize.query('SELECT to_regclass(:name) IS NOT NULL AS ok', {
    replacements: { name },
    transaction,
    type: queryInterface.sequelize.QueryTypes.SELECT,
  });
  return Boolean(row && row.ok);
};

const columnsOf = async (queryInterface, table, transaction) => {
  try {
    return await queryInterface.describeTable(table, { transaction });
  } catch (err) {
    return null;
  }
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { sequelize } = queryInterface;
    const t = await sequelize.transaction();
    const exec = (sql, replacements) => sequelize.query(sql, { replacements, transaction: t });
    try {
      // ── 1. sub_categories.variant_axes ─────────────────────────────────────────────
      const subCols = await columnsOf(queryInterface, 'sub_categories', t);
      if (subCols && !subCols.variant_axes) {
        await queryInterface.addColumn(
          'sub_categories',
          'variant_axes',
          { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
          { transaction: t }
        );
      }

      // ── 2. shop_listings.variant_axes ──────────────────────────────────────────────
      const listingCols = await columnsOf(queryInterface, 'shop_listings', t);
      if (listingCols && !listingCols.variant_axes) {
        await queryInterface.addColumn(
          'shop_listings',
          'variant_axes',
          { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
          { transaction: t }
        );
      }

      // ── 3. listing_variants ────────────────────────────────────────────────────────
      if (!(await tableExists(queryInterface, 'listing_variants', t))) {
        await exec(`CREATE TABLE listing_variants (
          id UUID PRIMARY KEY,
          listing_id UUID NOT NULL REFERENCES shop_listings(id) ON UPDATE CASCADE ON DELETE CASCADE,
          option_values JSONB NOT NULL DEFAULT '{}'::jsonb,
          sku TEXT,
          price DOUBLE PRECISION NOT NULL,
          mrp DOUBLE PRECISION,
          stock_qty INTEGER,
          low_stock_threshold INTEGER,
          is_available BOOLEAN NOT NULL DEFAULT true,
          catalog_item_id TEXT,
          img_url TEXT,
          position INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
        )`);
      }
      await exec(
        'CREATE UNIQUE INDEX IF NOT EXISTS listing_variants_listing_options_uidx ON listing_variants (listing_id, option_values)'
      );
      await exec('CREATE INDEX IF NOT EXISTS listing_variants_listing_pos_idx ON listing_variants (listing_id, position)');
      for (const [name, check] of VARIANT_CONSTRAINTS) {
        const [found] = await sequelize.query('SELECT count(*)::int AS n FROM pg_constraint WHERE conname = :name', {
          replacements: { name },
          transaction: t,
          type: sequelize.QueryTypes.SELECT,
        });
        if (found.n) continue;
        await exec(`ALTER TABLE listing_variants ADD CONSTRAINT ${name} CHECK (${check})`);
      }

      // ── 4. order_items.variant_id / variant_label ──────────────────────────────────
      const itemCols = await columnsOf(queryInterface, 'order_items', t);
      if (itemCols) {
        if (!itemCols.variant_id) {
          await queryInterface.addColumn(
            'order_items',
            'variant_id',
            {
              type: Sequelize.UUID,
              allowNull: true,
              references: { model: 'listing_variants', key: 'id' },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            { transaction: t }
          );
        }
        if (!itemCols.variant_label) {
          await queryInterface.addColumn('order_items', 'variant_label', { type: Sequelize.TEXT, allowNull: true }, { transaction: t });
        }
        await exec('CREATE INDEX IF NOT EXISTS order_items_variant_idx ON order_items (variant_id) WHERE variant_id IS NOT NULL');
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
      await exec('DROP INDEX IF EXISTS order_items_variant_idx');
      await exec(`DO $$ BEGIN
        IF to_regclass('order_items') IS NOT NULL THEN
          ALTER TABLE order_items DROP COLUMN IF EXISTS variant_id;
          ALTER TABLE order_items DROP COLUMN IF EXISTS variant_label;
        END IF;
      END $$`);
      await exec('DROP TABLE IF EXISTS listing_variants');
      await exec('ALTER TABLE shop_listings DROP COLUMN IF EXISTS variant_axes');
      // sub_categories.variant_axes is shared with the taxonomy sync (DESIGN.md §2); it is
      // dropped here only because this migration added it
      await exec('ALTER TABLE sub_categories DROP COLUMN IF EXISTS variant_axes');
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },
};
