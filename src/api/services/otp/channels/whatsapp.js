/**
 * WhatsApp OTP channel — zero-dependency, uses global fetch (Node 18+).
 *
 * FREE for development: Meta's WhatsApp Cloud API "test number" sends to up to
 * 5 VERIFIED recipient numbers at no cost — ideal for dev with a few phones.
 * Create a Meta developer app, add WhatsApp, and use the temporary access token
 * + phone number id from the API Setup screen.
 *
 * Required env:
 *   WHATSAPP_TOKEN=...              (temporary dev token or permanent system-user token)
 *   WHATSAPP_PHONE_NUMBER_ID=...    (from Meta API Setup)
 *   WHATSAPP_TEMPLATE=...           (optional: approved auth template name; if unset we
 *                                    send a plain text message, which only works inside an
 *                                    open 24h session — fine for dev once the user messages you)
 *   WHATSAPP_TEMPLATE_LANG=en       (optional, default en_US)
 */

const { normalizePhone } = require('./sms');

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0';

const toWhatsAppRecipient = (mobile) => {
  return normalizePhone(mobile).digitsOnly;
};

const sendTemplate = async (to, code) => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const template = process.env.WHATSAPP_TEMPLATE;
  const lang = process.env.WHATSAPP_TEMPLATE_LANG || 'en_US';

  const recipient = toWhatsAppRecipient(to);

  const payload = {
    messaging_product: 'whatsapp',
    to: recipient,
    type: 'template',
    template: {
      name: template,
      language: { code: lang },
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: String(code) }],
        },
        {
          // Authentication templates require the code copy button component.
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: String(code) }],
        },
      ],
    },
  };

  return postGraph(phoneId, token, payload);
};

const sendText = async (to, code, ttlSeconds = 300) => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const minutes = Math.max(1, Math.round(ttlSeconds / 60));
  const recipient = toWhatsAppRecipient(to);

  const payload = {
    messaging_product: 'whatsapp',
    to: recipient,
    type: 'text',
    text: {
      body: `Your Rquest verification code is ${code} (valid for ${minutes} min). Do not share it with anyone.`,
    },
  };
  return postGraph(phoneId, token, payload);
};

const postGraph = async (phoneId, token, payload) => {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(`WhatsApp send failed (${res.status}): ${errorMsg}`);
  }
  return { delivered: true, data };
};

const isConfigured = () =>
  !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

const send = async ({ to, code, ttlSeconds }) => {
  if (process.env.WHATSAPP_TEMPLATE) {
    return sendTemplate(to, code);
  }
  return sendText(to, code, ttlSeconds);
};

module.exports = { name: 'whatsapp', send, isConfigured, toWhatsAppRecipient };
