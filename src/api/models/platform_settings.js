const { DataTypes } = require('sequelize');

// Platform-wide configuration set by the platform admin (Admin > Platform configuration).
// One row per setting: `key` -> JSONB `value`. Missing rows fall back to the defaults in
// src/api/services/platformSettings.js, so an empty (or missing) table is a valid state.
module.exports = (sequelize) => {
  const PlatformSetting = sequelize.define(
    'platform_settings',
    {
      key: {
        type: DataTypes.STRING(64),
        primaryKey: true,
      },
      value: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      // user_id of the admin who last changed this setting (audit only, no FK)
      updated_by: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: 'platform_settings',
      timestamps: true,
    }
  );

  return PlatformSetting;
};
