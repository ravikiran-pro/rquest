'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      'chats',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.fn('uuid_generate_v4'),
          primaryKey: true,
        },
        sender_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
        },
        receiver_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
        },
        shop_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'shops',
            key: 'id',
          },
        },
        message: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        is_read: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
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
