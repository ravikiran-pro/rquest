const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        username: {
            type: DataTypes.STRING,
        },
        role: {
            type: DataTypes.UUID,
            references: {
                model: 'roles',
                key: 'id',
            },
        },
        created_at: {
            type: DataTypes.TIMESTAMP,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
            type: DataTypes.TIMESTAMP,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        },
    });

    return User;
};