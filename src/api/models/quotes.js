const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Quote = sequelize.define(
    'quotes',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      customer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      shop_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'shops',
          key: 'id',
        },
      },
      service_title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      service_description: {
        type: DataTypes.TEXT,
      },
      estimated_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: 'offered', // 'offered', 'accepted', 'rejected', 'completed'
      },
    },
    {
      timestamps: true,
    }
  );

  Quote.associate = (models) => {
    Quote.belongsTo(models.users, {
      foreignKey: 'customer_id',
      as: 'customer',
    });
    Quote.belongsTo(models.shops, {
      foreignKey: 'shop_id',
      as: 'shop',
    });
  };

  return Quote;
};

