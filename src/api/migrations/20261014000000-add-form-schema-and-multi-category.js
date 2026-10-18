'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add form_schema to categories if not exists
    const categoryTable = await queryInterface.describeTable('categories');
    if (!categoryTable.form_schema) {
      await queryInterface.addColumn('categories', 'form_schema', {
        type: Sequelize.JSONB,
        defaultValue: [],
        allowNull: true,
      });
    }

    // 2. Add allow_multi_category and form_schema to shops if not exists
    const shopTable = await queryInterface.describeTable('shops');
    if (!shopTable.allow_multi_category) {
      await queryInterface.addColumn('shops', 'allow_multi_category', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      });
    }
    if (!shopTable.form_schema) {
      await queryInterface.addColumn('shops', 'form_schema', {
        type: Sequelize.JSONB,
        defaultValue: [],
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    const categoryTable = await queryInterface.describeTable('categories');
    if (categoryTable.form_schema) {
      await queryInterface.removeColumn('categories', 'form_schema');
    }

    const shopTable = await queryInterface.describeTable('shops');
    if (shopTable.form_schema) {
      await queryInterface.removeColumn('shops', 'form_schema');
    }
    if (shopTable.allow_multi_category) {
      await queryInterface.removeColumn('shops', 'allow_multi_category');
    }
  },
};
