const { where, fn, col } = require('sequelize');
const { generateHash, generateJwt } = require('../../auth');
const { users } = require('../../models');
const { sendPushNotification } = require('../../services/notificationService');

const CUSTOMER_ROLE_ID = 'c0f93a2f-16c9-49cf-b47b-e0c0a38a5a4d';

const createUser = async (req, res) => {
  try {
    const userDetails = req.body;

    if (userDetails.mobile && userDetails.username && userDetails.password) {
      const cleanMobile = String(userDetails.mobile).trim();
      const cleanUsername = String(userDetails.username).trim();

      const existingUser = await users.findOne({
        where: { mobile: cleanMobile },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'User already exists',
          message: 'An account with this mobile number already exists',
        });
      }

      const takenUsername = await users.findOne({
        where: where(fn('LOWER', col('username')), cleanUsername.toLowerCase()),
      });
      if (takenUsername) {
        return res.status(400).json({
          success: false,
          error: 'Username already taken',
          message: 'This username is already taken. Please choose another one.',
        });
      }

      let hashedPassword = await generateHash(userDetails.password);
      // Role is never taken from the request: every self-registered account starts as a customer.
      // Shop creation promotes the account to merchant on the server.
      const roleId = CUSTOMER_ROLE_ID;

      const payload = {
        username: cleanUsername,
        mobile: cleanMobile,
        password: hashedPassword,
        role_id: roleId,
      };

      const user = await users.create(payload);
      const jwtPayload = {
        username: user.username,
        user_id: user.id,
        role_id: user.role_id,
        mobile: user.mobile,
      };
      let token = await generateJwt(jwtPayload);

      // Trigger Push Notification for Account Register
      try {
        await sendPushNotification({
          userId: user.id,
          title: '🎉 Welcome to Rquest!',
          body: `Welcome, ${user.username}! Your account has been registered successfully. Explore verified neighborhood stores with real counter MRP!`,
          type: 'account_register',
          data: {
            userId: user.id,
            username: user.username,
            role_id: user.role_id,
            url: '/app',
          },
        });
      } catch (notifErr) {
        console.warn('Failed to send register push notification:', notifErr.message);
      }

      return res.status(201).json({
        success: true,
        token: token,
        user_data: jwtPayload,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Username, mobile number and password are required',
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || error,
      message: 'Registration Failed',
    });
  }
};

module.exports = { createUser };
