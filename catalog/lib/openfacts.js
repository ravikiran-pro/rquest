'use strict';

const fs = require('fs');
const path = require('path');
const { fetchJson, sleep } = require('./http');
const { sha256 } = require('./hash');

/**
 * Crawl one Open*Facts database (Food / Beauty / Products — same API) for a country via the
 * v2 search API, politely and resumably.
 *
 * - One request every `minIntervalMs` (Open Food Facts allows ~10 search requests/minute).
 * - Each page is cached as <cacheDir>/<crawlId>/page-NNNN.json; an interrupted crawl
 *   resumes where it stopped. A `complete.json` marker records a finished crawl.
 * - Sorted by created_t so pages stay stable while the crawl runs (new products shift
 *   items into later pages → duplicates, which the transform drops; never gaps).
 * - crawlId defaults to today's UTC date: one snapshot per day. Pass CATALOG_OFF_CRAWL to
 *   reuse an older crawl (e.g. to re-run a transform without network).
 */
const FIELDS = [
  'code',
  'product_type',
  'product_name',
  'product_name_en',
  'generic_name',
  'generic_name_en',
  'brands',
  'brands_tags',
  'quantity',
  'product_quantity',
  'product_quantity_unit',
  'categories_tags',
  'labels_tags',
  'countries_tags',
  'origins_tags',
  'manufacturing_places',
  'allergens_tags',
  'nutriscore_grade',
  'nova_group',
  'image_front_url',
  'image_url',
  'completeness',
  'states_tags',
  'lang',
  'created_t',
  'last_modified_t',
];

/**
 * maxPages: the public API serves anonymous clients only the first 10 pages of a search
 * ("not available to anonymous users" beyond that). The crawler stops there by design and
 * marks the crawl `partial` — a sample, not the full country. Full coverage comes from the
 * project's official data exports, not from working around the limit.
 */
async function crawlCountry(
  ctx,
  {
    host,
    country = 'india',
    pageSize = 100,
    minIntervalMs = 6500,
    crawlId,
    maxPages = 10,
  } = {}
) {
  const id =
    crawlId ||
    process.env.CATALOG_OFF_CRAWL ||
    new Date().toISOString().slice(0, 10);
  const dir = path.join(ctx.cacheDir, id);
  const marker = path.join(dir, 'complete.json');
  fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(marker)) {
    const url = (page) =>
      `https://${host}/api/v2/search?countries_tags_en=${encodeURIComponent(
        country
      )}` +
      `&page_size=${pageSize}&page=${page}&sort_by=created_t&fields=${FIELDS.join(
        ','
      )}`;
    const pageFile = (n) =>
      path.join(dir, `page-${String(n).padStart(4, '0')}.json`);
    let lastRequest = 0;
    const getPage = async (n) => {
      if (fs.existsSync(pageFile(n)))
        return JSON.parse(fs.readFileSync(pageFile(n), 'utf8'));
      const wait = lastRequest + minIntervalMs - Date.now();
      if (wait > 0) await sleep(wait);
      lastRequest = Date.now();
      const body = await fetchJson(url(n), { timeoutMs: 90000 });
      if (!Array.isArray(body.products))
        throw new Error(`${host} page ${n}: no products array`);
      fs.writeFileSync(pageFile(n), JSON.stringify(body));
      return body;
    };
    const first = await getPage(1);
    const total = Math.ceil(Number(first.count) / pageSize);
    const pages = Math.min(total, maxPages);
    ctx.log(
      `  ${host}: ${first.count} products in ${total} pages; fetching ${pages} (crawl ${id})`
    );
    for (let n = 2; n <= pages; n += 1) {
      await getPage(n);
      if (n % 25 === 0) ctx.log(`  ${host}: page ${n}/${pages}`);
    }
    fs.writeFileSync(
      marker,
      JSON.stringify({
        host,
        country,
        count: first.count,
        pages,
        partial: pages < total,
        finished_at: new Date().toISOString(),
      })
    );
  }

  const info = JSON.parse(fs.readFileSync(marker, 'utf8'));
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^page-\d+\.json$/.test(f))
    .sort();
  const products = [];
  for (const f of files)
    products.push(
      ...JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).products
    );
  const unique = new Set(products.map((p) => p.code)).size;
  // Hash of the product content, independent of page boundaries and order.
  const inputSha256 = sha256(
    products
      .map((p) => `${p.code}:${p.last_modified_t}`)
      .sort()
      .join('\n')
  );
  return {
    crawlId: id,
    host,
    reportedCount: Number(info.count),
    partial: Boolean(info.partial),
    products,
    uniqueCodes: unique,
    inputSha256,
  };
}

module.exports = { crawlCountry, FIELDS };
