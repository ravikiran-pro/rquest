const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ShopListing = sequelize.define(
    'shop_listings',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      shop_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'shops',
          key: 'id',
        },
      },
      master_product_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'products',
          key: 'id',
        },
      },
      listing_type: {
        type: DataTypes.STRING,
        defaultValue: 'product', // 'product', 'food', 'service', 'rental'
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
      },
      price: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      mrp: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      unit: {
        type: DataTypes.STRING,
        defaultValue: 'piece', // 'kg', 'piece', 'plate', 'hour', 'visit', 'day'
      },
      is_available: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {},
      },
      img_url: {
        type: DataTypes.TEXT,
      },
    },
    {
      timestamps: true,
    }
  );

  ShopListing.associate = (models) => {
    ShopListing.belongsTo(models.shops, {
      foreignKey: 'shop_id',
      as: 'shop',
    });
    if (models.products) {
      ShopListing.belongsTo(models.products, {
        foreignKey: 'master_product_id',
        as: 'masterProduct',
      });
    }
  };

  return ShopListing;
};

