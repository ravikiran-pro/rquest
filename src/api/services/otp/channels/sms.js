/**
 * SMS OTP channel — zero-dependency, uses global fetch (Node 18+).
 *
 * FREE-for-dev providers supported (pick one via SMS_PROVIDER):
 *   - fast2sms : https://www.fast2sms.com — ₹50 free signup credit (India, needs DLT
 *                for production). Needs FAST2SMS_API_KEY.
 *   - twilio   : https://www.twilio.com   — trial: 100 SMS + free credit, can send only
 *                to up to 5 VERIFIED numbers. Good for dev with 5-10 test phones.
 *                Needs TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM.
 *
 * Required env:
 *   SMS_PROVIDER=fast2sms|twilio
 */

const PROVIDER = (process.env.SMS_PROVIDER || 'fast2sms').toLowerCase();

// Normalise to the last 10 digits for Indian numbers (Fast2SMS wants bare 10 digits).
const to10Digits = (mobile) => {
  const digits = String(mobile).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

const sendViaFast2Sms = async (to, code) => {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) throw new Error('FAST2SMS_API_KEY is not configured');
  const numbers = to10Digits(to);

  // "otp" route delivers a templated OTP SMS. variables_values is the code itself.
  const params = new URLSearchParams({
    authorization: apiKey,
    route: 'otp',
    variables_values: code,
    numbers,
  });
  const res = await fetch(`https://www.fast2sms.com/dev/bulkV2?${params}`, {
    method: 'GET',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.return === false) {
    throw new Error(
      `Fast2SMS send failed (${res.status}): ${JSON.stringify(data)}`
    );
  }
};

const sendViaTwilio = async (to, code, ttlSeconds) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) {
    throw new Error(
      'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM must be configured'
    );
  }
  const minutes = Math.round(ttlSeconds / 60);
  const body = new URLSearchParams({
    To: to.startsWith('+') ? to : `+${String(to).replace(/\D/g, '')}`,
    From: from,
    Body: `Your Rquest verification code is ${code} (valid ${minutes} min).`,
  });
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    }
  );
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Twilio send failed (${res.status}): ${detail}`);
  }
};

const isConfigured = () => {
  if (PROVIDER === 'twilio') {
    return !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM
    );
  }
  return !!process.env.FAST2SMS_API_KEY;
};

const send = async ({ to, code, ttlSeconds }) => {
  if (PROVIDER === 'twilio') return sendViaTwilio(to, code, ttlSeconds);
  return sendViaFast2Sms(to, code);
};

module.exports = { name: 'sms', send, isConfigured };
