/**
 * Image OCR feature — extract text (and optionally structured fields) from an
 * image, using the AI SDK's multimodal messages + schema-validated output.
 *
 * Default gpt-4o-mini: cheap, universally available, strong OCR. For ~3x cheaper
 * tokens set AI_VISION_MODEL=gpt-5-nano (the provider adjusts params automatically).
 *
 * Typical Rquest use: a shopper photographs a product label / receipt / handwritten
 * list and we turn it into searchable text or line items.
 */

const { z } = require('zod');
const openai = require('../providers/openai');

const MODEL = process.env.AI_VISION_MODEL || 'gpt-4o-mini';

const PLAIN_PROMPT =
  'You are an OCR engine. Transcribe ALL text visible in the image exactly, ' +
  'preserving line breaks and reading order. Return only the transcribed text.';

const STRUCTURED_PROMPT =
  'Extract the data from this image for a local shopping marketplace. ' +
  'Transcribe all visible text, list any product/line-item names you can ' +
  'identify, and report the dominant text language as a BCP-47 code.';

const OcrSchema = z.object({
  text: z.string().describe('Full transcription of all visible text'),
  items: z.array(z.string()).describe('Product or line-item names identified (may be empty)'),
  language: z.string().nullable().describe('BCP-47 code of the dominant text, or null'),
});

const toImagePart = ({ buffer, mimetype, imageUrl }) => {
  if (imageUrl) return { type: 'image', image: new URL(imageUrl) };
  if (mimetype) {
    // data URL keeps the mime type explicit for the model
    return { type: 'image', image: `data:${mimetype};base64,${buffer.toString('base64')}` };
  }
  return { type: 'image', image: buffer };
};

/**
 * @param {Buffer} [buffer]      - raw image bytes
 * @param {string} [mimetype]    - e.g. image/png, image/jpeg
 * @param {string} [imageUrl]    - alternatively, an https URL to the image
 * @param {boolean} [structured] - if true, return schema-validated { items, language }
 * @returns {Promise<{ text, items?, language?, model }>}
 */
const extractText = async ({ buffer, mimetype, imageUrl, structured = false }) => {
  if (!imageUrl && (!buffer || !buffer.length)) {
    const err = new Error('an image file or imageUrl is required');
    err.code = 'AI_NO_IMAGE';
    throw err;
  }

  const imagePart = toImagePart({ buffer, mimetype, imageUrl });

  if (!structured) {
    const text = await openai.generateText({
      model: MODEL,
      maxTokens: 1500,
      messages: [
        { role: 'user', content: [{ type: 'text', text: PLAIN_PROMPT }, imagePart] },
      ],
    });
    return { text: String(text).trim(), model: MODEL };
  }

  const object = await openai.generateObject({
    model: MODEL,
    schema: OcrSchema,
    maxTokens: 1500,
    messages: [
      { role: 'user', content: [{ type: 'text', text: STRUCTURED_PROMPT }, imagePart] },
    ],
  });

  return {
    text: object.text || '',
    items: Array.isArray(object.items) ? object.items : [],
    language: object.language || null,
    model: MODEL,
  };
};

module.exports = { extractText, MODEL };
