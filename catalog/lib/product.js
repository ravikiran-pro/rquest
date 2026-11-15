'use strict';

const path = require('path');
const { readCsv } = require('./csv');
const { cleanText, nameKey } = require('./text');
const { sha256 } = require('./hash');

/** Origin tags seen in Open*Facts India data → ISO 3166-1 alpha-2. Unknown → null (raw kept). */
const COUNTRY = {
  'en:india': 'IN',
  'en:united-states': 'US',
  'en:china': 'CN',
  'en:thailand': 'TH',
  'en:malaysia': 'MY',
  'en:indonesia': 'ID',
  'en:united-kingdom': 'GB',
  'en:united-arab-emirates': 'AE',
  'en:sri-lanka': 'LK',
  'en:nepal': 'NP',
  'en:bangladesh': 'BD',
  'en:singapore': 'SG',
  'en:japan': 'JP',
  'en:south-korea': 'KR',
  'en:germany': 'DE',
  'en:france': 'FR',
  'en:italy': 'IT',
  'en:spain': 'ES',
  'en:australia': 'AU',
  'en:new-zealand': 'NZ',
  'en:switzerland': 'CH',
  'en:netherlands': 'NL',
  'en:belgium': 'BE',
  'en:turkey': 'TR',
  'en:vietnam': 'VN',
  'en:philippines': 'PH',
  'en:saudi-arabia': 'SA',
  'en:canada': 'CA',
  'en:brazil': 'BR',
};

const PROMO = new RegExp(
  [
    'buy\\s*\\d+\\s*get\\s*\\d+(\\s*free)?',
    'combo(\\s*pack)?',
    'offer\\s*pack',
    'save\\s*(rs\\.?|₹)\\s*\\d+',
    'mrp\\s*(rs\\.?|₹)?\\s*\\d+(\\.\\d+)?',
    '(rs\\.?|₹)\\s*\\d+(\\.\\d+)?\\s*off',
    '(rs\\.?|₹)\\s*\\d+(\\.\\d+)?(?=\\s*$)',
  ].join('|'),
  'gi'
);

/** Load the reviewable classification + brand seeds once per run. */
function loadProductSeeds(seedDir) {
  const byTag = new Map(
    readCsv(path.join(seedDir, 'off_category_map.csv')).map((r) => [
      r.off_tag,
      r.node_id,
    ])
  );
  const rules = readCsv(path.join(seedDir, 'category_keywords.csv')).map(
    (r, i) => {
      try {
        // Stable id (not the line number): reordering or inserting rules must not change
        // items whose classification did not actually change.
        return {
          re: new RegExp(r.pattern, 'i'),
          node: r.node_id,
          id: `kw:${sha256(r.pattern).slice(0, 8)}`,
        };
      } catch (err) {
        throw new Error(
          `category_keywords.csv rule ${i + 1}: invalid pattern ${r.pattern} (${
            err.message
          })`
        );
      }
    }
  );
  const aliases = new Map();
  for (const r of readCsv(path.join(seedDir, 'brand_aliases.csv'))) {
    const display = cleanText(r.brand);
    aliases.set(nameKey(r.alias), display);
    aliases.set(nameKey(r.brand), display);
  }
  return { byTag, rules, aliases };
}

/** Deepest mapped source category wins; otherwise the first matching keyword rule. */
function classify(categoryTags, name, seeds) {
  const tags = Array.isArray(categoryTags) ? categoryTags : [];
  for (let i = tags.length - 1; i >= 0; i -= 1) {
    const node = seeds.byTag.get(tags[i]);
    if (node) return { node, basis: 'source_category', matched: tags[i] };
  }
  if (name) {
    for (const rule of seeds.rules) {
      if (rule.re.test(name))
        return { node: rule.node, basis: 'keyword', matched: rule.id };
    }
  }
  return { node: null, basis: null, matched: null };
}

function stripPromo(name) {
  return cleanText(
    String(name)
      .replace(/[([][^)\]]*\b(offer|free|combo|save|mrp)\b[^)\]]*[)\]]/gi, ' ')
      .replace(PROMO, ' ')
  );
}

/**
 * "AMUL PURE GHEE" → "Amul Pure Ghee", keeping tokens the brand itself writes in capitals
 * (MTR, ITC); "almond" → "Almond". Mixed-case names are otherwise left as the brand wrote them.
 */
function titleCaseIfShouting(name, brand) {
  const letters = name.replace(/[^A-Za-z]/g, '');
  if (letters.length < 4 || letters !== letters.toUpperCase()) {
    return /^[a-z]/.test(name) ? name[0].toUpperCase() + name.slice(1) : name;
  }
  const keepUpper = new Set(
    String(brand || '')
      .split(/\s+/)
      .filter((w) => w.length <= 4 && /^[A-Z]+$/.test(w))
  );
  return name.replace(/[A-Za-z][A-Za-z']*/g, (w) =>
    keepUpper.has(w) ? w : w[0].toUpperCase() + w.slice(1).toLowerCase()
  );
}

function brandOf(rawBrands, seeds) {
  const first = cleanText(String(rawBrands || '').split(',')[0]);
  if (!first) return null;
  const key = nameKey(first);
  if (!key) return null;
  const canonical = seeds.aliases.get(key);
  return canonical
    ? { key: nameKey(canonical), display: canonical, raw: first }
    : { key, display: first, raw: first };
}

function dietOf(labels) {
  const set = new Set(labels || []);
  if (set.has('en:vegan')) return 'vegan';
  if (set.has('en:non-vegetarian')) return 'non_veg';
  if (set.has('en:vegetarian')) return 'veg';
  return null;
}

const countryOf = (originTags) => {
  for (const t of originTags || []) if (COUNTRY[t]) return COUNTRY[t];
  return null;
};

/**
 * 0–100 completeness score and the readiness gate. "ready" means good enough to offer in
 * merchant autocomplete (shown as unverified); people promote items to "verified".
 */
function qualityOf({ name, brand, quantity, category, gtin, image, diet }) {
  const score =
    (name ? 25 : 0) +
    (brand ? 15 : 0) +
    (quantity ? 15 : 0) +
    (category ? 15 : 0) +
    (gtin ? 15 : 0) +
    (image ? 10 : 0) +
    (diet ? 5 : 0);
  const ready = Boolean(
    name && brand && category && (quantity || gtin) && score >= 70
  );
  return { score, status: ready ? 'ready' : 'incomplete' };
}

/** Deterministic identity: barcode first, then brand|name|quantity, else per-source record. */
function identityOf({
  gtin,
  brandKey,
  nameKeyValue,
  quantity,
  source,
  sourceId,
}) {
  if (gtin) return { id: `gtin:${gtin}`, dedupeKey: null };
  if (brandKey && nameKeyValue && quantity) {
    const dedupeKey = `${brandKey}|${nameKeyValue}|${quantity.value}|${quantity.unit}`;
    return { id: `key:${sha256(dedupeKey).slice(0, 20)}`, dedupeKey };
  }
  return { id: `src:${source}:${sourceId}`, dedupeKey: null };
}

module.exports = {
  loadProductSeeds,
  classify,
  stripPromo,
  titleCaseIfShouting,
  brandOf,
  dietOf,
  countryOf,
  qualityOf,
  identityOf,
};
