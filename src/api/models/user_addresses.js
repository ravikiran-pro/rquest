const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserAddress = sequelize.define(
    'user_addresses',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      label: {
        type: DataTypes.STRING,
        defaultValue: 'Home', // 'Home', 'Work', 'Other', etc.
      },
      recipient_name: {
        type: DataTypes.STRING,
      },
      recipient_phone: {
        type: DataTypes.STRING,
      },
      house_flat_floor: {
        type: DataTypes.STRING,
      },
      street_area: {
        type: DataTypes.STRING,
      },
      landmark: {
        type: DataTypes.STRING,
      },
      city: {
        type: DataTypes.STRING,
        defaultValue: 'Bengaluru',
      },
      state: {
        type: DataTypes.STRING,
      },
      pincode: {
        type: DataTypes.STRING,
      },
      formatted_address: {
        type: DataTypes.TEXT,
      },
      latitude: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      longitude: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      is_default: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      timestamps: true,
    }
  );

  UserAddress.associate = (models) => {
    UserAddress.belongsTo(models.users, {
      foreignKey: 'user_id',
      as: 'user',
    });
  };

  return UserAddress;
};

