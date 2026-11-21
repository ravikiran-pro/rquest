'use strict';

// Platform configuration (Admin > Platform configuration): one row per setting key.
// Rows are optional: the API falls back to built-in defaults for any missing key, and the
// table is also created on first use (model sync), so this migration is safe to run late.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    const exists = tables
      .map((t) => (typeof t === 'string' ? t : t.tableName))
      .includes('platform_settings');
    if (exists) return;

    await queryInterface.createTable('platform_settings', {
      key: {
        type: Sequelize.STRING(64),
        primaryKey: true,
        allowNull: false,
      },
      value: { type: Sequelize.JSONB, allowNull: true },
      updated_by: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('platform_settings');
  },
};
