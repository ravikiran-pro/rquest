const { DataTypes } = require('sequelize');

/**
 * Storefront sections of a shop. One auto section per shop sub-category (is_auto), plus the
 * owner's manual sections. name_key is lower(trim(collapse-spaces(name))), unique per shop.
 * Listings point here through shop_listings.section_id.
 */
module.exports = (sequelize) => {
  const ShopSection = sequelize.define(
    'shop_sections',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      shop_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'shops', key: 'id' },
      },
      name: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      name_key: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      sub_category_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'sub_categories', key: 'id' },
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_auto: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_hidden: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: 'shop_sections',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  ShopSection.associate = (models) => {
    ShopSection.belongsTo(models.shops, { foreignKey: 'shop_id', as: 'shop' });
    ShopSection.belongsTo(models.sub_categories, { foreignKey: 'sub_category_id', as: 'subCategory' });
    ShopSection.hasMany(models.shop_listings, { foreignKey: 'section_id', as: 'listings' });
  };

  return ShopSection;
};
