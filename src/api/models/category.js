var Sequelize = require('sequelize');

module.exports = (sequelize) => {
  const Categories = sequelize.define('categories', {
    id: {
      type: Sequelize.INTEGER,
      defaultValue: Sequelize.INTEGER,
      primaryKey: true,
    },
    name: {
      type: Sequelize.STRING,
    },
    img_url: {
      type: Sequelize.STRING,
    },
  });

  Categories.associate = (models) => {
    Categories.hasMany(models.sub_categories, {
      foreignKey: 'category_id',
      as: 'sub_categories',
    });
  };

  return Categories;
};
