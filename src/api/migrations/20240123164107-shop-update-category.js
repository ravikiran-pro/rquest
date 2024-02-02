'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('shops', 'category_id', {
      type: Sequelize.INTEGER,
      references: {
        model: 'categories',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('shops', 'sub_category_id', {
      type: Sequelize.INTEGER,
      references: {
        model: 'sub_categories',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('shops', 'img_url', {
      type: Sequelize.TEXT,
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('shops', 'category_id');
    await queryInterface.removeColumn('shops', 'sub_category_id');
    await queryInterface.removeColumn('shops', 'img_url');
  },
};
