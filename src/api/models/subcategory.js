var Sequelize = require('sequelize');

module.exports = (sequelize) => {
  const SubCategories = sequelize.define('sub_categories', {
    id: {
      type: Sequelize.INTEGER,
      defaultValue: Sequelize.INTEGER,
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
    }
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
