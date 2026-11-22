const { DataTypes } = require('sequelize');

/**
 * A shop's changes to one sub-category's listing form (services/formOverrides.js):
 * { fields: { <key>: { hidden, label, required, defaultValue } }, custom_fields: [...] }.
 */
module.exports = (sequelize) => {
  const ShopFormOverride = sequelize.define(
    'shop_form_overrides',
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
      overrides: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      updated_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: 'shop_form_overrides',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  ShopFormOverride.associate = (models) => {
    ShopFormOverride.belongsTo(models.shops, { foreignKey: 'shop_id', as: 'shop' });
    ShopFormOverride.belongsTo(models.sub_categories, { foreignKey: 'sub_category_id', as: 'subCategory' });
  };

  return ShopFormOverride;
};
