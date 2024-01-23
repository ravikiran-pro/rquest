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
  });

  SubCategories.associate = (models) => {
    SubCategories.belongsTo(models.categories, {
      foreignKey: 'category_id',
      as: 'categories',
    });
  };

  return SubCategories;
};
