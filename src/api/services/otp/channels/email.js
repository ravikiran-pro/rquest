/**
 * Email OTP channel — zero-dependency, uses global fetch (Node 18+).
 *
 * FREE providers supported (pick one via EMAIL_PROVIDER):
 *   - brevo   : https://www.brevo.com  — 300 emails/day free. Needs BREVO_API_KEY.
 *   - resend  : https://resend.com     — 3,000/mo, 100/day free. Needs RESEND_API_KEY.
 *
 * Required env:
 *   EMAIL_PROVIDER=brevo|resend
 *   EMAIL_FROM="Rquest <no-reply@yourdomain.com>"   (sender must be verified)
 *   BREVO_API_KEY=...        (if brevo)
 *   RESEND_API_KEY=...       (if resend)
 */

const PROVIDER = (process.env.EMAIL_PROVIDER || 'brevo').toLowerCase();
const EMAIL_FROM = process.env.EMAIL_FROM || 'Rquest <no-reply@rquest.app>';

const parseFrom = (from) => {
  const match = from.match(/^\s*(.*?)\s*<\s*(.+?)\s*>\s*$/);
  if (match) return { name: match[1] || 'Rquest', email: match[2] };
  return { name: 'Rquest', email: from.trim() };
};

const buildBody = (code, ttlSeconds) => {
  const minutes = Math.round(ttlSeconds / 60);
  const subject = `${code} is your Rquest verification code`;
  const text = `Your Rquest verification code is ${code}. It expires in ${minutes} minute(s). If you did not request this, you can ignore this email.`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
    <h2 style="margin:0 0 8px">Verify your Rquest account</h2>
    <p>Use the code below to continue. It expires in ${minutes} minute(s).</p>
    <p style="font-size:32px;font-weight:bold;letter-spacing:6px;margin:16px 0">${code}</p>
    <p style="color:#888;font-size:12px">If you did not request this, you can safely ignore this email.</p>
  </div>`;
  return { subject, text, html };
};

const sendViaBrevo = async (to, { subject, text, html }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY is not configured');
  const sender = parseFrom(EMAIL_FROM);
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Brevo send failed (${res.status}): ${detail}`);
  }
};

const sendViaResend = async (to, { subject, text, html }) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, text, html }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend send failed (${res.status}): ${detail}`);
  }
};

const isConfigured = () => {
  if (PROVIDER === 'brevo') return !!process.env.BREVO_API_KEY;
  if (PROVIDER === 'resend') return !!process.env.RESEND_API_KEY;
  return false;
};

const send = async ({ to, code, ttlSeconds }) => {
  const body = buildBody(code, ttlSeconds);
  if (PROVIDER === 'resend') return sendViaResend(to, body);
  return sendViaBrevo(to, body);
};

module.exports = { name: 'email', send, isConfigured };
