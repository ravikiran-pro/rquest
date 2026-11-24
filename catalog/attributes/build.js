'use strict';

/**
 * Merge attributes/research/*.json into:
 *   seeds/attributes/definitions.json   attribute dictionary (catalog source attribute-sets)
 *   seeds/attributes/sets.json          attribute set per sub-category
 *   ../src/api/data/attributeSets.json  what the app needs: basic form, variant axes, full set
 *   attributes/build/report.md          conflicts, near-duplicates, coverage, open questions
 *
 * Rules (see SPEC.md):
 *   - attributes/aliases.json maps duplicate keys to the canonical key before merging.
 *   - R5 (statutory research) wins on level; a statutory attribute is never downgraded.
 *   - A definition's type/unit comes from the first file that defines it (R5 first, then
 *     R1..R4); differing types are reported. Values and sources are unioned.
 *   - Every statutory store-owned attribute joins the basic form; the basic form keeps the
 *     category agent's order and is capped at MAX_BASIC fields (statutory ones always kept).
 *
 * Usage: node attributes/build.js [--check]   (--check: exit 1 when there are errors)
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const RESEARCH = path.join(ROOT, 'research');
const SEED_DIR = path.join(ROOT, '..', 'seeds', 'attributes');
const APP_EXPORT = path.join(ROOT, '..', '..', 'src', 'api', 'data', 'attributeSets.json');
const REPORT = path.join(ROOT, 'build', 'report.md');
const SUBS = JSON.parse(fs.readFileSync(path.join(ROOT, 'inputs', 'sub_categories.json'), 'utf8'));
const ALIASES_FILE = path.join(ROOT, 'aliases.json');
const ALIASES = fs.existsSync(ALIASES_FILE) ? JSON.parse(fs.readFileSync(ALIASES_FILE, 'utf8')) : {};

const MAX_BASIC = 6;
const MAX_AXES = 3;
const LEVEL_RANK = { statutory: 4, required: 3, recommended: 2, optional: 1 };
// Listing columns: never attributes (SPEC.md)
const COLUMNS = new Set([
  'name', 'description', 'price', 'mrp', 'unit', 'img_url', 'is_available', 'stock_qty',
  'stock_mode', 'low_stock_threshold', 'listing_type', 'section', 'category', 'sub_category',
]);

const canon = (key) => {
  let k = String(key || '').trim();
  const seen = new Set();
  while (ALIASES[k] && !seen.has(k)) {
    seen.add(k);
    k = ALIASES[k];
  }
  return k;
};

const files = fs
  .readdirSync(RESEARCH)
  .filter((f) => /^R\d+\.json$/.test(f))
  .sort((a, b) => (a === 'R5.json' ? -1 : b === 'R5.json' ? 1 : a.localeCompare(b)));

const errors = [];
const warnings = [];
const openQuestions = [];
const defs = {};
const defOrigin = {};
const sets = {};

for (const file of files) {
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(path.join(RESEARCH, file), 'utf8'));
  } catch (e) {
    errors.push(`${file}: invalid JSON (${e.message})`);
    continue;
  }
  const agent = doc.agent || file.replace('.json', '');
  for (const q of doc.open_questions || []) openQuestions.push(`${agent}: ${typeof q === 'string' ? q : JSON.stringify(q)}`);

  for (const [rawKey, d] of Object.entries(doc.attributes || {})) {
    const key = canon(rawKey);
    if (COLUMNS.has(key)) {
      warnings.push(`${agent}: "${rawKey}" is a listing column, skipped`);
      continue;
    }
    if (!defs[key]) {
      defs[key] = {
        label: d.label,
        type: d.type,
        unit_family: d.unit_family || null,
        default_unit: d.default_unit || null,
        values: [...(d.values || [])],
        open_values: Boolean(d.open_values),
        description: d.description || null,
        shopify_handle: d.shopify_handle || null,
        ondc_attribute: d.ondc_attribute || null,
        sources: [...(d.sources || [])],
      };
      defOrigin[key] = agent;
      continue;
    }
    const cur = defs[key];
    if (d.type && d.type !== cur.type) {
      warnings.push(`type conflict "${key}": ${defOrigin[key]}=${cur.type}, ${agent}=${d.type} (kept ${cur.type})`);
    }
    for (const v of d.values || []) if (!cur.values.includes(v)) cur.values.push(v);
    cur.open_values = cur.open_values || Boolean(d.open_values);
    const seenSrc = new Set(cur.sources.map((s) => `${s.kind}|${s.ref}|${s.url}`));
    for (const s of d.sources || []) if (!seenSrc.has(`${s.kind}|${s.ref}|${s.url}`)) cur.sources.push(s);
    cur.shopify_handle = cur.shopify_handle || d.shopify_handle || null;
    cur.ondc_attribute = cur.ondc_attribute || d.ondc_attribute || null;
    cur.description = cur.description || d.description || null;
  }

  for (const [subKey, s] of Object.entries(doc.sub_categories || {})) {
    const entry = (sets[subKey] = sets[subKey] || {
      applies_to: null,
      attributes: new Map(),
      variant_axes: null,
      variant_notes: null,
      basic_form: null,
      basic_form_reason: null,
    });
    const isLaw = agent === 'R5';
    if (!isLaw) {
      entry.applies_to = s.applies_to || entry.applies_to;
      if (Array.isArray(s.variant_axes)) entry.variant_axes = s.variant_axes.map(canon);
      entry.variant_notes = s.variant_notes || entry.variant_notes;
      if (Array.isArray(s.basic_form)) entry.basic_form = s.basic_form.map(canon);
      entry.basic_form_reason = s.basic_form_reason || entry.basic_form_reason;
    }
    for (const a of s.attributes || []) {
      const key = canon(a.key);
      if (COLUMNS.has(key)) continue;
      const prev = entry.attributes.get(key);
      const next = { ...a, key };
      if (!prev) {
        entry.attributes.set(key, next);
        continue;
      }
      // Keep the stronger level; law research decides ownership of statutory rows
      if ((LEVEL_RANK[next.level] || 0) > (LEVEL_RANK[prev.level] || 0)) prev.level = next.level;
      if (isLaw && next.owner) prev.owner = next.owner;
      prev.per_variant = prev.per_variant || Boolean(next.per_variant);
      prev.filterable = prev.filterable || Boolean(next.filterable);
      prev.note = prev.note || next.note;
    }
  }
}

// ── Validate and finalise ─────────────────────────────────────────────────────────────
const subKeys = SUBS.map((s) => s.key);
const outSets = {};
const coverage = [];
for (const key of subKeys) {
  const s = sets[key];
  if (!s || !s.attributes.size) {
    errors.push(`sub-category "${key}" has no research`);
    continue;
  }
  const attrs = [...s.attributes.values()];
  for (const a of attrs) {
    if (!defs[a.key]) errors.push(`${key}: attribute "${a.key}" is not defined`);
    if (!LEVEL_RANK[a.level]) errors.push(`${key}.${a.key}: bad level "${a.level}"`);
    if (!['catalog', 'store'].includes(a.owner)) errors.push(`${key}.${a.key}: bad owner "${a.owner}"`);
  }
  let axes = (s.variant_axes || []).filter((k) => s.attributes.has(k));
  for (const k of s.variant_axes || []) if (!s.attributes.has(k)) errors.push(`${key}: variant axis "${k}" not in its attribute set`);
  if (axes.length > MAX_AXES) {
    warnings.push(`${key}: ${axes.length} variant axes, kept the first ${MAX_AXES}`);
    axes = axes.slice(0, MAX_AXES);
  }
  const statutoryStore = attrs.filter((a) => a.level === 'statutory' && a.owner === 'store').map((a) => a.key);
  const basicIn = (s.basic_form || []).filter((k) => s.attributes.has(k));
  for (const k of s.basic_form || []) if (!s.attributes.has(k)) errors.push(`${key}: basic field "${k}" not in its attribute set`);
  if (!s.basic_form) errors.push(`${key}: no basic_form from its category agent`);
  // Statutory store fields first, then the agent's picks, capped
  const basic = [...new Set([...statutoryStore, ...basicIn])];
  const capped = basic.filter((k, i) => statutoryStore.includes(k) || i < MAX_BASIC);
  if (capped.length < basic.length) warnings.push(`${key}: basic form trimmed from ${basic.length} to ${capped.length}`);
  for (const a of attrs) {
    const d = defs[a.key];
    if (a.level === 'statutory' && d && !(d.sources || []).some((src) => src.kind === 'law' || src.kind === 'regulator' || src.kind === 'bis')) {
      warnings.push(`${key}.${a.key}: statutory without a law/regulator/BIS citation`);
    }
  }
  outSets[key] = {
    applies_to: s.applies_to,
    variant_axes: axes,
    variant_notes: s.variant_notes,
    basic_form: capped,
    basic_form_reason: s.basic_form_reason,
    attributes: attrs.map((a) => ({
      key: a.key,
      level: a.level,
      owner: a.owner,
      per_variant: axes.includes(a.key) || Boolean(a.per_variant),
      filterable: Boolean(a.filterable),
      note: a.note || null,
    })),
  };
  coverage.push({
    key,
    total: attrs.length,
    statutory: attrs.filter((a) => a.level === 'statutory').length,
    axes: axes.join(', ') || '—',
    basic: capped.join(', '),
  });
}
for (const k of Object.keys(sets)) if (!subKeys.includes(k)) warnings.push(`unknown sub-category "${k}" in research, ignored`);

// Unverified citations and near-duplicate keys for the critic
const unverified = [];
for (const [k, d] of Object.entries(defs)) {
  for (const s of d.sources || []) if (s.verified === false) unverified.push(`${k}: ${s.ref || ''} ${s.url || ''}`.trim());
  if (!(d.sources || []).length) warnings.push(`attribute "${k}" has no source`);
}
const norm = (l) => String(l || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\b(no|number|num|the|of|and)\b/g, '').replace(/\s+/g, ' ').trim();
const byLabel = {};
for (const [k, d] of Object.entries(defs)) (byLabel[norm(d.label)] = byLabel[norm(d.label)] || []).push(k);
const nearDupes = Object.entries(byLabel).filter(([, ks]) => ks.length > 1);

// Only keep definitions that some set uses
const used = new Set(Object.values(outSets).flatMap((s) => s.attributes.map((a) => a.key)));
const outDefs = Object.fromEntries(Object.entries(defs).filter(([k]) => used.has(k)).sort(([a], [b]) => a.localeCompare(b)));

fs.mkdirSync(SEED_DIR, { recursive: true });
fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(path.join(SEED_DIR, 'definitions.json'), JSON.stringify(outDefs, null, 1) + '\n');
fs.writeFileSync(path.join(SEED_DIR, 'sets.json'), JSON.stringify(outSets, null, 1) + '\n');

// App export: field definitions the app can render, per sub-category
const appExport = {
  generated_by: 'catalog/attributes/build.js',
  definitions: Object.fromEntries(
    Object.entries(outDefs).map(([k, d]) => [k, { label: d.label, type: d.type, unit_family: d.unit_family, default_unit: d.default_unit, values: d.values, open_values: d.open_values, description: d.description }])
  ),
  sub_categories: Object.fromEntries(
    Object.entries(outSets).map(([k, s]) => [k, { variant_axes: s.variant_axes, basic_form: s.basic_form, attributes: s.attributes.map(({ key, level, owner, per_variant, filterable }) => ({ key, level, owner, per_variant, filterable })) }])
  ),
};
fs.writeFileSync(APP_EXPORT, JSON.stringify(appExport, null, 1) + '\n');

const lines = [
  '# Attribute build report',
  '',
  `Files: ${files.join(', ') || 'none'}  ·  attributes: ${Object.keys(outDefs).length}  ·  sub-categories: ${Object.keys(outSets).length}/${subKeys.length}  ·  set rows: ${Object.values(outSets).reduce((n, s) => n + s.attributes.length, 0)}`,
  '',
  `## Errors (${errors.length})`,
  ...errors.map((e) => `- ${e}`),
  '',
  `## Warnings (${warnings.length})`,
  ...warnings.map((w) => `- ${w}`),
  '',
  `## Possible duplicate keys (${nearDupes.length}) — add to aliases.json`,
  ...nearDupes.map(([l, ks]) => `- "${l}": ${ks.join(', ')}`),
  '',
  `## Unverified citations (${unverified.length})`,
  ...unverified.map((u) => `- ${u}`),
  '',
  `## Open questions (${openQuestions.length})`,
  ...openQuestions.map((q) => `- ${q}`),
  '',
  '## Coverage',
  '',
  '| sub-category | attributes | statutory | variant axes | basic form |',
  '|---|---|---|---|---|',
  ...coverage.map((c) => `| ${c.key} | ${c.total} | ${c.statutory} | ${c.axes} | ${c.basic} |`),
  '',
];
fs.writeFileSync(REPORT, lines.join('\n'));

console.log(`attributes ${Object.keys(outDefs).length}, sub-categories ${Object.keys(outSets).length}/${subKeys.length}, errors ${errors.length}, warnings ${warnings.length}, near-duplicates ${nearDupes.length}, unverified ${unverified.length}`);
if (process.argv.includes('--check') && errors.length) process.exit(1);
