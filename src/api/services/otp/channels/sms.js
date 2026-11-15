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

/**
 * Normalise a phone number into:
 *  - e164: +919876543210 (Twilio format)
 *  - digitsOnly: 919876543210
 *  - national10: 9876543210 (Fast2SMS / internal storage)
 */
const normalizePhone = (input, defaultCountryCode = '91') => {
  const raw = String(input || '').trim();
  const digits = raw.replace(/\D/g, '');

  let country = defaultCountryCode.replace(/\D/g, '') || '91';
  let national = digits;
  let full = digits;

  if (digits.length === 10) {
    national = digits;
    full = `${country}${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    national = digits.slice(1);
    full = `${country}${national}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    national = digits.slice(2);
    full = digits;
  } else if (raw.startsWith('+')) {
    national = digits.length >= 10 ? digits.slice(-10) : digits;
    full = digits;
  }

  return {
    e164: `+${full}`,
    digitsOnly: full,
    national10: national,
  };
};

// Normalise to the last 10 digits for Indian numbers (Fast2SMS wants bare 10 digits).
const to10Digits = (mobile) => {
  return normalizePhone(mobile).national10;
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
  return { delivered: true, actualCode: code };
};

const sendViaTwilio = async (to, code, ttlSeconds = 300) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) {
    throw new Error(
      'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM must be configured'
    );
  }
  const phone = normalizePhone(to);
  const minutes = Math.max(1, Math.round(ttlSeconds / 60));
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');

  const makeRequest = async (bodyText) => {
    const postBody = new URLSearchParams({
      To: phone.e164,
      From: from,
      Body: bodyText,
    });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: postBody,
      }
    );
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  };

  // Try custom branded body first
  const customBody = `Your Rquest verification code is ${code} (valid for ${minutes} min). Do not share it.`;
  let result = await makeRequest(customBody);

  // If Twilio trial account restriction (code 572006: trial accounts can only use predefined SMS templates)
  if (!result.ok && result.data?.code === 572006) {
    const trialTemplate = process.env.TWILIO_BODY_TEMPLATE || 'sms_2fa';
    console.warn(
      `[OTP][SMS] Twilio trial account restriction (572006) encountered. Retrying with approved trial template: "${trialTemplate}"`
    );
    result = await makeRequest(trialTemplate);
  }

  if (!result.ok) {
    const detail = result.data?.message || JSON.stringify(result.data);
    throw new Error(`Twilio send failed (${result.status}): ${detail}`);
  }

  // If Twilio trial template generated and delivered its own code, extract it from rendered body
  let actualCode = code;
  if (result.data?.body) {
    const match = result.data.body.match(/\b\d{4,8}\b/);
    if (match && match[0]) {
      actualCode = match[0];
    }
  }

  return { delivered: true, actualCode, sid: result.data?.sid };
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

module.exports = { name: 'sms', send, isConfigured, normalizePhone };
