'use strict';

/**
 * Source: Shopify Standard Product Taxonomy (MIT), pinned to an exact commit + file hash.
 * Loads every category node (minus seeds/taxonomy_exclusions.csv subtrees) with its
 * attribute handles, plus the attribute dictionary those nodes reference.
 */

const fs = require('fs');
const { downloadPinned, githubRaw } = require('../../lib/pinned');
const { sha256 } = require('../../lib/hash');
const { cleanText } = require('../../lib/text');
const { loadExclusions, excludedBy } = require('../../lib/exclusions');
const { siblingNameCollisions } = require('../../lib/taxonomy');
const path = require('path');

const REPO = 'Shopify/product-taxonomy';
const TAG = 'v2026-10';
const COMMIT = '2ea72664167d1aeccbf32104af81c4aad081a40a';
const FILE = 'dist/en/categories.json';
const FILE_SHA256 =
  'c03450e89fb1d3be9fa3809ac71cec1af936a2b0f0913840f8780a311764f382';

const meta = {
  name: 'shopify-taxonomy',
  title: `Shopify Standard Product Taxonomy ${TAG}`,
  license: 'MIT (Copyright (c) Shopify)',
  attribution:
    'Product categories: Shopify Standard Product Taxonomy (github.com/Shopify/product-taxonomy), MIT License.',
  transformVersion: 1,
  maxRejectRatio: 0.001,
};

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
    scope: "t.scheme = 'shopify'",
    maxDeactivateRatio: 0.05,
  },
  {
    table: 'taxonomy_attributes',
    key: ['id'],
    columns: ['id', 'scheme', 'handle', 'name', 'description'],
    scope: "t.scheme = 'shopify'",
    maxDeactivateRatio: 0.05,
  },
];

const shortId = (gid) => String(gid).split('/').pop();

async function extract(ctx) {
  const file = await downloadPinned(ctx, {
    url: githubRaw(REPO, COMMIT, FILE),
    file: `${COMMIT}/categories.json`,
    sha256: FILE_SHA256,
  });
  const exclusionsFile = path.join(
    ctx.config.seedDir,
    'taxonomy_exclusions.csv'
  );
  return {
    version: `${TAG}@${COMMIT.slice(0, 12)}`,
    inputSha256: sha256(
      `${FILE_SHA256}:${sha256(fs.readFileSync(exclusionsFile))}`
    ),
    data: JSON.parse(fs.readFileSync(file, 'utf8')),
    exclusions: loadExclusions(ctx.config.seedDir, 'shopify'),
  };
}

function transform(input) {
  const rejects = [];
  const nodes = [];
  const attributes = new Map();
  const excludedCount = {};
  let inputCount = 0;

  for (const vertical of input.data.verticals) {
    for (const cat of vertical.categories) {
      inputCount += 1;
      const id = shortId(cat.id);
      const ancestors = (cat.ancestors || []).map((a) => shortId(a.id));
      const excluded = excludedBy(input.exclusions, id, ancestors);
      if (excluded) {
        excludedCount[excluded.root] = (excludedCount[excluded.root] || 0) + 1;
        continue;
      }
      const name = cleanText(cat.name);
      const level = Number(cat.level);
      const parent = cat.parent_id ? shortId(cat.parent_id) : null;
      if (!name || !Number.isInteger(level) || (level === 0) !== !parent) {
        rejects.push({
          entity: 'taxonomy_nodes',
          source_key: id,
          reason: 'malformed_category',
          raw: { id, name: cat.name, level, parent },
        });
        continue;
      }
      const handles = [
        ...new Set((cat.attributes || []).map((a) => a.handle)),
      ].sort();
      for (const a of cat.attributes || []) {
        if (!attributes.has(a.handle)) {
          attributes.set(a.handle, {
            id: `shopify:${a.handle}`,
            scheme: 'shopify',
            handle: a.handle,
            name: cleanText(a.name) || a.handle,
            description: cleanText(a.description),
          });
        }
      }
      nodes.push({
        id: `shopify:${id}`,
        scheme: 'shopify',
        external_id: id,
        parent_id: parent ? `shopify:${parent}` : null,
        name,
        full_path: cleanText(cat.full_name) || name,
        level,
        attributes: handles,
        extra: { vertical: vertical.prefix },
      });
    }
  }

  // Integrity inside the batch: every parent must itself be loaded (an excluded parent
  // would orphan its children — impossible since exclusion is by subtree, but verify).
  // Repeat until stable: dropping an orphan orphans its own children.
  let kept = nodes;
  for (;;) {
    const ids = new Set(kept.map((n) => n.id));
    const orphans = kept.filter((n) => n.parent_id && !ids.has(n.parent_id));
    if (!orphans.length) break;
    for (const o of orphans) {
      rejects.push({
        entity: 'taxonomy_nodes',
        source_key: o.external_id,
        reason: 'parent_not_loaded',
        raw: { parent: o.parent_id },
      });
    }
    const drop = new Set(orphans);
    kept = kept.filter((n) => !drop.has(n));
  }

  return {
    entities: {
      taxonomy_nodes: kept,
      taxonomy_attributes: [...attributes.values()],
    },
    rejects,
    review: siblingNameCollisions(kept, meta.name),
    inputCount,
    notes: {
      taxonomy_version: input.data.version,
      categories_in_file: inputCount,
      excluded_by_rule: excludedCount,
      attributes: attributes.size,
    },
  };
}

module.exports = { meta, entities, extract, transform };
