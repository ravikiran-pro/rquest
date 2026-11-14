/**
 * Smart search feature — turn a natural-language query into a schema-validated
 * search intent the backend can execute against shops/listings.
 *
 * Using the AI SDK's generateObject + a Zod schema means the model's output is
 * validated and typed before it ever reaches our query layer — no brittle
 * hand-parsing of JSON out of free text.
 *
 * Example:
 *   "open bakeries within 2 miles that sell gluten free bread under $10"
 *   -> { keywords:["bakery","gluten free bread"], category:"bakery",
 *        maxDistanceMiles:2, priceMax:10, openNow:true, sort:"distance" }
 *
 * Distances are in statute MILES to match the Rquest geospatial invariant
 * ( point(lon,lat) <@> point(lon,lat) returns miles ).
 *
 * Default model gpt-4o-mini; set AI_SEARCH_MODEL=gpt-5-nano for lowest token cost.
 */

const { z } = require('zod');
const openai = require('../providers/openai');

const MODEL = process.env.AI_SEARCH_MODEL || 'gpt-4o-mini';

const SYSTEM_PROMPT =
  'You convert a shopper\'s natural-language request into a structured search ' +
  'intent for a local marketplace. Distances are in statute MILES. Infer sensible ' +
  'values but never invent constraints the user did not imply. If unsure, leave a ' +
  'field null. Always include at least one keyword.';

const SearchIntentSchema = z.object({
  keywords: z.array(z.string()).min(1).describe('Search terms extracted from the query'),
  category: z.string().nullable().describe('Single best-guess category, or null'),
  maxDistanceMiles: z.number().positive().nullable().describe('Max distance in miles, or null'),
  priceMin: z.number().nonnegative().nullable().describe('Minimum price, or null'),
  priceMax: z.number().nonnegative().nullable().describe('Maximum price, or null'),
  openNow: z.boolean().nullable().describe('Whether the user wants places open now, or null'),
  sort: z
    .enum(['distance', 'price_asc', 'price_desc', 'rating', 'relevance'])
    .describe('Preferred sort order; default "relevance"'),
});

/**
 * @param {string} query - the raw natural-language query
 * @returns {Promise<{ intent: object, model: string }>}
 */
const parseQuery = async ({ query }) => {
  const q = String(query || '').trim();
  if (!q) {
    const err = new Error('query is required');
    err.code = 'AI_NO_QUERY';
    throw err;
  }

  let intent;
  try {
    intent = await openai.generateObject({
      model: MODEL,
      schema: SearchIntentSchema,
      system: SYSTEM_PROMPT,
      prompt: q,
      maxTokens: 400,
    });
  } catch (_e) {
    // Degrade gracefully to a keyword-only search on the raw query.
    intent = {
      keywords: [q],
      category: null,
      maxDistanceMiles: null,
      priceMin: null,
      priceMax: null,
      openNow: null,
      sort: 'relevance',
    };
  }

  // Safety net: schema guarantees shape, but ensure a usable keyword exists.
  if (!intent.keywords || !intent.keywords.length) intent.keywords = [q];

  return { intent, model: MODEL };
};

module.exports = { parseQuery, MODEL };
