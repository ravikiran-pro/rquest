'use strict';

/**
 * Categories and sub-categories come from src/api/data/taxonomy.js.
 * The 20261121000000-category-layer migration already loads them, so on a fresh database
 * this seeder only re-syncs (it is idempotent: rows are matched by key).
 */
const { syncTaxonomy } = require('../services/taxonomy');

module.exports = {
  up: async (queryInterface) => {
    await syncTaxonomy(queryInterface.sequelize);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('sub_categories', null, {});
    await queryInterface.bulkDelete('categories', null, {});
  },
};
