'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add email to users if not exists
    const usersTable = await queryInterface.describeTable('users');
    if (!usersTable.email) {
      await queryInterface.addColumn('users', 'email', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    // 2. Add is_deleted to chats if not exists
    const chatsTable = await queryInterface.describeTable('chats');
    if (!chatsTable.is_deleted) {
      await queryInterface.addColumn('chats', 'is_deleted', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: true,
      });
    }

    // 3. Add missing columns to orders if not exists
    const ordersTable = await queryInterface.describeTable('orders');
    if (!ordersTable.delivery_fee) {
      await queryInterface.addColumn('orders', 'delivery_fee', {
        type: Sequelize.FLOAT,
        defaultValue: 0.0,
        allowNull: true,
      });
    }
    if (!ordersTable.delivery_partner_id) {
      await queryInterface.addColumn('orders', 'delivery_partner_id', {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id',
        },
        allowNull: true,
      });
    }
    if (!ordersTable.shop_upi_id) {
      await queryInterface.addColumn('orders', 'shop_upi_id', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
    if (!ordersTable.delivery_notes) {
      await queryInterface.addColumn('orders', 'delivery_notes', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    // 4. Create user_addresses table if not exists
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('user_addresses')) {
      await queryInterface.createTable('user_addresses', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.fn('gen_random_uuid'),
          primaryKey: true,
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
        },
        label: {
          type: Sequelize.STRING,
          defaultValue: 'Home',
        },
        recipient_name: {
          type: Sequelize.STRING,
        },
        recipient_phone: {
          type: Sequelize.STRING,
        },
        house_flat_floor: {
          type: Sequelize.STRING,
        },
        street_area: {
          type: Sequelize.STRING,
        },
        landmark: {
          type: Sequelize.STRING,
        },
        city: {
          type: Sequelize.STRING,
          defaultValue: 'Bengaluru',
        },
        state: {
          type: Sequelize.STRING,
        },
        pincode: {
          type: Sequelize.STRING,
        },
        formatted_address: {
          type: Sequelize.TEXT,
        },
        latitude: {
          type: Sequelize.FLOAT,
          allowNull: false,
        },
        longitude: {
          type: Sequelize.FLOAT,
          allowNull: false,
        },
        is_default: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('now'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('now'),
        },
      });
    }
  },

  down: async (queryInterface) => {
    const usersTable = await queryInterface.describeTable('users');
    if (usersTable.email) {
      await queryInterface.removeColumn('users', 'email');
    }

    const chatsTable = await queryInterface.describeTable('chats');
    if (chatsTable.is_deleted) {
      await queryInterface.removeColumn('chats', 'is_deleted');
    }

    const ordersTable = await queryInterface.describeTable('orders');
    if (ordersTable.delivery_fee) {
      await queryInterface.removeColumn('orders', 'delivery_fee');
    }
    if (ordersTable.delivery_partner_id) {
      await queryInterface.removeColumn('orders', 'delivery_partner_id');
    }
    if (ordersTable.shop_upi_id) {
      await queryInterface.removeColumn('orders', 'shop_upi_id');
    }
    if (ordersTable.delivery_notes) {
      await queryInterface.removeColumn('orders', 'delivery_notes');
    }

    const tables = await queryInterface.showAllTables();
    if (tables.includes('user_addresses')) {
      await queryInterface.dropTable('user_addresses');
    }
  },
};

