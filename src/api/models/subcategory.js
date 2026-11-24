var Sequelize = require('sequelize');

module.exports = (sequelize) => {
  const SubCategories = sequelize.define('sub_categories', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    category_id: {
      type: Sequelize.INTEGER,
      references: {
        model: 'categories',
        key: 'id',
      },
    },
    name: {
      type: Sequelize.STRING,
    },
    img_url: {
      type: Sequelize.STRING,
    },
    is_active:{
      type: Sequelize.BOOLEAN,
      defaultValue: true
    },
    // Permanent identifier; equals the catalog shop-type key (src/api/data/taxonomy.js)
    key: {
      type: Sequelize.STRING(50),
      unique: true,
    },
    description: {
      type: Sequelize.TEXT,
    },
    // The listing form for shops of this kind
    form_schema: {
      type: Sequelize.JSONB,
      defaultValue: [],
    },
    // True once an admin edits the form; taxonomy sync then leaves it alone
    form_customized: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    template_key: {
      type: Sequelize.STRING(40),
    },
    // product | food | service | rental: the default for new listings
    listing_type: {
      type: Sequelize.STRING(20),
    },
    keywords: {
      type: Sequelize.JSONB,
      defaultValue: [],
    },
    // catalog.taxonomy_nodes ids whose items apply to this sub-category
    catalog_nodes: {
      type: Sequelize.JSONB,
      defaultValue: [],
    },
    // { ondc: [...], osm: [...], aliases: [...], is_fallback }
    meta: {
      type: Sequelize.JSONB,
      defaultValue: {},
    },
    sort_order: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    // Ordered attribute keys listings of this kind may vary by (the taxonomy sync fills it)
    variant_axes: {
      type: Sequelize.JSONB,
      defaultValue: [],
    },
  });

  SubCategories.associate = (models) => {
    SubCategories.belongsTo(models.categories, {
      foreignKey: 'category_id',
      as: 'categories',
    });
    SubCategories.hasMany(models.products, {
      foreignKey: 'sub_category_id',
      as: 'sub_categories_products',
      onDelete: 'CASCADE'
    });
  };

  return SubCategories;
};
