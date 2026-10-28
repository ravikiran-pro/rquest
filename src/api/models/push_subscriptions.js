const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PushSubscription = sequelize.define('push_subscriptions', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    endpoint: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    p256dh: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    auth: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'push_subscriptions',
    timestamps: true,
    underscored: true,
  });

  PushSubscription.associate = (models) => {
    if (models.users) {
      PushSubscription.belongsTo(models.users, {
        foreignKey: 'user_id',
        as: 'user',
      });
    }
  };

  return PushSubscription;
};

