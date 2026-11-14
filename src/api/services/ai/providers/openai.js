/**
 * OpenAI provider — built on the Vercel AI SDK (`ai` + `@ai-sdk/openai`).
 *
 * The AI SDK gives us typed, schema-validated structured output (via Zod +
 * generateObject), unified multimodal messages, and a clean transcription
 * helper — instead of hand-rolling fetch + JSON parsing.
 *
 * NOTE: `ai` and `@ai-sdk/openai` are ESM-only, and this server is CommonJS,
 * so we load them through a memoized dynamic import(). Node 18+ supports this.
 *
 * The API key is read ONLY from process.env.OPENAI_API_KEY — never logged,
 * never returned to the client, never hard-coded.
 *
 * Required env:  OPENAI_API_KEY=sk-...
 * Optional env:  OPENAI_BASE_URL (Azure/proxy),  AI_REASONING_EFFORT=low
 */

const isConfigured = () => !!process.env.OPENAI_API_KEY;

/** gpt-5* / o-series take a `reasoning_effort` and ignore temperature. */
const isReasoningModel = (model) => /^(gpt-5|o[0-9])/i.test(String(model || ''));

let _sdkPromise;
/** Memoized ESM loader + configured provider instance. */
const loadSdk = () => {
  if (_sdkPromise) return _sdkPromise;
  _sdkPromise = (async () => {
    const [ai, openaiMod] = await Promise.all([
      import('ai'),
      import('@ai-sdk/openai'),
    ]);
    const { generateText, generateObject, experimental_transcribe: transcribe } = ai;
    const provider = openaiMod.createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
    });
    return { generateText, generateObject, transcribe, provider };
  })().catch((err) => {
    _sdkPromise = undefined; // allow retry on next call
    throw err;
  });
  return _sdkPromise;
};

/** Per-model provider options (reasoning effort for gpt-5/o-series). */
const providerOptions = (model) =>
  isReasoningModel(model)
    ? { openai: { reasoningEffort: process.env.AI_REASONING_EFFORT || 'low' } }
    : undefined;

/**
 * Structured generation: validates the model's output against a Zod schema.
 * @returns the parsed object (schema-typed).
 */
const generateObject = async ({ model, schema, system, prompt, messages, maxTokens = 800 }) => {
  const { generateObject: gen, provider } = await loadSdk();
  const { object } = await gen({
    model: provider(model),
    schema,
    maxOutputTokens: maxTokens,
    providerOptions: providerOptions(model),
    ...(system ? { system } : {}),
    ...(messages ? { messages } : { prompt }),
  });
  return object;
};

/**
 * Free-form text generation (used for plain OCR transcription).
 * @returns {string}
 */
const generateText = async ({ model, system, prompt, messages, maxTokens = 1500 }) => {
  const { generateText: gen, provider } = await loadSdk();
  const { text } = await gen({
    model: provider(model),
    maxOutputTokens: maxTokens,
    providerOptions: providerOptions(model),
    ...(system ? { system } : {}),
    ...(messages ? { messages } : { prompt }),
  });
  return text;
};

/**
 * Speech-to-text. The SDK detects the audio format from the bytes.
 * @param {Buffer|Uint8Array} audio
 * @returns {{ text: string, language?: string, durationInSeconds?: number }}
 */
const transcribe = async ({ model, audio }) => {
  const { transcribe: run, provider } = await loadSdk();
  const result = await run({
    model: provider.transcription(model),
    audio,
  });
  return {
    text: result.text || '',
    language: result.language,
    durationInSeconds: result.durationInSeconds,
  };
};

module.exports = {
  name: 'openai',
  isConfigured,
  isReasoningModel,
  generateObject,
  generateText,
  transcribe,
};
