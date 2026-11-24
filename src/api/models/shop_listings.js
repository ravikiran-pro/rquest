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
      // The sub-category whose form the listing follows (one of the shop's at write time)
      sub_category_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'sub_categories', key: 'id' },
      },
      section_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'shop_sections', key: 'id' },
      },
      // Catalogue copy: the master item id (no FK; catalog.* is optional) and its facts at import
      catalog_item_id: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      catalog_snapshot: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      catalog_synced_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      // Stock (services/stock.js): tracked | toggle | always. is_available is derived for
      // tracked (qty > 0) and always (true), and the owner's switch for toggle.
      stock_mode: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'toggle',
        validate: { isIn: [['tracked', 'toggle', 'always']] },
      },
      stock_qty: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      low_stock_threshold: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      // Ordered axis keys of the listing's variants (listing_variants); [] = a simple listing.
      // With variants, price / mrp / is_available / stock_qty are kept from the variants.
      variant_axes: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
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
    if (models.shop_sections) {
      ShopListing.belongsTo(models.shop_sections, { foreignKey: 'section_id', as: 'section' });
    }
    if (models.listing_variants) {
      ShopListing.hasMany(models.listing_variants, { foreignKey: 'listing_id', as: 'variants' });
    }
    if (models.products) {
      ShopListing.belongsTo(models.products, {
        foreignKey: 'master_product_id',
        as: 'masterProduct',
      });
    }
  };

  return ShopListing;
};

