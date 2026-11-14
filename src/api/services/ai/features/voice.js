/**
 * Voice feature — speech-to-text transcription (Vercel AI SDK `transcribe`).
 *
 * Lowest-cost OpenAI STT model is gpt-4o-mini-transcribe (~$0.003/min),
 * roughly half the price of whisper-1. Override via AI_TRANSCRIBE_MODEL.
 *
 * The transcript can be piped straight into smart search by the route, so a
 * user can *speak* a query ("open bike shops near me under 20 bucks") and get
 * structured search intent back.
 */

const openai = require('../providers/openai');

const MODEL = process.env.AI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe';

/**
 * @param {Buffer} buffer    - raw audio bytes
 * @returns {Promise<{ text: string, language?: string, durationInSeconds?: number, model: string }>}
 */
const transcribeAudio = async ({ buffer }) => {
  if (!buffer || !buffer.length) {
    const err = new Error('audio file is required');
    err.code = 'AI_NO_AUDIO';
    throw err;
  }

  const result = await openai.transcribe({ model: MODEL, audio: buffer });

  return {
    text: (result.text || '').trim(),
    language: result.language,
    durationInSeconds: result.durationInSeconds,
    model: MODEL,
  };
};

module.exports = { transcribeAudio, MODEL };
