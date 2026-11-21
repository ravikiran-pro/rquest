'use strict';

/**
 * Category layer: 8 universal categories → ~120 sub-categories, each with its own form.
 *
 *  1. Adds key / description / icon / sort_order / meta to categories, and key / form_schema /
 *     form_customized / template_key / listing_type / keywords / catalog_nodes / meta /
 *     sort_order to sub_categories.
 *  2. Saves the legacy categories, sub-categories and every row that points at them in
 *     taxonomy_legacy_backup (down() restores from it).
 *  3. Loads the taxonomy from src/api/data/taxonomy.js (services/taxonomy.syncTaxonomy).
 *  4. Moves shops, master products and listing metadata onto the new sub-categories by
 *     matching their legacy sub-category, Google category (products_list), shop type and
 *     name against sub-category names, aliases and keywords.
 *  5. Deletes the legacy rows.
 *
 * Later taxonomy edits do not need a migration: change the data file and run
 * `npm run taxonomy:sync`.
 */

const { syncTaxonomy, matchSubCategory, subCategoryByKey } = require('../services/taxonomy');

const CATEGORY_COLUMNS = (Sequelize) => ({
  key: { type: Sequelize.STRING(50), allowNull: true, unique: true },
  description: { type: Sequelize.TEXT, allowNull: true },
  icon: { type: Sequelize.STRING(40), allowNull: true },
  sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
  meta: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
});

const SUB_CATEGORY_COLUMNS = (Sequelize) => ({
  key: { type: Sequelize.STRING(50), allowNull: true, unique: true },
  description: { type: Sequelize.TEXT, allowNull: true },
  form_schema: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
  form_customized: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
  template_key: { type: Sequelize.STRING(40), allowNull: true },
  listing_type: { type: Sequelize.STRING(20), allowNull: true },
  keywords: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
  catalog_nodes: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
  meta: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
  sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
});

const BACKUP_TABLE = 'taxonomy_legacy_backup';

