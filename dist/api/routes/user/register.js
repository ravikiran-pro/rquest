const {
  generateHash,
  generateJwt
} = require('../../auth');
const {
  users
} = require('../../models');
const createUser = async (req, res) => {
  try {
    const userDetails = req.body;
    if (userDetails.mobile && userDetails.username && userDetails.password) {
      let hashedPassword = await generateHash(userDetails.password);
      ///default register as user
      const payload = {
        username: userDetails.username,
        mobile: userDetails.mobile,
        password: hashedPassword,
        role_id: 'c0f93a2f-16c9-49cf-b47b-e0c0a38a5a4d'
      };
      const user = await users.create(payload);
      let token = await generateJwt(user.toJSON());
      res.status(201).json({
        success: true,
        token: token,
        user_data: {
          username: user?.username
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Username and password required',
        message: 'Username and password required'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error,
      message: 'Password Authentication Failed'
    });
  }
};
module.exports = {
  createUser
};