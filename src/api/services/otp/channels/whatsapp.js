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
 *
 * NOTE: For production (cold OTP to any number) you MUST use an approved
 * "authentication" category template. Set WHATSAPP_TEMPLATE to that template name.
 */

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0';

const toE164 = (mobile) => {
  const digits = String(mobile).replace(/\D/g, '');
  return digits; // Graph API expects digits without '+'
};

const sendTemplate = async (to, code) => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const template = process.env.WHATSAPP_TEMPLATE;
  const lang = process.env.WHATSAPP_TEMPLATE_LANG || 'en_US';

  const payload = {
    messaging_product: 'whatsapp',
    to: toE164(to),
    type: 'template',
    template: {
      name: template,
      language: { code: lang },
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: code }],
        },
        {
          // Authentication templates require the code copy button component.
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: code }],
        },
      ],
    },
  };

  return postGraph(phoneId, token, payload);
};

const sendText = async (to, code, ttlSeconds) => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const minutes = Math.round(ttlSeconds / 60);
  const payload = {
    messaging_product: 'whatsapp',
    to: toE164(to),
    type: 'text',
    text: {
      body: `Your Rquest verification code is ${code} (valid ${minutes} min). Do not share it with anyone.`,
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
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`WhatsApp send failed (${res.status}): ${detail}`);
  }
};

const isConfigured = () =>
  !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

const send = async ({ to, code, ttlSeconds }) => {
  if (process.env.WHATSAPP_TEMPLATE) return sendTemplate(to, code);
  return sendText(to, code, ttlSeconds);
};

module.exports = { name: 'whatsapp', send, isConfigured };
