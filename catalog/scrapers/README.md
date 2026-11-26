# Collectors (`catalog/scrapers/`)

Background collectors that grow the catalogue: more items, and the attributes items are
missing. Each collector is one folder, discovered automatically — adding one never edits a
shared file.

```
scrapers/<name>/index.js     exports { scraper, source? }   (name = folder, [a-z0-9-])
scrapers/<name>/*.csv|json   seeds the collector needs (category lists, id lists, …)
scrapers/_shared/            helpers (recordSource, openfacts); folders starting with _ are not collectors
```

## How it runs

```
node cli.js collect seed <name>        queue the seed jobs (idempotent)
node cli.js worker --scrapers=<name>   claim due jobs, fetch, store records (long-running)
node cli.js worker --once              drain what is due, then exit (cron style)
node cli.js run <name>                 turn collected records into items (normal loader)
node cli.js collect status             queue / record counts and the last error
node cli.js gaps [--sub=<key>]         items and attribute fill per sub-category
```

1. **Jobs** (`catalog.collect_jobs`): one page or request each, unique per (scraper, key).
   Workers claim them with `FOR UPDATE SKIP LOCKED`, so several workers can share a queue.
   Failures back off (2^attempts minutes, 5 attempts); 4xx and robots refusals fail at once.
   `refreshAfter: '7 days'` re-runs a done job on that schedule.
2. **Records** (`catalog.collect_records`): what a job found, upserted by (scraper, key)
   with a content hash — re-collecting an unchanged page writes nothing.
3. **Source** (`source` export, usually `_shared/recordSource`): reads the records and
   returns normal entities (brands, items, item_sources via `lib/itemEntities`, or any
   other catalog table). Item ids are deterministic (GTIN, else brand|name|quantity), so
   the same product from two collectors is one item; a collector only changes items it
   owns and never `verified` / `rejected` ones.

## Writing a collector

```js
module.exports = {
  scraper: {
    name: 'my-source',
    title: 'What it is',
    license: 'Licence of the data',            // must allow storing and redistributing
    terms: 'https://…/terms-or-api-policy',     // the rules you follow
    access: 'api',                              // 'api' = documented API, 'crawl' = web pages
    hosts: ['api.example.org'],                 // the only hosts it may fetch
    minIntervalMs: 3000,                        // ≥ the site's stated rate limit
    categories: ['kirana'],                     // sub-categories it feeds
    seed: () => [{ key: 'page:1', params: { page: 1 }, refreshAfter: '30 days' }],
    async handle(job, ctx) {
      const body = await ctx.json(`https://api.example.org/items?page=${job.params.page}`);
      return {
        records: body.items.map((it) => ({ key: it.id, url: it.url, payload: it })),
        jobs: body.next ? [{ key: `page:${job.params.page + 1}`, params: { page: job.params.page + 1 } }] : [],
      };
    },
  },
  source: recordSource({ meta, entities: itemEntities('my-source'), transform(records) { … } }),
};
```

### Filling missing attributes on items you do not own

A collector never edits items another source owns. To add what an item is missing (a
medicine's ceiling price, an appliance's BEE rating, a book's author), emit **facts** with
`_shared/factEntities.js` → `catalog.item_facts { item_id, attribute_key, value, source,
source_url, confidence }`. `items_enriched` (what the app reads) merges the most confident
fact per key in under the item's own non-null values; `fact_sources` says where each came
from. Match items by GTIN where you can (confidence 90+); a name match is 40–70.

### Curated data without a website

A collector may read a file in its own folder (`hosts: []`, one seed job, `handle` reads the
CSV/JSON) — e.g. a researched service menu for salons. Put the references you used in the
file header and keep `license` honest (`Internal (researched from …)`).

`ctx.json / ctx.text / ctx.fetch` go through the shared polite fetcher (`lib/collect/fetcher`):
host allowlist, per-host interval, retries with backoff, robots.txt for `access: 'crawl'`,
optional disk cache (`{ cacheTtlMs }`).

## Rules for every collector

- **Only sources that permit it.** Open data (ODbL, CC, government open data, MIT/Apache
  datasets) or documented public APIs used within their terms. Do **not** collect from
  sites whose terms forbid automated access or reuse of their listings (Amazon, Flipkart,
  BigBasket, Blinkit, 1mg, Myntra, Nykaa, JustDial, IndiaMART, …) — use them only as human
  reference for what attributes exist, never as a data source.
- **Obey robots.txt** (`access: 'crawl'` does this) and the site's rate limits; identify
  with `CATALOG_USER_AGENT`.
- **Record the licence** in `scraper.license`, and keep `item_sources.license` and
  `source_url` filled so every item can be traced and attributed.
- **No personal data.** Products, prices, specifications and public registers of
  businesses only; never people's names, phone numbers or addresses from listings.
- **Attribute keys** come from `seeds/attributes/definitions.json` (the dictionary). Put
  values under `items.attributes.<key>` (or the item columns: brand, manufacturer,
  net_quantity/unit/quantity_text, country_of_origin, gtin, hsn_code, image_url). A key that
  is not in the dictionary needs a definition in `attributes/fixes.json` first.
- Tests: `node --check`, a `worker --once --max-jobs=3` run, `node cli.js run <name>` twice
  (the second must be a no-op), and `node cli.js gaps` before/after.

## Running in the background

- **Locally:** `nohup node cli.js worker > ~/.cache/rquest-catalog/worker.log 2>&1 &`
- **Render background worker** (always on): root dir `catalog`, build `npm install`,
  start `node cli.js worker`, same `DB_*` / `NODE_ENV=production` env as the API.
- **Render cron job** (cheaper): schedule e.g. `*/30 * * * *`, command
  `node cli.js worker --once && node cli.js run-all`.
- Behind an HTTPS proxy set `NODE_USE_ENV_PROXY=1` (Node ≥ 22.21).
