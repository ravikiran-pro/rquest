const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Notification = sequelize.define('notifications', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      defaultValue: 'general', // 'account_register', 'order_placed', 'order_status_change', 'general'
    },
    data: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
  });

  Notification.associate = (models) => {
    if (models.users) {
      Notification.belongsTo(models.users, {
        foreignKey: 'user_id',
        as: 'user',
      });
    }
  };

  return Notification;
};

