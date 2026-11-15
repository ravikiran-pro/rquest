'use strict';

/**
 * Shared source factory for Open Food Facts / Open Beauty Facts / Open Products Facts
 * (same software, same data model, all ODbL). Produces brands, items and item_sources.
 */

const path = require('path');
const { crawlCountry } = require('../lib/openfacts');
const { sha256, sha256File } = require('../lib/hash');
const { nameKey } = require('../lib/text');
const { normalizeGtin, displayGtin } = require('../lib/gtin');
const {
  parseQuantity,
  splitTrailingQuantity,
  formatQuantity,
} = require('../lib/quantity');
const { itemEntities } = require('../lib/itemEntities');
const P = require('../lib/product');

const SEED_FILES = [
  'off_category_map.csv',
  'category_keywords.csv',
  'brand_aliases.csv',
];
const LICENSE =
  'ODbL 1.0 (database), DbCL 1.0 (contents), CC BY-SA 3.0 (images)';

function makeOpenFactsSource({ name, host, title, siteName }) {
  const meta = {
    name,
    title,
    license: LICENSE,
    attribution: `Product data from ${siteName} (${host.replace(
      /^world\./,
      ''
    )}), available under the Open Database License.`,
    transformVersion: 2,
    // Records without any name are rejected (~10% of Open Food Facts India).
    maxRejectRatio: 0.2,
  };

  const entities = itemEntities(name);

  async function extract(ctx) {
    const crawl = await crawlCountry(ctx, { host });
    const seedShas = await Promise.all(
      SEED_FILES.map((f) => sha256File(path.join(ctx.config.seedDir, f)))
    );
    return {
      version: `api-${crawl.partial ? 'sample-' : ''}${crawl.crawlId}`,
      inputSha256: sha256([crawl.inputSha256, ...seedShas].join(':')),
      crawl,
      seeds: P.loadProductSeeds(ctx.config.seedDir),
    };
  }

  function transform(input) {
    const { crawl, seeds } = input;
    const rejects = [];
    const review = [];
    const counts = {
      gtin_invalid: {},
      classified: { source_category: 0, keyword: 0, none: 0 },
      status: {},
    };

    // Crawl duplicates: keep the most recently modified record per code.
    const latest = new Map();
    for (const rec of crawl.products) {
      const prev = latest.get(rec.code);
      if (!prev || Number(rec.last_modified_t) > Number(prev.last_modified_t))
        latest.set(rec.code, rec);
    }

    const candidates = [];
    for (const rec of latest.values()) {
      const rawName =
        rec.product_name_en ||
        rec.product_name ||
        rec.generic_name_en ||
        rec.generic_name;
      let productName = rawName ? P.stripPromo(rawName) : null;
      if (!productName) {
        rejects.push({
          entity: 'items',
          source_key: rec.code,
          reason: 'no_name',
          raw: { code: rec.code, brands: rec.brands },
        });
        continue;
      }
      const brand = P.brandOf(rec.brands, seeds);
      let quantity = parseQuantity(rec.quantity);
      if (
        !quantity &&
        Number(rec.product_quantity) > 0 &&
        ['g', 'ml'].includes(rec.product_quantity_unit)
      ) {
        quantity = {
          value: Number(rec.product_quantity),
          unit: rec.product_quantity_unit,
          packCount: null,
        };
      }
      const split = splitTrailingQuantity(productName);
      if (split.quantity) {
        productName = split.name;
        quantity = quantity || split.quantity;
      }
      productName = P.titleCaseIfShouting(productName, brand && brand.raw);
      const key = nameKey(productName);
      if (!key || key.length < 2) {
        rejects.push({
          entity: 'items',
          source_key: rec.code,
          reason: 'name_too_short',
          raw: { code: rec.code, name: rawName },
        });
        continue;
      }

      const g = normalizeGtin(rec.code);
      if (!g.gtin)
        counts.gtin_invalid[g.reason] =
          (counts.gtin_invalid[g.reason] || 0) + 1;
      const cls = P.classify(rec.categories_tags, productName, seeds);
      counts.classified[cls.basis || 'none'] += 1;
      const diet = P.dietOf(rec.labels_tags);
      const image = rec.image_front_url || rec.image_url || null;
      const quality = P.qualityOf({
        name: productName,
        brand,
        quantity,
        category: cls.node,
        gtin: g.gtin,
        image,
        diet,
      });
      const identity = P.identityOf({
        gtin: g.gtin,
        brandKey: brand && brand.key,
        nameKeyValue: key,
        quantity,
        source: name,
        sourceId: rec.code,
      });

      candidates.push({
        rec,
        brand,
        identity,
        quality,
        item: {
          id: identity.id,
          gtin: g.gtin,
          kind: 'product',
          name: productName,
          name_key: key,
          brand_key: brand ? brand.key : null,
          net_quantity: quantity ? quantity.value : null,
          unit: quantity ? quantity.unit : null,
          quantity_text: quantity ? formatQuantity(quantity) : null,
          taxonomy_node_id: cls.node,
          classification_basis: cls.basis,
          hsn_code: null,
          country_of_origin: P.countryOf(rec.origins_tags),
          manufacturer: null,
          image_url: image,
          attributes: {
            barcode: g.gtin ? displayGtin(g.gtin) : null,
            diet,
            pack_count: quantity ? quantity.packCount : null,
            nutriscore: rec.nutriscore_grade || null,
            nova_group: rec.nova_group || null,
            allergens: (rec.allergens_tags || []).slice(0, 20),
            labels: (rec.labels_tags || []).slice(0, 20),
            manufacturing_places: rec.manufacturing_places || null,
            classified_by: cls.matched,
            image_license: image ? 'CC BY-SA 3.0' : null,
          },
          dedupe_key: identity.dedupeKey,
          status: quality.status,
          quality_score: quality.score,
          primary_source: name,
        },
      });
    }

    // Merge records that resolve to the same item: best quality, then newest, then code.
    const byId = new Map();
    for (const c of candidates) {
      if (!byId.has(c.identity.id)) byId.set(c.identity.id, []);
      byId.get(c.identity.id).push(c);
    }
    const items = [];
    const itemSources = [];
    for (const group of byId.values()) {
      group.sort(
        (a, b) =>
          b.quality.score - a.quality.score ||
          Number(b.rec.last_modified_t) - Number(a.rec.last_modified_t) ||
          (a.rec.code < b.rec.code ? -1 : 1)
      );
      items.push(group[0].item);
      counts.status[group[0].item.status] =
        (counts.status[group[0].item.status] || 0) + 1;
      for (const c of group) {
        itemSources.push({
          source: name,
          source_id: c.rec.code,
          item_id: c.identity.id,
          license: LICENSE,
          source_url: `https://${host}/product/${encodeURIComponent(
            c.rec.code
          )}`,
          source_modified_at: c.rec.last_modified_t
            ? new Date(Number(c.rec.last_modified_t) * 1000).toISOString()
            : null,
          raw: c.rec,
        });
      }
    }

    // Brands referenced by the kept items: canonical alias name, else the most common spelling.
    const spellings = new Map();
    const usedBrands = new Set(items.map((i) => i.brand_key).filter(Boolean));
    for (const c of candidates) {
      if (!c.brand || !usedBrands.has(c.brand.key)) continue;
      if (!spellings.has(c.brand.key)) spellings.set(c.brand.key, new Map());
      const m = spellings.get(c.brand.key);
      m.set(c.brand.display, (m.get(c.brand.display) || 0) + 1);
    }
    const brands = [...spellings].map(([brandKey, m]) => {
      const ranked = [...m].sort(
        (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)
      );
      return {
        brand_key: brandKey,
        name: ranked[0][0],
        aliases: ranked
          .slice(1)
          .map(([s]) => s)
          .sort(),
        source: name,
      };
    });

    if (crawl.partial) {
      review.push({
        kind: 'source_partial_coverage',
        entity: 'source',
        entity_key: name,
        payload: {
          fetched: crawl.uniqueCodes,
          available: crawl.reportedCount,
          reason: `${host} serves anonymous clients only the first 1,000 search results.`,
          action:
            'Load the official data export for full coverage (see catalog/README.md).',
        },
      });
    }

    return {
      entities: { brands, items, item_sources: itemSources },
      rejects,
      review,
      inputCount: latest.size,
      notes: {
        crawl: crawl.crawlId,
        partial: crawl.partial,
        available: crawl.reportedCount,
        records: latest.size,
        items: items.length,
        merged_records: candidates.length - items.length,
        brands: brands.length,
        ...counts,
      },
    };
  }

  return { meta, entities, extract, transform };
}

module.exports = { makeOpenFactsSource };
