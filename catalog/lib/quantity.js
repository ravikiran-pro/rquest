'use strict';

/**
 * Net-quantity parsing. Everything becomes one of three base units — g, ml, pc — so pack sizes
 * compare ("1 kg" = "1000 g") and dedupe keys are stable. Legal Metrology requires net
 * quantity on e-commerce listings, which makes this a required catalog field, not decoration.
 */

const UNITS = {
  // mass → g
  mg: ['g', 0.001],
  g: ['g', 1],
  gm: ['g', 1],
  gms: ['g', 1],
  gr: ['g', 1],
  gram: ['g', 1],
  grams: ['g', 1],
  gramme: ['g', 1],
  kg: ['g', 1000],
  kgs: ['g', 1000],
  kilo: ['g', 1000],
  kilogram: ['g', 1000],
  kilograms: ['g', 1000],
  oz: ['g', 28.3495],
  lb: ['g', 453.592],
  lbs: ['g', 453.592],
  // volume → ml
  ml: ['ml', 1],
  mls: ['ml', 1],
  millilitre: ['ml', 1],
  milliliter: ['ml', 1],
  cl: ['ml', 10],
  l: ['ml', 1000],
  lt: ['ml', 1000],
  ltr: ['ml', 1000],
  ltrs: ['ml', 1000],
  litre: ['ml', 1000],
  liter: ['ml', 1000],
  litres: ['ml', 1000],
  liters: ['ml', 1000],
  'fl oz': ['ml', 29.5735],
  floz: ['ml', 29.5735],
  // count → pc
  pc: ['pc', 1],
  pcs: ['pc', 1],
  piece: ['pc', 1],
  pieces: ['pc', 1],
  n: ['pc', 1],
  nos: ['pc', 1],
  no: ['pc', 1],
  units: ['pc', 1],
  unit: ['pc', 1],
  tablets: ['pc', 1],
  tablet: ['pc', 1],
  tabs: ['pc', 1],
  capsules: ['pc', 1],
  capsule: ['pc', 1],
  sachets: ['pc', 1],
  sachet: ['pc', 1],
  bags: ['pc', 1],
  sticks: ['pc', 1],
  count: ['pc', 1],
  ct: ['pc', 1],
};
const UNIT_RE = Object.keys(UNITS)
  .sort((a, b) => b.length - a.length)
  .map((u) => u.replace(' ', '\\s*'))
  .join('|');
const NUM = '(\\d+(?:[.,]\\d+)?|\\d{1,3}(?:,\\d{3})+)';
// "2 x 200 g", "2x200g", "200 g x 2", "200g", "1.5 kg", "Pack of 6", "6 pcs"
const MULTI_A = new RegExp(`(\\d+)\\s*[x×*]\\s*${NUM}\\s*(${UNIT_RE})\\b`, 'i');
const MULTI_B = new RegExp(`${NUM}\\s*(${UNIT_RE})\\s*[x×*]\\s*(\\d+)\\b`, 'i');
const SINGLE = new RegExp(`${NUM}\\s*(${UNIT_RE})(?![a-z])`, 'i');
const PACK_OF = /\bpack\s+of\s+(\d+)\b/i;

const toNumber = (s) => {
  const t = String(s);
  // "1,000" thousands separator vs "1,5" decimal comma
  if (/^\d{1,3}(,\d{3})+$/.test(t)) return Number(t.replace(/,/g, ''));
  return Number(t.replace(',', '.'));
};

const round = (v) => Math.round(v * 1000) / 1000;

function build(count, value, unitRaw) {
  const def =
    UNITS[unitRaw.toLowerCase().replace(/\s+/g, ' ')] ||
    UNITS[unitRaw.toLowerCase().replace(/\s+/g, '')];
  if (!def) return null;
  const total = round(count * value * def[1]);
  if (!(total > 0) || total > 1e7) return null;
  return { value: total, unit: def[0], packCount: count > 1 ? count : null };
}

/** @returns {{ value: number, unit: 'g'|'ml'|'pc', packCount: number|null } | null} */
function parseQuantity(text) {
  if (!text) return null;
  const s = String(text).replace(/\u00A0/g, ' ');
  let m = s.match(MULTI_A);
  if (m) return build(Number(m[1]), toNumber(m[2]), m[3]);
  m = s.match(MULTI_B);
  if (m) return build(Number(m[3]), toNumber(m[1]), m[2]);
  m = s.match(SINGLE);
  if (m) return build(1, toNumber(m[1]), m[2]);
  m = s.match(PACK_OF);
  if (m) return build(1, Number(m[1]), 'pc');
  return null;
}

/** Product names often end with the pack size ("Amul Butter 500g"): split it off. */
const TRAILING = new RegExp(
  `[\\s,(\\-–]*(?:(\\d+)\\s*[x×*]\\s*)?${NUM}\\s*(${UNIT_RE})(?:\\s*[x×*]\\s*\\d+)?[)\\s]*$`,
  'i'
);
function splitTrailingQuantity(name) {
  if (!name) return { name, quantity: null };
  const m = String(name).match(TRAILING);
  if (!m || m.index === 0) return { name, quantity: null };
  const quantity = parseQuantity(m[0]);
  if (!quantity) return { name, quantity: null };
  return { name: name.slice(0, m.index).trim(), quantity };
}

/** Human form for display: 1000 g → "1 kg", 500 ml → "500 ml". */
function formatQuantity(q) {
  if (!q) return null;
  if (q.unit === 'g' && q.value >= 1000) return `${round(q.value / 1000)} kg`;
  if (q.unit === 'ml' && q.value >= 1000) return `${round(q.value / 1000)} l`;
  return `${q.value} ${q.unit}`;
}

module.exports = { parseQuantity, splitTrailingQuantity, formatQuantity };
