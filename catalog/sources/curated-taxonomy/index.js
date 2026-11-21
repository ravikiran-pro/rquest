'use strict';

/**
 * Source: hand-curated taxonomy seeds —
 *   seeds/shop_types.csv            → taxonomy_nodes (scheme shop_type) + shop→ONDC mappings
 *   seeds/taxonomy_mappings.csv     → taxonomy_mappings
 *   seeds/taxonomy_hsn_defaults.csv → taxonomy_hsn_defaults
 * Run after hsn, shopify-taxonomy and ondc-taxonomy: it references their rows and refuses
 * to load if any reference is unknown.
 */

const path = require('path');
const { sha256, sha256File } = require('../../lib/hash');
const { readCsv } = require('../../lib/csv');
const { cleanText } = require('../../lib/text');
const { normalizeHsn } = require('../../lib/hsn');
const { assertActiveReferences } = require('../../lib/loader');
const { siblingNameCollisions } = require('../../lib/taxonomy');

const SOURCE = 'curated-taxonomy';
// Mirrors the template keys in src/api/services/formSchema.js (the pipeline never imports
// app code). If the app adds a template, add it here too.
const FORM_TEMPLATES = new Set([
  'grocery',
  'pharmacy',
  'food',
  'bakery',
  'fashion',
  'electronics',
  'automotive',
  'hardware',
  'services',
  'salon',
  'rentals',
  'books',
  'general',
  'produce',
  'meat_fish',
  'jewellery',
  'health_services',
  'fitness',
  'education',
  'events',
  'venue',
  'professional',
  'property',
  'travel',
  'lodging',
  'vehicles',
  'pets',
]);
const LISTING_TYPES = new Set(['product', 'food', 'service', 'rental']);
const RELATIONS = new Set(['exact', 'broader', 'narrower', 'related']);
const CONFIDENCE = new Set(['exact', 'broad']);
const FILES = [
  'shop_types.csv',
  'taxonomy_mappings.csv',
  'taxonomy_hsn_defaults.csv',
];

const meta = {
  name: SOURCE,
  title:
    'Curated taxonomy seeds (shop types, cross-scheme mappings, default HSN)',
  license: 'Internal',
  transformVersion: 1,
  maxRejectRatio: 0,
};

const assertReferences = (checks) => assertActiveReferences(SOURCE, checks);

const entities = [
  {
    table: 'taxonomy_nodes',
    key: ['id'],
    columns: [
      'id',
      'scheme',
      'external_id',
      'parent_id',
      'name',
      'full_path',
      'level',
      'attributes',
      'extra',
    ],
    scope: "t.scheme = 'shop_type'",
    maxDeactivateRatio: 0.2,
  },
  {
    table: 'taxonomy_mappings',
    key: ['from_id', 'to_id'],
    columns: ['from_id', 'to_id', 'relation', 'source'],
    scope: `t.source = '${SOURCE}'`,
    maxDeactivateRatio: 0.5,
    beforeUpsert: assertReferences([
      { column: 'from_id', table: 'taxonomy_nodes', key: 'id' },
      { column: 'to_id', table: 'taxonomy_nodes', key: 'id' },
    ]),
  },
  {
    table: 'taxonomy_hsn_defaults',
    key: ['node_id'],
    columns: ['node_id', 'hsn_code', 'confidence', 'source', 'note'],
    scope: `t.source = '${SOURCE}'`,
    maxDeactivateRatio: 0.5,
    beforeUpsert: assertReferences([
      { column: 'node_id', table: 'taxonomy_nodes', key: 'id' },
      { column: 'hsn_code', table: 'hsn_codes', key: 'code' },
    ]),
  },
];

async function extract(ctx) {
  const files = FILES.map((f) => path.join(ctx.config.seedDir, f));
  const shas = await Promise.all(files.map((f) => sha256File(f)));
  return {
    version: 'seed',
    inputSha256: sha256(shas.join(':')),
    shopTypes: readCsv(files[0]),
    mappings: readCsv(files[1]),
    hsnDefaults: readCsv(files[2]),
  };
}

const splitList = (v) =>
  v
    ? v
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

