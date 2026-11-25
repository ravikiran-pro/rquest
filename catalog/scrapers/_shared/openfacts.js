'use strict';

const { FIELDS } = require('../../lib/openfacts');
const { makeOpenFactsSource } = require('../../sources/_openfacts');
const P = require('../../lib/product');
const { recordSource } = require('./recordSource');

/**
 * Collector for any Open*Facts database (Food / Beauty / Products / Pet Food): the v2 search
 * API for products sold in India, optionally one query per category tag (each query is capped
 * at 1,000 results for anonymous clients, so per-category queries reach further). Pages
 * become collect_jobs; products become collect_records; the source reuses the Open Facts
 * transform (sources/_openfacts.js), so items, brands and dedupe behave like off-india.
 *
 *   makeOpenFactsCollector({
 *     name, host, siteName, title,
 *     categories: ['en:shampoos', ...]  // optional; none = all of India
 *     shopType: 'cosmetics',            // attributes.shop_type for items the category map
 *                                       // cannot place, so they still reach a sub-category
 *     feeds: ['cosmetics', ...],        // sub-categories this fills (reporting)
 *     maxPages: 10, pageSize: 100, refreshAfter: '7 days'
 *   }) → { scraper, source }
 *
 * Open*Facts data: ODbL 1.0 (database), DbCL 1.0 (contents), CC BY-SA (images).
 * API policy: https://openfoodfacts.github.io/openfoodfacts-server/api/ — identify with a
 * User-Agent, ≤ 10 search requests per minute.
 */
function makeOpenFactsCollector({
  name,
  host,
  siteName,
  title,
  categories = [],
  shopType = null,
  feeds = [],
  maxPages = 10,
  pageSize = 100,
  refreshAfter = '7 days',
}) {
  const queries = categories.length ? categories : [null];
  const searchUrl = (tag, page) =>
    `https://${host}/api/v2/search?countries_tags_en=india` +
    (tag ? `&categories_tags_en=${encodeURIComponent(tag)}` : '') +
    `&page_size=${pageSize}&page=${page}&sort_by=created_t&fields=${FIELDS.join(',')}`;

  const scraper = {
    name,
    title,
    license: 'ODbL 1.0 (database), DbCL 1.0 (contents), CC BY-SA 3.0 (images)',
    terms: 'https://openfoodfacts.github.io/openfoodfacts-server/api/',
    access: 'api',
    hosts: [host],
    // Open Facts asks for at most 10 search requests per minute
    minIntervalMs: 6500,
    categories: feeds,
    seed: () =>
      queries.map((tag) => ({
        key: `${tag || 'all'}:1`,
        params: { tag, page: 1 },
        refreshAfter,
      })),
    async handle(job, ctx) {
      const { tag, page } = job.params;
      const body = await ctx.json(searchUrl(tag, page), { timeoutMs: 90000 });
      if (!Array.isArray(body.products)) throw new Error('no products array in the response');
      const records = body.products
        .filter((p) => p && p.code)
        .map((p) => ({ key: String(p.code), url: `https://${host}/product/${p.code}`, payload: p }));
      const pages = Math.min(maxPages, Math.ceil(Number(body.count || 0) / pageSize));
      const jobs =
        page < pages ? [{ key: `${tag || 'all'}:${page + 1}`, params: { tag, page: page + 1 }, refreshAfter }] : [];
      return { records, jobs };
    },
  };

  const base = makeOpenFactsSource({ name, host, siteName, title });
  const source = recordSource({
    meta: { ...base.meta, title: `${title} (collected)` },
    entities: base.entities,
    extra: (ctx) => ({ seeds: P.loadProductSeeds(ctx.config.seedDir) }),
    transform(records, ctx) {
      const products = records.map((r) => r.payload);
      const out = base.transform({
        crawl: {
          crawlId: 'collected',
          host,
          products,
          partial: false,
          reportedCount: products.length,
          uniqueCodes: new Set(products.map((p) => p.code)).size,
        },
        seeds: ctx.input.seeds,
      });
      if (shopType) {
        for (const item of out.entities.items || []) {
          if (!item.taxonomy_node_id) item.attributes = { ...item.attributes, shop_type: shopType };
        }
      }
      return out;
    },
  });
  return { scraper, source };
}

module.exports = { makeOpenFactsCollector };
