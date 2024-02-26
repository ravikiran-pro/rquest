var Sequelize = require('sequelize');

module.exports = (sequelize) => {
  const Products = sequelize.define('products', {
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
    category_id: {
      type: Sequelize.INTEGER,
      references: {
        model: 'categories',
        key: 'id',
      },
    },
    sub_category_id: {
      type: Sequelize.INTEGER,
      references: {
        model: 'sub_categories',
        key: 'id',
      },
    },
    img_url: {
      type: Sequelize.STRING,
    },
    description: {
      type: Sequelize.STRING,
    },
    is_active:{
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  });

  Products.associate = (models) => {
    Products.belongsTo(models.sub_categories, {
      foreignKey: 'sub_category_id',
      as: 'proucts_sub_categories',
    });
    Products.belongsTo(models.categories, {
      foreignKey: 'category_id',
      as: 'proucts_categories',
    });
  };

  return Products;
};
