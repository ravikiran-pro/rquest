const { DataTypes } = require('sequelize');

/** A shop's sub-categories, in order. Position 0 is the primary one (also shops.sub_category_id). */
module.exports = (sequelize) => {
  const ShopSubCategory = sequelize.define(
    'shop_sub_categories',
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
      sub_category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'sub_categories', key: 'id' },
      },
      position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: 'shop_sub_categories',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  ShopSubCategory.associate = (models) => {
    ShopSubCategory.belongsTo(models.shops, { foreignKey: 'shop_id', as: 'shop' });
    ShopSubCategory.belongsTo(models.sub_categories, { foreignKey: 'sub_category_id', as: 'subCategory' });
  };

  return ShopSubCategory;
};
