const { users, user_addresses, roles } = require('../../models');

const getProfile = async (req, res) => {
  try {
    const userId = req.user?.user_id || req.headers?.user_id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID not found',
      });
    }

    const user = await users.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: user_addresses,
          as: 'addresses',
          required: false,
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('getProfile error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || error,
      message: 'Failed to retrieve user profile',
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.user_id || req.headers?.user_id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID not found',
      });
    }

    const { username, email, mobile } = req.body;

    const user = await users.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if new mobile conflicts with another user
    if (mobile && mobile !== user.mobile) {
      const conflict = await users.findOne({
        where: { mobile: String(mobile) },
      });
      if (conflict && conflict.id !== userId) {
        return res.status(400).json({
          success: false,
          message: 'This mobile number is already registered to another account',
        });
      }
      user.mobile = String(mobile);
    }

    if (username && username.trim()) {
      user.username = username.trim();
    }

    if (email !== undefined) {
      user.email = email ? email.trim() : null;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user.id,
        username: user.username,
        mobile: user.mobile,
        email: user.email,
        role_id: user.role_id,
      },
    });
  } catch (error) {
    console.error('updateProfile error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || error,
      message: 'Failed to update user profile',
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
};

