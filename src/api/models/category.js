var Sequelize = require('sequelize');

module.exports = (sequelize) => {
  const Categories = sequelize.define('categories', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
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
    // Fallback form for listings whose sub-category has none
    form_schema: {
      type: Sequelize.JSONB,
      defaultValue: [],
    },
    // Permanent identifier from src/api/data/taxonomy.js
    key: {
      type: Sequelize.STRING(50),
      unique: true,
    },
    description: {
      type: Sequelize.TEXT,
    },
    icon: {
      type: Sequelize.STRING(40),
    },
    sort_order: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    // { coicop: [...], ondc: [...] }
    meta: {
      type: Sequelize.JSONB,
      defaultValue: {},
    },
  });

  Categories.associate = (models) => {
    Categories.hasMany(models.sub_categories, {
      foreignKey: 'category_id',
      as: 'sub_categories',
      onDelete: 'CASCADE'
    });
    Categories.hasMany(models.products, {
      foreignKey: 'category_id',
      as: 'categories_products',
      onDelete: 'CASCADE'
    });
  };

  return Categories;
};
