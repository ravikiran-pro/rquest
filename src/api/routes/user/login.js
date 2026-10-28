const { validateUser, generateJwt } = require('../../auth');
const { users, Sequelize } = require('../../models');

const login = async (req, res) => {
  try {
    const userDetails = req.body;
    const identifier = (
      userDetails.identifier ||
      userDetails.username ||
      userDetails.mobile ||
      ''
    )
      .toString()
      .trim();
    const password = userDetails.password ? userDetails.password.toString().trim() : '';

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Mobile or username, and password are required',
        message: 'Please enter your mobile number or username, along with your password',
      });
    }

    // 1. Try finding by exact mobile
    let user = await users.findOne({
      where: { mobile: identifier },
    });

    // 1b. If mobile was formatted with country code/dashes, try last 10 digits
    if (!user) {
      const digitsOnly = identifier.replace(/\D/g, '');
      if (digitsOnly.length >= 10) {
        const last10 = digitsOnly.slice(-10);
        user = await users.findOne({
          where: { mobile: last10 },
        });
      }
    }

    // 2. Try finding by username (case-insensitive)
    if (!user) {
      user = await users.findOne({
        where: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('username')),
          identifier.toLowerCase()
        ),
      });
    }

    // 2b. Fallback to exact username
    if (!user) {
      user = await users.findOne({
        where: { username: identifier },
      });
    }

    // 3. Try finding by email (case-insensitive)
    if (!user) {
      user = await users.findOne({
        where: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('email')),
          identifier.toLowerCase()
        ),
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        message: 'No account found matching this mobile number or username',
      });
    }

    const isMatch = await validateUser(password, user.password);

    if (isMatch) {
      let payload = {
        username: user.username,
        user_id: user.id,
        role_id: user.role_id,
        mobile: user.mobile,
      };
      let token = await generateJwt(payload);
      return res.status(200).json({
        success: true,
        token: token,
        user_data: payload,
      });
    } else {
      return res.status(401).json({
        success: false,
        error: 'Password Authentication Failed',
        message: 'Incorrect password. Please verify and try again.',
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || error,
      message: error.message || 'Login failed due to an internal server error',
    });
  }
};

module.exports = { login };
