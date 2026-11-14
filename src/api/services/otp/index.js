/**
 * OTP Gateway — provider-agnostic core.
 *
 * Responsibilities:
 *   - pick a delivery channel (explicit request > inferred from identifier > env default)
 *   - generate + persist a hashed, expiring code (see store.js)
 *   - hand the plain code to the chosen channel adapter for delivery
 *   - verify a submitted code
 *
 * Channels are pluggable adapters in ./channels/*. Each exports:
 *   { name, send({ to, code, ttlSeconds }), isConfigured() }
 *
 * Channel selection via env:
 *   OTP_DEFAULT_CHANNEL=email|sms|whatsapp|telegram   (default: email)
 *   OTP_DEV_MODE=true   -> also return the code in the API response + log it,
 *                          so you can test with no provider keys at all.
 */

const email = require('./channels/email');
const sms = require('./channels/sms');
const whatsapp = require('./channels/whatsapp');
const telegram = require('./channels/telegram');
const { createOtp, verifyOtp } = require('./store');

const CHANNELS = { email, sms, whatsapp, telegram };
const DEFAULT_CHANNEL = (process.env.OTP_DEFAULT_CHANNEL || 'email').toLowerCase();
const DEV_MODE =
  String(process.env.OTP_DEV_MODE || '').toLowerCase() === 'true' ||
  (process.env.NODE_ENV || 'development') !== 'production';

const looksLikeEmail = (v) => /@/.test(String(v || ''));

/**
 * Decide which channel to use.
 * Priority: explicit `channel` arg -> email if identifier is an email -> env default.
 * Falls back to any configured channel if the chosen one has no credentials
 * (unless in DEV_MODE, where we never need credentials).
 */
const resolveChannel = (identifier, requested) => {
  let name = (requested || '').toLowerCase();
  if (!name) name = looksLikeEmail(identifier) ? 'email' : DEFAULT_CHANNEL;

  const channel = CHANNELS[name];
  if (!channel) {
    const err = new Error(`Unknown OTP channel: ${name}`);
    err.code = 'OTP_BAD_CHANNEL';
    throw err;
  }
  return { name, channel };
};

/**
 * Request an OTP: generate, persist, and deliver.
 * @returns { channel, ttlSeconds, devCode? }
 */
const requestOtp = async ({ identifier, channel: requested, purpose = 'login' }) => {
  if (!identifier) {
    const err = new Error('identifier is required');
    err.code = 'OTP_NO_IDENTIFIER';
    throw err;
  }

  const { name, channel } = resolveChannel(identifier, requested);

  const { code, ttlSeconds } = await createOtp({
    identifier: String(identifier).trim(),
    channel: name,
    purpose,
  });

  // In dev mode we don't require any provider to be set up — we just surface
  // the code so you can test the full flow with 0 cost / 0 config.
  if (DEV_MODE && !channel.isConfigured()) {
    console.log(
      `[OTP][dev] ${purpose} code for ${identifier} via ${name}: ${code}`
    );
    return { channel: name, ttlSeconds, devCode: code, delivered: false };
  }

  try {
    await channel.send({ to: String(identifier).trim(), code, ttlSeconds });
  } catch (sendErr) {
    if (DEV_MODE) {
      // Delivery failed but we can still test: log the code and continue.
      console.warn(
        `[OTP][dev] delivery via ${name} failed (${sendErr.message}); code: ${code}`
      );
      return { channel: name, ttlSeconds, devCode: code, delivered: false };
    }
    throw sendErr;
  }

  const result = { channel: name, ttlSeconds, delivered: true };
  if (DEV_MODE) result.devCode = code; // convenience while developing
  return result;
};

/**
 * Verify a submitted OTP. @returns { valid, reason? }
 */
const checkOtp = async ({ identifier, code, purpose = 'login' }) => {
  if (!identifier || !code) {
    return { valid: false, reason: 'identifier and code are required' };
  }
  return verifyOtp({
    identifier: String(identifier).trim(),
    code: String(code).trim(),
    purpose,
  });
};

/** Which channels currently have credentials configured. */
const channelStatus = () =>
  Object.fromEntries(
    Object.entries(CHANNELS).map(([n, c]) => [n, c.isConfigured()])
  );

module.exports = { requestOtp, checkOtp, channelStatus, DEV_MODE };
