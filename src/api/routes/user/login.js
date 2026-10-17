const { validateUser, generateJwt } = require('../../auth');
const { users } = require('../../models');

const login = async (req, res) => {
  try {
    const userDetails = req.body;

    if (userDetails.mobile && userDetails.password) {
      const identifier = String(userDetails.mobile);
      let user = await users.findOne({
        where: { mobile: identifier },
      });

      if (!user) {
        user = await users.findOne({
          where: { username: identifier },
        });
      }

      if (!user) {
        user = await users.findOne({
          where: { email: identifier },
        });
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
          message: 'Invalid mobile, username, or password',
        });
      }

      const isMatch = await validateUser(userDetails.password, user.password);

      if (isMatch) {
        let payload = {
          username: user.username,
          user_id: user.id,
          role_id: user.role_id,
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
          message: 'Invalid mobile, username, or password',
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Mobile/username and password required',
        message: 'Mobile/username and password required',
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
