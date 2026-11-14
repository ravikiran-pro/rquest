const { requestOtp, checkOtp, channelStatus } = require('../../services/otp');

/**
 * POST /api/v1/user/otp/request
 * body: { identifier, channel?, purpose? }
 *   identifier : mobile number, email, or telegram chat id
 *   channel    : email | sms | whatsapp | telegram (optional; auto-resolved)
 *   purpose    : login | register (default login)
 */
const requestOtpHandler = async (req, res) => {
  try {
    const { identifier, channel, purpose } = req.body || {};
    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'identifier (mobile, email or telegram id) is required',
      });
    }

    const result = await requestOtp({ identifier, channel, purpose });

    return res.status(200).json({
      success: true,
      message: result.delivered
        ? `OTP sent via ${result.channel}`
        : `OTP generated (dev mode) via ${result.channel}`,
      channel: result.channel,
      ttlSeconds: result.ttlSeconds,
      // Only present in dev mode — never returned in production.
      ...(result.devCode ? { devCode: result.devCode } : {}),
    });
  } catch (error) {
    const status = error.code === 'OTP_COOLDOWN' ? 429 : 400;
    console.error('OTP request error:', error.message);
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to send OTP',
    });
  }
};

/**
 * POST /api/v1/user/otp/verify
 * body: { identifier, code, purpose? }
 * Verifies the code only. Returns { verified: true } on success.
 * (Issuing a JWT / creating the account is handled by the login/register routes.)
 */
const verifyOtpHandler = async (req, res) => {
  try {
    const { identifier, code, purpose } = req.body || {};
    const result = await checkOtp({ identifier, code, purpose });
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.reason });
    }
    return res.status(200).json({ success: true, verified: true });
  } catch (error) {
    console.error('OTP verify error:', error.message);
    return res
      .status(500)
      .json({ success: false, message: 'OTP verification failed' });
  }
};

/** GET /api/v1/user/otp/status — which channels are configured (handy for debugging). */
const otpStatusHandler = (_req, res) => {
  return res.status(200).json({ success: true, channels: channelStatus() });
};

module.exports = { requestOtpHandler, verifyOtpHandler, otpStatusHandler };
