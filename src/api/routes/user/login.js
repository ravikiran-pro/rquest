const { validateUser, generateJwt, generateHash } = require('../../auth');
const { users, Sequelize } = require('../../models');
const { checkOtp } = require('../../services/otp');

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

    const isOtpLogin = !!(userDetails.otp || userDetails.is_otp);

    if (!identifier || (!password && !isOtpLogin)) {
      return res.status(400).json({
        success: false,
        error: 'Mobile or username is required',
        message: 'Please enter your mobile phone number to continue',
      });
    }

    // 1. Try finding by exact mobile
    let user = await users.findOne({
      where: { mobile: identifier },
    });

    // 1b. If mobile was formatted with country code/dashes, try last 10 digits
    const digitsOnly = identifier.replace(/\D/g, '');
    const cleanMobile = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
    if (!user && cleanMobile) {
      user = await users.findOne({
        where: { mobile: cleanMobile },
      });
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

    // OTP Verification Flow
    if (isOtpLogin) {
      // SECURITY: the submitted OTP must match a real, unexpired, unconsumed
      // code issued by the gateway for this identifier. The identifier used at
      // request time is what we verify against (mobile/email/telegram id).
      const otpIdentifier = (userDetails.identifier || identifier).toString().trim();
      const otpResult = await checkOtp({
        identifier: otpIdentifier,
        code: userDetails.otp,
        purpose: 'login',
      });

      if (!otpResult.valid) {
        return res.status(401).json({
          success: false,
          error: 'OTP verification failed',
          message: otpResult.reason || 'Invalid or expired code',
        });
      }

      // If user does not exist yet, auto-provision a verified shopper account
      if (!user) {
        const fallbackPhone = cleanMobile || '9876543210';
        const fallbackUsername = `user_${fallbackPhone.slice(-4)}`;
        const defaultHash = await generateHash('RquestPass@123');
        user = await users.create({
          username: fallbackUsername,
          mobile: fallbackPhone,
          password: defaultHash,
          role_id: 'c0f93a2f-16c9-49cf-b47b-e0c0a38a5a4d', // Default customer role
        });
      }

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
    }

    // Standard Password Flow
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
