const { validateUser, generateJwt } = require('../../auth');
const { users } = require('../../models');

const login = async (req, res) => {
  try {
    const userDetails = req.body;

    if (userDetails.mobile && userDetails.password) {
      const user = await users.findOne({
        where: { mobile: String(userDetails.mobile) },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
          message: 'Invalid mobile or password',
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
          message: 'Invalid mobile or password',
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Mobile and password required',
        message: 'Mobile and password required',
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || error,
      message: 'Password Authentication Failed',
    });
  }
};

module.exports = { login };
