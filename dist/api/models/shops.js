const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const Shop = sequelize.define('shops', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    owner_id: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    shop_name: {
      type: DataTypes.STRING
    },
    address: {
      type: DataTypes.TEXT
    },
    area: {
      type: DataTypes.STRING
    },
    mobile_number: {
      type: DataTypes.STRING
    },
    website: {
      type: DataTypes.TEXT
    },
    rating: {
      type: DataTypes.FLOAT
    },
    products_list: {
      type: DataTypes.STRING
    },
    shop_type: {
      type: DataTypes.STRING
    },
    latitude: {
      type: DataTypes.DOUBLE
    },
    longitude: {
      type: DataTypes.DOUBLE
    },
    directions: {
      type: DataTypes.TEXT
    }
  }, {
    timestamps: true
  });
  return Shop;
};