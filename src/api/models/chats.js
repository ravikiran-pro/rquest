const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Chats = sequelize.define('chats', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sender_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    receiver_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    shop_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'shops',
        key: 'id',
      },
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  });

  Chats.associate = (models) => {
    Chats.belongsTo(models.users, { foreignKey: 'sender_id', as: 'sender' });
    Chats.belongsTo(models.users, {
      foreignKey: 'receiver_id',
      as: 'receiver',
    });
  };

  return Chats;
};
