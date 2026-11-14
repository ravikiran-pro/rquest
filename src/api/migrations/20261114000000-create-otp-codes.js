'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    const exists = tables
      .map((t) => (typeof t === 'string' ? t : t.tableName))
      .includes('otp_codes');
    if (exists) return;

    await queryInterface.createTable('otp_codes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      identifier: { type: Sequelize.STRING, allowNull: false },
      channel: { type: Sequelize.STRING, allowNull: false },
      purpose: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'login',
      },
      code_hash: { type: Sequelize.STRING, allowNull: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      consumed_at: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('otp_codes', ['identifier', 'purpose']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('otp_codes');
  },
};
