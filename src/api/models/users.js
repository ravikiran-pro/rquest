const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('users', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
    },
    mobile: {
      type: DataTypes.STRING,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role_id: {
      type: DataTypes.UUID,
      references: {
        model: 'roles',
        key: 'id',
      },
    },
  });

  User.associate = (models) => {
    User.hasMany(models.chats, { foreignKey: 'sender_id', as: 'sentChats' });
    User.hasMany(models.chats, {
      foreignKey: 'receiver_id',
      as: 'receivedChats',
    });
  };

  return User;
};
