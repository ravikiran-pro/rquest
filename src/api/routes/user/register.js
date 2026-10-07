const { generateHash, generateJwt } = require('../../auth');
const { users } = require('../../models');

const createUser = async (req, res) => {
  try {
    const userDetails = req.body;

    if (userDetails.mobile && userDetails.username && userDetails.password) {
      const existingUser = await users.findOne({
        where: { mobile: String(userDetails.mobile) },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'User already exists',
          message: 'User with this mobile number already exists',
        });
      }

      let hashedPassword = await generateHash(userDetails.password);
      const roleId =
        userDetails.userRole ||
        userDetails.role_id ||
        'c0f93a2f-16c9-49cf-b47b-e0c0a38a5a4d'; // Default to user role

      const payload = {
        username: userDetails.username,
        mobile: String(userDetails.mobile),
        password: hashedPassword,
        role_id: roleId,
      };

      const user = await users.create(payload);
      const jwtPayload = {
        username: user.username,
        user_id: user.id,
        role_id: user.role_id,
      };
      let token = await generateJwt(jwtPayload);
      return res.status(201).json({
        success: true,
        token: token,
        user_data: jwtPayload,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Username, mobile and password are required',
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
