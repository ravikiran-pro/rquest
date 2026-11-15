'use strict';

const { cleanText } = require('./text');

/**
 * Canonical HSN/SAC code form: digits only, even length 2/4/6/8.
 * Mirrors SQL catalog.normalize_hsn() — test/hsn.test.js checks both agree.
 *
 * Sources (incl. hsn-code-package) store chapters 01–09 without the leading zero
 * ("1011010" for 0101 10 10). Without padding, the same code from two sources would
 * become two different keys — the main HSN duplicate risk.
 */
function normalizeHsn(raw) {
  return normalizeHsnDetailed(raw).code;
}

function normalizeHsnDetailed(raw) {
  if (raw === null || raw === undefined) return { code: null, error: 'empty' };
  let digits = String(raw).replace(/[^0-9]/g, '');
  if (!digits) return { code: null, error: 'empty' };
  let padded = false;
  if (digits.length % 2 === 1) {
    if (digits.startsWith('99'))
      return { code: null, error: 'sac_group_level_unsupported' };
    if (digits.length >= 8) return { code: null, error: 'too_long' };
    digits = `0${digits}`;
    padded = true;
  }
  if (digits.length < 2 || digits.length > 8)
    return { code: null, error: 'bad_length' };
  return { code: digits, padded, error: null };
}

const hsnType = (code) => (code.startsWith('99') ? 'SAC' : 'HSN');
const parentOf = (code) => (code.length > 2 ? code.slice(0, -2) : null);
const basisFor = (code) =>
  ({ 2: 'chapter', 4: 'heading', 6: 'subheading', 8: 'item' }[code.length]);

const TRAILING_FILLER = new Set([
  'AND',
  'OR',
  'OF',
  'THE',
  'IN',
  'FOR',
  'WITH',
  'A',
  'AN',
  'TO',
  'ETC',
]);

/** Clean a source description without rewriting words; strips CBIC-style "- -" prefixes. */
function cleanDescription(raw) {
  const text = cleanText(raw);
  if (!text) return null;
  const out = text.replace(/^[\s\-–—:;.,]+/, '').replace(/[\s\-–—:;,]+$/, '');
  return out.length ? out : null;
}

/** Words for prefix comparison: case/punctuation-insensitive, hyphens split words. */
function comparableTokens(text) {
  const out = [];
  const re = /[^\s\-–—]+/g;
  let m;
  while ((m = re.exec(text))) {
    const norm = m[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (norm) out.push({ norm, end: m.index + m[0].length });
  }
  return out;
}

/**
 * Derive a parent description from its leaf descriptions. Tariff-item text in these
 * sources starts with the heading text ("LIVE HORSES, ... HINNIES PURE-BRED ... HORSES"),
 * so the longest word-prefix shared by ≥60% of leaves is a good heading label. A strict
 * common prefix would break on typos in a single leaf, hence the majority vote.
 * Words are compared ignoring case/punctuation ("MILK AND CREAM-FAT" ~ "Milk and cream,"),
 * but the label is cut verbatim from the first matching leaf.
 * Returns null when nothing meaningful (< 2 words) is shared.
 */
function deriveDescription(
  leafDescriptions,
  { quorum = 0.6, maxWords = 30 } = {}
) {
  const leaves = leafDescriptions
    .filter(Boolean)
    .map((text) => ({ text, tokens: comparableTokens(text) }));
  if (!leaves.length) return null;
  const needed = Math.max(1, Math.ceil(leaves.length * quorum));
  const counts = new Map(); // normalised prefix -> { n, words, leaf }
  for (const leaf of leaves) {
    let key = '';
    for (let k = 0; k < Math.min(leaf.tokens.length, maxWords); k += 1) {
      key += `${leaf.tokens[k].norm} `;
      const entry = counts.get(key);
      if (entry) entry.n += 1;
      else
        counts.set(key, { n: 1, words: k + 1, leaf, end: leaf.tokens[k].end });
    }
  }
  let best = null;
  for (const entry of counts.values()) {
    if (entry.n >= needed && (!best || entry.words > best.words)) best = entry;
  }
  if (!best) return null;
  // With a single leaf (common for 6-digit subheadings) this is that leaf's full text —
  // an acceptable label, and the row is marked description_basis = 'derived'.
  let words = best.leaf.text.slice(0, best.end).split(' ');
  while (
    words.length &&
    TRAILING_FILLER.has(
      words[words.length - 1].replace(/[^A-Za-z]/g, '').toUpperCase()
    )
  ) {
    words = words.slice(0, -1);
  }
  const cleaned = cleanDescription(words.join(' '));
  if (!cleaned || cleaned.split(' ').length < 2) return null;
  return cleaned;
}

/**
 * Collapse per-leaf rates to the shortest prefix at which every leaf agrees.
 *
 * Input:  Map<8-digit code, valueKey>  (valueKey encodes rate + cess + validity)
 * Output: [{ code, key }] — one entry per maximal uniform prefix.
 *
 * Invariant: an emitted prefix covers ONLY leaves with that exact key, so a rate stored
 * on a chapter/heading can never silently apply to a leaf with a different (or invalid)
 * source value. catalog.gst_rate() relies on this.
 */
function collapseByPrefix(leafKeys) {
  const keysAt = new Map(); // prefix -> Set(keys) (capped at 2: we only need "uniform or not")
  const children = new Map(); // prefix -> Set(child prefixes)
  for (const [code, key] of leafKeys) {
    for (let len = 2; len <= code.length; len += 2) {
      const prefix = code.slice(0, len);
      let set = keysAt.get(prefix);
      if (!set) keysAt.set(prefix, (set = new Set()));
      if (set.size < 2) set.add(key);
      if (len < code.length) {
        let kids = children.get(prefix);
        if (!kids) children.set(prefix, (kids = new Set()));
        kids.add(code.slice(0, len + 2));
      }
    }
  }
  const out = [];
  const visit = (prefix) => {
    const set = keysAt.get(prefix);
    if (set.size === 1) {
      out.push({ code: prefix, key: [...set][0] });
      return;
    }
    for (const child of [...(children.get(prefix) || [])].sort()) visit(child);
  };
  const chapters = [...keysAt.keys()].filter((p) => p.length === 2).sort();
  for (const ch of chapters) visit(ch);
  return out;
}

module.exports = {
  normalizeHsn,
  normalizeHsnDetailed,
  hsnType,
  parentOf,
  basisFor,
  cleanDescription,
  deriveDescription,
  collapseByPrefix,
};
