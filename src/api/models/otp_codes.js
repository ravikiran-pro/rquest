const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OtpCode = sequelize.define(
    'otp_codes',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      // The value the OTP was sent to: a mobile number, email, or telegram chat id.
      identifier: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      // Channel used to deliver: email | sms | whatsapp | telegram
      channel: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      // Purpose of the code: login | register (lets us gate flows separately)
      purpose: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'login',
      },
      // bcrypt hash of the numeric code — never store the plain code.
      code_hash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      // Number of failed verify attempts against this code.
      attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      // Set once the code is successfully used, so it can't be replayed.
      consumed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      indexes: [{ fields: ['identifier', 'purpose'] }],
    }
  );

  return OtpCode;
};
