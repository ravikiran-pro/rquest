/**
 * AI Gateway — provider-agnostic core (mirrors the OTP gateway design).
 *
 * Features are pluggable modules in ./features/*, all talking to a single
 * provider adapter (./providers/openai) built on the Vercel AI SDK.
 *
 *   voice  : speech-to-text          (gpt-4o-mini-transcribe — cheapest STT)
 *   ocr    : image -> text / fields  (gpt-4o-mini vision, gpt-5-nano cheaper)
 *   search : NL query -> intent JSON (gpt-4o-mini, schema-validated via Zod)
 *
 * The OpenAI API key is read ONLY from process.env.OPENAI_API_KEY.
 *
 * DEV MODE (AI_DEV_MODE=true, default outside production): when no key is
 * configured, each feature returns a harmless stub instead of throwing, so the
 * whole app runs and the UI can be wired up with ZERO cost / ZERO config.
 */

const provider = require('./providers/openai');
const { transcribeAudio, MODEL: VOICE_MODEL } = require('./features/voice');
const { extractText, MODEL: OCR_MODEL } = require('./features/ocr');
const { parseQuery, MODEL: SEARCH_MODEL } = require('./features/search');

const DEV_MODE =
  String(process.env.AI_DEV_MODE || '').toLowerCase() === 'true' ||
  (process.env.NODE_ENV || 'development') !== 'production';

const isConfigured = () => provider.isConfigured();

/** Throw (prod) or return a dev stub (dev, no key) — shared guard for all features. */
const devGuard = (stub) => {
  if (isConfigured()) return null;
  if (DEV_MODE) {
    console.warn('[AI][dev] OPENAI_API_KEY not set — returning stub response.');
    return { ...stub, devMode: true, configured: false };
  }
  const err = new Error('AI is not configured (OPENAI_API_KEY missing)');
  err.code = 'AI_NOT_CONFIGURED';
  throw err;
};

/** Speech-to-text. @param {Buffer} buffer */
const transcribe = async ({ buffer }) => {
  const stub = devGuard({ text: '', model: VOICE_MODEL });
  if (stub) return stub;
  return transcribeAudio({ buffer });
};

/** Image OCR. @param {Buffer} [buffer] @param {string} [imageUrl] */
const ocr = async ({ buffer, mimetype, imageUrl, structured }) => {
  const stub = devGuard(
    structured
      ? { text: '', items: [], language: null, model: OCR_MODEL }
      : { text: '', model: OCR_MODEL }
  );
  if (stub) return stub;
  return extractText({ buffer, mimetype, imageUrl, structured });
};

/** Smart search. @param {string} query */
const smartSearch = async ({ query }) => {
  const stub = devGuard({
    intent: {
      keywords: query ? [String(query).trim()] : [],
      category: null,
      maxDistanceMiles: null,
      priceMin: null,
      priceMax: null,
      openNow: null,
      sort: 'relevance',
    },
    model: SEARCH_MODEL,
  });
  if (stub) return stub;
  return parseQuery({ query });
};

/** Status for debugging: is the provider configured + which models are in use. */
const status = () => ({
  provider: provider.name,
  configured: isConfigured(),
  devMode: DEV_MODE,
  models: { voice: VOICE_MODEL, ocr: OCR_MODEL, search: SEARCH_MODEL },
});

module.exports = { transcribe, ocr, smartSearch, status, isConfigured, DEV_MODE };
