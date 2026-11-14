/**
 * Telegram OTP channel — zero-dependency, uses global fetch (Node 18+).
 *
 * FULLY FREE: Telegram Bot API has no per-message fee and no quota.
 * Create a bot via @BotFather to get TELEGRAM_BOT_TOKEN.
 *
 * IMPORTANT: a bot can only message a user who has first started a chat with it.
 * So `to` here must be a Telegram CHAT ID (numeric), not a phone number. In practice
 * you capture the chat id when the user taps "Login with Telegram" / sends /start to
 * your bot. This makes Telegram an opt-in channel, perfect as a free fallback.
 *
 * Required env:
 *   TELEGRAM_BOT_TOKEN=...
 */

const sendMessage = async (chatId, text) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(
      `Telegram send failed (${res.status}): ${JSON.stringify(data)}`
    );
  }
};

const isConfigured = () => !!process.env.TELEGRAM_BOT_TOKEN;

const send = async ({ to, code, ttlSeconds }) => {
  const minutes = Math.round(ttlSeconds / 60);
  const text = `<b>Rquest verification</b>\nYour code is <code>${code}</code> (valid ${minutes} min).\nDo not share it with anyone.`;
  return sendMessage(to, text);
};

module.exports = { name: 'telegram', send, isConfigured };
