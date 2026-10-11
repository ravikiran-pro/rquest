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
    User.hasMany(models.shops, { foreignKey: 'owner_id', as: 'userShops' });
    User.hasMany(models.chats, { foreignKey: 'sender_id', as: 'sentChats' });
    User.hasMany(models.chats, {
      foreignKey: 'receiver_id',
      as: 'receivedChats',
    });
    if (models.orders) {
      User.hasMany(models.orders, { foreignKey: 'customer_id', as: 'orders' });
    }
    if (models.quotes) {
      User.hasMany(models.quotes, { foreignKey: 'customer_id', as: 'quotes' });
    }
  };

  return User;
};
