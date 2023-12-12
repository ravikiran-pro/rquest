'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      'users',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.fn('uuid_generate_v4'),
          allowNull: false,
          primaryKey: true,
        },
        username: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        role_id: {
          type: Sequelize.UUID,
          references: {
            model: 'roles',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
      },
      {
        timestamps: true,
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('users', { cascade: true });
  },
};
