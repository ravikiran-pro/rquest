const { DataTypes } = require('sequelize');

/**
 * One sellable option of a listing (catalog/attributes/DESIGN.md §4), e.g. size M in Navy.
 * Only listings with a non-empty variant_axes have rows here; price and stock then live on
 * the variants and the listing keeps denormalised copies (services/variants.js).
 */
module.exports = (sequelize) => {
  const ListingVariant = sequelize.define(
    'listing_variants',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      listing_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'shop_listings', key: 'id' },
      },
      // axis key → value; keys = the listing's variant_axes ({"size":"M","colour":"Navy"})
      option_values: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      sku: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      price: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      mrp: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      // Counted units when the listing's stock_mode is tracked, else NULL
      stock_qty: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      low_stock_threshold: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      is_available: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      // The catalogue SKU this variant copies (no FK; catalog.* is optional)
      catalog_item_id: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      img_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      timestamps: true,
    }
  );

  ListingVariant.associate = (models) => {
    ListingVariant.belongsTo(models.shop_listings, { foreignKey: 'listing_id', as: 'listing', onDelete: 'CASCADE' });
  };

  return ListingVariant;
};
