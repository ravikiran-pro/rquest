// Rebuild catalog_item_sub_categories from the catalogue rule. Run after catalog:load.
// Usage: node scripts/catalog-sub-category-links.js
require('dotenv').config();
const { sequelize } = require('../src/api/models');
const { rebuildCatalogSubCategoryLinks } = require('../src/api/services/catalogSubCategoryLinks');

(async () => {
  const result = await rebuildCatalogSubCategoryLinks(sequelize);
  console.log(result.skipped ? 'catalog schema not found: nothing to link' : `linked ${result.linked} rows`);
  await sequelize.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
