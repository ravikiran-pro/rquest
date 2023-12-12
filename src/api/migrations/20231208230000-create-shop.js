'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      'shops',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.fn('uuid_generate_v4'),
          allowNull: false,
          primaryKey: true,
        },
        owner_id: {
          type: Sequelize.UUID,
          references: {
            model: 'users',
            key: 'id',
          },
        },
        shop_name: {
          type: Sequelize.STRING,
        },
        address: {
          type: Sequelize.TEXT,
        },
        area: {
          type: Sequelize.STRING,
        },
        mobile_number: {
          type: Sequelize.STRING,
        },
        website: {
          type: Sequelize.TEXT,
        },
        rating: {
          type: Sequelize.FLOAT,
        },
        products_list: {
          type: Sequelize.STRING,
        },
        shop_type: {
          type: Sequelize.STRING,
        },
        directions: {
          type: Sequelize.TEXT,
        },
        latitude: {
          type: Sequelize.DOUBLE,
        },
        longitude: {
          type: Sequelize.DOUBLE,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      },
      {
        timestamps: true,
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('shops');
  },
};
