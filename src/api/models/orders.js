const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Order = sequelize.define(
    'orders',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      order_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      customer_id: {
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
      order_type: {
        type: DataTypes.STRING,
        defaultValue: 'delivery', // 'delivery', 'pickup', 'service_visit'
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: 'pending', // 'pending', 'accepted', 'completed', 'cancelled'
      },
      total_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      platform_fee: {
        type: DataTypes.FLOAT,
        defaultValue: 5.0,
      },
      payment_mode: {
        type: DataTypes.STRING,
        defaultValue: 'direct_upi', // 'cod', 'direct_upi', 'cash'
      },
      delivery_address: {
        type: DataTypes.TEXT,
      },
      customer_phone: {
        type: DataTypes.STRING,
      },
      notes: {
        type: DataTypes.TEXT,
      },
      delivery_fee: {
        type: DataTypes.FLOAT,
        defaultValue: 0.0,
      },
      delivery_partner_id: {
        type: DataTypes.UUID,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      shop_upi_id: {
        type: DataTypes.STRING,
      },
      delivery_notes: {
        type: DataTypes.TEXT,
      },
    },
    {
      timestamps: true,
    }
  );

  Order.associate = (models) => {
    Order.belongsTo(models.users, {
      foreignKey: 'customer_id',
      as: 'customer',
    });
    Order.belongsTo(models.users, {
      foreignKey: 'delivery_partner_id',
      as: 'delivery_partner',
    });
    Order.belongsTo(models.shops, {
      foreignKey: 'shop_id',
      as: 'shop',
    });
    if (models.order_items) {
      Order.hasMany(models.order_items, {
        foreignKey: 'order_id',
        as: 'items',
      });
    }
  };

  return Order;
};

