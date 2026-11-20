/**
 * Input clean-up and identity helpers for the master catalog API.
 *
 * The rules mirror the catalog pipeline (catalog/lib/text.js, gtin.js, hash.js) so items
 * created here get the same keys the pipeline would compute. The API never imports the
 * pipeline's code (it has its own package and is not part of the server build).
 */
const crypto = require('crypto');

const ITEM_STATUSES = ['incomplete', 'ready', 'verified', 'rejected'];
// Statuses a person may set. verified/rejected are protected from pipeline re-runs.
const EDITABLE_STATUSES = ['verified', 'ready', 'rejected'];
const KINDS = ['product', 'service'];
const UNITS = ['g', 'ml', 'pc'];

const ENTITIES = {
  '&nbsp;': ' ',
  '&#160;': ' ',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
};

/** Same as catalog/lib/text.js cleanText: tags, entities, invisible characters, spacing. */
function cleanText(value) {
  if (value === null || value === undefined) return null;
  let text = String(value).split('\u0000').join('').normalize('NFC');
  text = text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(nbsp|#160|amp|quot|#39|apos|lt|gt);/gi, (m) => ENTITIES[m.toLowerCase()] || m)
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?%)\]])/g, '$1')
    .replace(/([([])\s+/g, '$1')
    .replace(/([,;:])(?=[^\s\d])/g, '$1 ')
    .trim();
  return text.length ? text : null;
}

/** Same as catalog/lib/text.js nameKey: accent/case/punctuation-insensitive key. */
function nameKey(value) {
  const text = cleanText(value);
  if (!text) return null;
  const key = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return key.length ? key : null;
}

function checkDigitOk(digits14) {
  let sum = 0;
  for (let i = 0; i < 13; i += 1) sum += Number(digits14[i]) * (i % 2 === 0 ? 3 : 1);
  return (10 - (sum % 10)) % 10 === Number(digits14[13]);
}

function isRestrictedCirculation(gtin14) {
  if (gtin14[0] !== '0') return false;
  const p3 = Number(gtin14.slice(1, 4));
  return (p3 >= 20 && p3 <= 29) || (p3 >= 40 && p3 <= 49) || (p3 >= 200 && p3 <= 299);
}

const GTIN_ERRORS = {
  bad_length: 'Barcode must have 8, 12, 13 or 14 digits',
  all_zero: 'Barcode cannot be all zeros',
  bad_check_digit: 'Barcode check digit is wrong. Re-check the number',
  restricted_circulation:
    'This is an in-store barcode (prefix 02, 04 or 2) and cannot identify a product across shops',
};

/** Same as catalog/lib/gtin.js normalizeGtin: canonical 14 digits or a reason. */
function normalizeGtin(raw) {
  if (raw === null || raw === undefined) return { gtin: null, reason: 'empty' };
  const digits = String(raw).replace(/[^0-9]/g, '');
  if (!digits) return { gtin: null, reason: 'empty' };
  if (![8, 12, 13, 14].includes(digits.length)) return { gtin: null, reason: 'bad_length' };
  const g14 = digits.padStart(14, '0');
  if (/^0+$/.test(g14)) return { gtin: null, reason: 'all_zero' };
  if (!checkDigitOk(g14)) return { gtin: null, reason: 'bad_check_digit' };
  if (digits.length !== 8 && isRestrictedCirculation(g14)) {
    return { gtin: null, reason: 'restricted_circulation' };
  }
  return { gtin: g14, reason: null };
}

/** The barcode as printed (EAN-13 / UPC-A / EAN-8): the 14-digit padding stripped. */
function displayGtin(gtin14) {
  if (!gtin14) return null;
  if (gtin14.startsWith('000000')) return gtin14.slice(6);
  return gtin14[0] === '0' ? gtin14.slice(1) : gtin14;
}

/** Same as catalog/lib/hash.js: JSON with sorted keys, so equal rows hash equal. */
function stableStringify(value) {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value)
    .filter((k) => value[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const contentHash = (obj) => sha256(stableStringify(obj));

/** Escape LIKE wildcards in user input (Postgres' default escape character is \). */
const escapeLike = (text) => String(text).replace(/[\\%_]/g, (c) => `\\${c}`);

/** Search words: cleaned, at most `max`, each at most 60 characters. */
function searchTokens(text, max = 6) {
  const cleaned = cleanText(text);
  if (!cleaned) return [];
  return cleaned
    .split(' ')
    .map((t) => t.replace(/^[,.;:!?()[\]"']+|[,.;:!?()[\]"']+$/g, ''))
    .filter(Boolean)
    .slice(0, max)
    .map((t) => t.slice(0, 60));
}

/**
 * Integer query parameter. Missing → fallback; not an integer or outside [min, max] →
 * { error }. Values above max are clamped when `clamp` is set.
 */
function intParam(raw, { name, fallback, min = 0, max = Number.MAX_SAFE_INTEGER, clamp = false }) {
  if (raw === undefined || raw === null || raw === '') return { value: fallback };
  if (!/^-?\d+$/.test(String(raw).trim())) return { error: `${name} must be a whole number` };
  let value = Number(raw);
  if (value < min) return { error: `${name} must be at least ${min}` };
  if (value > max) {
    if (!clamp) return { error: `${name} must be at most ${max}` };
    value = max;
  }
  return { value };
}

/** Number field from a JSON body: null/'' → null; anything else must be a finite number. */
function numberField(raw) {
  if (raw === null || raw === undefined || raw === '') return { value: null };
  const value = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(value)) return { error: true };
  return { value };
}

/** "1000 g" → "1 kg", "500 ml" → "500 ml"; the printed pack label wins when present. */
function quantityLabel({ quantity_text: text, net_quantity: qty, unit }) {
  if (text) return text;
  if (qty === null || qty === undefined || !unit) return null;
  const n = Number(qty);
  if (unit === 'g' && n >= 1000) return `${n / 1000} kg`;
  if (unit === 'ml' && n >= 1000) return `${n / 1000} l`;
  return `${n} ${unit}`;
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = {
  ITEM_STATUSES,
  EDITABLE_STATUSES,
  KINDS,
  UNITS,
  GTIN_ERRORS,
  UUID_PATTERN,
  cleanText,
  nameKey,
  normalizeGtin,
  displayGtin,
  stableStringify,
  sha256,
  contentHash,
  escapeLike,
  searchTokens,
  intParam,
  numberField,
  quantityLabel,
  isPlainObject,
};
