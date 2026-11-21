#!/usr/bin/env node
/**
 * Sync src/api/data/taxonomy.js into the categories / sub_categories tables.
 *
 *   npm run taxonomy:sync              # apply
 *   npm run taxonomy:sync -- --check   # validate the data file only, touch nothing
 *   npm run taxonomy:sync -- --dry-run # apply inside a transaction, then roll back
 *
 * Uses the same database settings as the API (root .env, NODE_ENV).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { validateTaxonomy, syncTaxonomy, CATEGORIES, SUB_CATEGORIES } = require('../src/api/services/taxonomy');

const args = new Set(process.argv.slice(2));

(async () => {
  const problems = validateTaxonomy();
  if (problems.length) {
    console.error(`Taxonomy data is invalid:\n  - ${problems.join('\n  - ')}`);
    process.exit(1);
  }
  console.log(`Taxonomy OK: ${CATEGORIES.length} categories, ${SUB_CATEGORIES.length} sub-categories`);
  if (args.has('--check')) return;

  const { sequelize } = require('../src/api/models');
  const t = await sequelize.transaction();
  try {
    const ids = await syncTaxonomy(sequelize, { transaction: t, log: console.log });
    if (args.has('--dry-run')) {
      await t.rollback();
      console.log('Dry run: rolled back');
    } else {
      await t.commit();
      console.log(`Synced ${Object.keys(ids.subCategories).length} sub-categories`);
    }
  } catch (err) {
    await t.rollback();
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