function transform(input) {
  const rejects = [];
  const bad = (entity, key, reason, raw) =>
    rejects.push({ entity, source_key: key, reason, raw });

  // Shop types: groups first (parent empty), then types under them.
  const nodes = [];
  const groups = new Map();
  const shopMappings = [];
  for (const r of input.shopTypes) {
    if (!/^[a-z][a-z0-9_]*$/.test(r.key)) {
      bad('taxonomy_nodes', r.key, 'bad_key', r);
      continue;
    }
    const name = cleanText(r.name);
    if (!name) {
      bad('taxonomy_nodes', r.key, 'empty_name', r);
      continue;
    }
    if (!r.parent) {
      groups.set(r.key, name);
      nodes.push({
        id: `shop_type:${r.key}`,
        scheme: 'shop_type',
        external_id: r.key,
        parent_id: null,
        name,
        full_path: name,
        level: 0,
        attributes: [],
        extra: { kind: 'group' },
      });
      continue;
    }
    if (!groups.has(r.parent)) {
      bad('taxonomy_nodes', r.key, `unknown_or_later_parent:${r.parent}`, r);
      continue;
    }
    if (!FORM_TEMPLATES.has(r.form_template)) {
      bad(
        'taxonomy_nodes',
        r.key,
        `unknown_form_template:${r.form_template}`,
        r
      );
      continue;
    }
    if (!LISTING_TYPES.has(r.listing_type)) {
      bad('taxonomy_nodes', r.key, `unknown_listing_type:${r.listing_type}`, r);
      continue;
    }
    const osmTags = splitList(r.osm_tags);
    if (osmTags.some((t) => !/^[a-z_]+=[a-z_]+$/.test(t))) {
      bad('taxonomy_nodes', r.key, 'bad_osm_tag', r);
      continue;
    }
    const domains = splitList(r.ondc_domains);
    nodes.push({
      id: `shop_type:${r.key}`,
      scheme: 'shop_type',
      external_id: r.key,
      parent_id: `shop_type:${r.parent}`,
      name,
      full_path: `${groups.get(r.parent)} > ${name}`,
      level: 1,
      attributes: [],
      extra: {
        kind: 'type',
        osm_tags: osmTags,
        ondc_domains: domains,
        form_template: r.form_template,
        listing_type: r.listing_type,
      },
    });
    for (const d of domains) {
      shopMappings.push({
        from_id: `shop_type:${r.key}`,
        to_id: `ondc:${d}`,
        relation: 'related',
        source: SOURCE,
      });
    }
  }
  const ids = new Set();
  for (const n of nodes) {
    if (ids.has(n.id)) bad('taxonomy_nodes', n.external_id, 'duplicate_key', n);
    ids.add(n.id);
  }

  const mappings = [...shopMappings];
  for (const r of input.mappings) {
    if (!RELATIONS.has(r.relation)) {
      bad(
        'taxonomy_mappings',
        `${r.from_id}>${r.to_id}`,
        `bad_relation:${r.relation}`,
        r
      );
      continue;
    }
    mappings.push({
      from_id: r.from_id,
      to_id: r.to_id,
      relation: r.relation,
      source: SOURCE,
    });
  }

  const defaults = [];
  for (const r of input.hsnDefaults) {
    const code = normalizeHsn(r.hsn_code);
    if (!code) {
      bad('taxonomy_hsn_defaults', r.node_id, 'invalid_hsn_code', r);
      continue;
    }
    if (!CONFIDENCE.has(r.confidence)) {
      bad(
        'taxonomy_hsn_defaults',
        r.node_id,
        `bad_confidence:${r.confidence}`,
        r
      );
      continue;
    }
    defaults.push({
      node_id: r.node_id,
      hsn_code: code,
      confidence: r.confidence,
      source: SOURCE,
      note: cleanText(r.note),
    });
  }

  return {
    entities: {
      taxonomy_nodes: nodes,
      taxonomy_mappings: mappings,
      taxonomy_hsn_defaults: defaults,
    },
    rejects,
    review: siblingNameCollisions(nodes, SOURCE),
    inputCount:
      input.shopTypes.length + input.mappings.length + input.hsnDefaults.length,
    notes: {
      shop_groups: groups.size,
      shop_types: nodes.length - groups.size,
      mappings: mappings.length,
      hsn_defaults: defaults.length,
    },
  };
}

module.exports = { meta, entities, extract, transform };
