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
    }
  });

  return Role;
};