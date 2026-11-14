const { Op } = require('sequelize');
const { otp_codes } = require('../../models');
const { generateHash } = require('../../auth');
const bcrypt = require('bcrypt');

// ---- Tunable policy (overridable via env) ----
const OTP_LENGTH = Number(process.env.OTP_LENGTH) || 6;
const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS) || 300; // 5 min
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS) || 5;
// Don't allow a new code to be requested more often than this per identifier.
const OTP_RESEND_COOLDOWN_SECONDS =
  Number(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 30;

/**
 * Generate a zero-padded numeric code of OTP_LENGTH digits.
 * Uses crypto for unbiased randomness.
 */
const generateCode = () => {
  const crypto = require('crypto');
  const max = 10 ** OTP_LENGTH;
  const num = crypto.randomInt(0, max);
  return String(num).padStart(OTP_LENGTH, '0');
};

/**
 * Create and persist a new OTP for an identifier/purpose.
 * Invalidates any still-valid prior codes for the same identifier+purpose.
 * Returns the plain code (to be handed to a channel adapter for delivery).
 */
const createOtp = async ({ identifier, channel, purpose = 'login' }) => {
  // Cooldown: block rapid re-requests.
  const recent = await otp_codes.findOne({
    where: {
      identifier,
      purpose,
      consumed_at: null,
      createdAt: {
        [Op.gt]: new Date(Date.now() - OTP_RESEND_COOLDOWN_SECONDS * 1000),
      },
    },
    order: [['createdAt', 'DESC']],
  });
  if (recent) {
    const err = new Error('Please wait before requesting another code');
    err.code = 'OTP_COOLDOWN';
    throw err;
  }

  // Invalidate previous unconsumed codes for this identifier+purpose.
  await otp_codes.update(
    { consumed_at: new Date() },
    { where: { identifier, purpose, consumed_at: null } }
  );

  const code = generateCode();
  const code_hash = await generateHash(code);
  const expires_at = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  await otp_codes.create({
    identifier,
    channel,
    purpose,
    code_hash,
    expires_at,
  });

  return { code, expires_at, ttlSeconds: OTP_TTL_SECONDS };
};

/**
 * Verify a submitted code for identifier/purpose.
 * Returns { valid: true } or { valid: false, reason }.
 * On success the code is consumed so it can't be reused.
 */
const verifyOtp = async ({ identifier, code, purpose = 'login' }) => {
  const record = await otp_codes.findOne({
    where: { identifier, purpose, consumed_at: null },
    order: [['createdAt', 'DESC']],
  });

  if (!record) {
    return { valid: false, reason: 'No active code. Please request a new OTP.' };
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    await record.update({ consumed_at: new Date() });
    return { valid: false, reason: 'Code expired. Please request a new OTP.' };
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await record.update({ consumed_at: new Date() });
    return {
      valid: false,
      reason: 'Too many attempts. Please request a new OTP.',
    };
  }

  const matches = await bcrypt.compare(String(code).trim(), record.code_hash);
  if (!matches) {
    await record.update({ attempts: record.attempts + 1 });
    const remaining = OTP_MAX_ATTEMPTS - (record.attempts + 1);
    return {
      valid: false,
      reason:
        remaining > 0
          ? `Incorrect code. ${remaining} attempt(s) left.`
          : 'Incorrect code. Please request a new OTP.',
    };
  }

  await record.update({ consumed_at: new Date() });
  return { valid: true };
};

module.exports = {
  createOtp,
  verifyOtp,
  generateCode,
  OTP_TTL_SECONDS,
  OTP_LENGTH,
};
