'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Scrapers are discovered from catalog/scrapers/<name>/index.js — adding a collector never
 * edits a shared file. Each module exports:
 *
 *   scraper: {
 *     name,                 same as the folder; [a-z0-9-]
 *     title, license,       what the data is and under which licence it may be stored
 *     terms,                URL of the site's terms / API policy the collector follows
 *     access,               'api' (documented API) | 'crawl' (web pages: robots.txt obeyed)
 *     hosts: [...],         the only hosts it may fetch
 *     minIntervalMs,        at most one request per host this often (default 2000)
 *     categories: [...],    sub-category keys it feeds (for `collect list` and the gaps report)
 *     seed(ctx) → jobs,     initial jobs (idempotent: keys dedupe)
 *     handle(job, ctx) → { records: [{ key, url?, payload }], jobs?: [...] }
 *   }
 *   source?: a normal pipeline source (sources/README pattern) whose extract reads this
 *            scraper's records (lib/collect/records.readRecords); registered under the
 *            scraper's name, after the built-in sources.
 */

const DIR = path.join(__dirname, '..', '..', 'scrapers');
const NAME = /^[a-z0-9][a-z0-9-]*$/;
let cache = null;

function load() {
  if (cache) return cache;
  cache = new Map();
  if (!fs.existsSync(DIR)) return cache;
  for (const entry of fs.readdirSync(DIR, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('_') || !NAME.test(entry.name)) continue;
    const file = path.join(DIR, entry.name, 'index.js');
    if (!fs.existsSync(file)) continue;
    const mod = require(file); // eslint-disable-line global-require
    const s = mod.scraper;
    if (!s || s.name !== entry.name) {
      throw new Error(`scrapers/${entry.name}: export scraper with name "${entry.name}"`);
    }
    for (const field of ['title', 'license', 'terms', 'access', 'hosts', 'seed', 'handle']) {
      if (!s[field]) throw new Error(`scrapers/${entry.name}: scraper.${field} is required`);
    }
    if (!['api', 'crawl'].includes(s.access)) throw new Error(`scrapers/${entry.name}: access must be 'api' or 'crawl'`);
    cache.set(entry.name, mod);
  }
  return cache;
}

const listScrapers = () => [...load().values()].map((m) => m.scraper);
const getScraper = (name) => {
  const mod = load().get(name);
  if (!mod) throw new Error(`Unknown scraper "${name}". Available: ${[...load().keys()].join(', ') || 'none'}`);
  return mod.scraper;
};
/** { name: () => source } for scrapers that ship a source. */
const scraperSources = () =>
  Object.fromEntries([...load().entries()].filter(([, m]) => m.source).map(([name, m]) => [name, () => m.source]));

module.exports = { listScrapers, getScraper, scraperSources, DIR };