async function addMissingColumns(queryInterface, table, columns, transaction) {
  const existing = await queryInterface.describeTable(table);
  for (const [name, spec] of Object.entries(columns)) {
    if (!existing[name]) await queryInterface.addColumn(table, name, spec, { transaction });
  }
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { sequelize } = queryInterface;
    const t = await sequelize.transaction();
    const select = (sql, replacements) =>
      sequelize.query(sql, { replacements, transaction: t, type: sequelize.QueryTypes.SELECT });
    const exec = (sql, replacements) => sequelize.query(sql, { replacements, transaction: t });
    try {
      await addMissingColumns(queryInterface, 'categories', CATEGORY_COLUMNS(Sequelize), t);
      await addMissingColumns(queryInterface, 'sub_categories', SUB_CATEGORY_COLUMNS(Sequelize), t);

      // ── 2. Snapshot everything the remap touches ──────────────────────────────────────
      const legacyCategories = await select('SELECT * FROM categories WHERE key IS NULL ORDER BY id');
      const legacySubs = await select('SELECT * FROM sub_categories WHERE key IS NULL ORDER BY id');
      const shopRows = await select(
        'SELECT id, shop_name, shop_type, products_list, category_id, sub_category_id FROM shops'
      );
      const productRows = await select('SELECT id, name, category_id, sub_category_id FROM products');
      const listingRows = await select(
        "SELECT id, metadata FROM shop_listings WHERE metadata ? 'category_id' OR metadata ? 'sub_category_id'"
      );

      await exec(`CREATE TABLE IF NOT EXISTS ${BACKUP_TABLE} (
        id serial PRIMARY KEY, entity text NOT NULL, data jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now())`);
      const backup = async (entity, rows) => {
        for (const row of rows) {
          await exec(`INSERT INTO ${BACKUP_TABLE} (entity, data) VALUES (:entity, CAST(:data AS jsonb))`, {
            entity,
            data: JSON.stringify(row),
          });
        }
      };
      await backup('category', legacyCategories);
      await backup('sub_category', legacySubs);
      await backup('shop', shopRows);
      await backup('product', productRows);
      await backup('listing', listingRows);

      // ── 3. Load the taxonomy ──────────────────────────────────────────────────────────
      const ids = await syncTaxonomy(sequelize, { transaction: t });
      const categoryIdForSub = (key) => ids.categories[subCategoryByKey(key).category];

      // ── 4. Remap ──────────────────────────────────────────────────────────────────────
      const legacyCategoryName = new Map(legacyCategories.map((c) => [c.id, c.name]));
      const legacySubName = new Map(legacySubs.map((s) => [s.id, s.name]));
      const report = [];

      for (const shop of shopRows) {
        // Most trustworthy first: the Google Maps category, the shop type the owner picked,
        // the shop name, then the legacy sub-category and category (the legacy assignments
        // came from a US directory list and are often wrong, so they only break ties).
        const match = matchSubCategory([
          shop.products_list,
          shop.shop_type,
          shop.shop_name,
          legacySubName.get(shop.sub_category_id),
          legacyCategoryName.get(shop.category_id),
        ]);
        if (!match) {
          await exec('UPDATE shops SET category_id = NULL, sub_category_id = NULL WHERE id = :id', { id: shop.id });
          report.push(`  ? ${shop.shop_name} — no match, left without a category`);
          continue;
        }
        await exec('UPDATE shops SET category_id = :c, sub_category_id = :s WHERE id = :id', {
          id: shop.id,
          c: categoryIdForSub(match.key),
          s: ids.subCategories[match.key],
        });
        report.push(`  ${shop.shop_name} → ${match.key} (from "${match.text}")`);
      }

      for (const product of productRows) {
        const match = matchSubCategory([
          legacySubName.get(product.sub_category_id),
          product.name,
          legacyCategoryName.get(product.category_id),
        ]);
        const key = match ? match.key : 'business_others';
        await exec('UPDATE products SET category_id = :c, sub_category_id = :s WHERE id = :id', {
          id: product.id,
          c: categoryIdForSub(key),
          s: ids.subCategories[key],
        });
        report.push(`  product ${product.name} → ${key}`);
      }

      for (const listing of listingRows) {
        const meta = listing.metadata || {};
        const match = matchSubCategory([
          legacySubName.get(Number(meta.sub_category_id)),
          meta.sub_category_name,
          legacyCategoryName.get(Number(meta.category_id)),
          meta.category_name,
        ]);
        const next = { ...meta };
        if (match) {
          const sub = subCategoryByKey(match.key);
          next.category_id = categoryIdForSub(match.key);
          next.sub_category_id = ids.subCategories[match.key];
          next.sub_category_name = sub.name;
          delete next.category_name;
        } else {
          delete next.category_id;
          delete next.category_name;
          delete next.sub_category_id;
          delete next.sub_category_name;
        }
        await exec('UPDATE shop_listings SET metadata = CAST(:m AS jsonb) WHERE id = :id', {
          id: listing.id,
          m: JSON.stringify(next),
        });
      }

      // ── 5. Drop the legacy rows (nothing points at them any more) ─────────────────────
      await exec('DELETE FROM sub_categories WHERE key IS NULL');
      await exec('DELETE FROM categories WHERE key IS NULL');

      await t.commit();
      console.log(
        `category layer: ${Object.keys(ids.categories).length} categories, ` +
          `${Object.keys(ids.subCategories).length} sub-categories, ` +
          `${shopRows.length} shops and ${productRows.length} products remapped\n${report.join('\n')}`
      );
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const { sequelize } = queryInterface;
    const t = await sequelize.transaction();
    const select = (sql) => sequelize.query(sql, { transaction: t, type: sequelize.QueryTypes.SELECT });
    const exec = (sql, replacements) => sequelize.query(sql, { replacements, transaction: t });
    try {
      const rows = await select(`SELECT entity, data FROM ${BACKUP_TABLE} ORDER BY id`);
      const of = (entity) => rows.filter((r) => r.entity === entity).map((r) => r.data);

      await exec('UPDATE shops SET category_id = NULL, sub_category_id = NULL');
      await exec('UPDATE products SET category_id = NULL, sub_category_id = NULL');
      await exec('DELETE FROM sub_categories');
      await exec('DELETE FROM categories');

      for (const c of of('category')) {
        await exec(
          `INSERT INTO categories (id, name, img_url, is_active, form_schema, "createdAt", "updatedAt")
           VALUES (:id, :name, :img_url, :is_active, CAST(:form_schema AS jsonb), :createdAt, :updatedAt)`,
          { ...c, form_schema: JSON.stringify(c.form_schema || []) }
        );
      }
      for (const s of of('sub_category')) {
        await exec(
          `INSERT INTO sub_categories (id, category_id, name, img_url, is_active, "createdAt", "updatedAt")
           VALUES (:id, :category_id, :name, :img_url, :is_active, :createdAt, :updatedAt)`,
          s
        );
      }
      for (const s of of('shop')) {
        await exec('UPDATE shops SET category_id = :category_id, sub_category_id = :sub_category_id WHERE id = :id', s);
      }
      for (const p of of('product')) {
        await exec(
          'UPDATE products SET category_id = :category_id, sub_category_id = :sub_category_id WHERE id = :id',
          p
        );
      }
      for (const l of of('listing')) {
        await exec('UPDATE shop_listings SET metadata = CAST(:m AS jsonb) WHERE id = :id', {
          id: l.id,
          m: JSON.stringify(l.metadata),
        });
      }

      for (const name of Object.keys(SUB_CATEGORY_COLUMNS(Sequelize))) {
        await queryInterface.removeColumn('sub_categories', name, { transaction: t });
      }
      for (const name of Object.keys(CATEGORY_COLUMNS(Sequelize))) {
        await queryInterface.removeColumn('categories', name, { transaction: t });
      }
      await exec(`DROP TABLE ${BACKUP_TABLE}`);
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },
};
