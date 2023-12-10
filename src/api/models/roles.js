const { DataTypes } = require('sequelize');
var Sequelize = require('sequelize');


module.exports = (sequelize) => {
  const Role = sequelize.define('Role', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
    },
    name: {
      type: Sequelize.STRING,
    },
    created_at: {
      type: DataTypes.TIMESTAMP,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: DataTypes.TIMESTAMP,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  return Role;
};