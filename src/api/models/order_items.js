const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrderItem = sequelize.define(
    'order_items',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      order_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id',
        },
      },
      listing_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'shop_listings',
          key: 'id',
        },
      },
      item_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      unit_price: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      subtotal: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
    },
    {
      timestamps: true,
    }
  );

  OrderItem.associate = (models) => {
    OrderItem.belongsTo(models.orders, {
      foreignKey: 'order_id',
      as: 'order',
    });
    if (models.shop_listings) {
      OrderItem.belongsTo(models.shop_listings, {
        foreignKey: 'listing_id',
        as: 'listing',
      });
    }
  };

  return OrderItem;
};

