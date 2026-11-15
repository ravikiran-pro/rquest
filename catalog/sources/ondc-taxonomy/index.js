'use strict';

/**
 * Source: ONDC retail domains (RET10–RET1D) and the RET10 Grocery category list, from the
 * ONDC-Official/ONDC-RET-Specifications enums, pinned to an exact commit + file hashes.
 *
 * The repository carries no LICENSE file. The codes and short labels are used only as
 * protocol identifiers (as any ONDC participant must), with attribution.
 */

const fs = require('fs');
const { downloadPinned, githubRaw } = require('../../lib/pinned');
const { sha256 } = require('../../lib/hash');
const { cleanText } = require('../../lib/text');
const { parseCodeList, siblingNameCollisions } = require('../../lib/taxonomy');

const REPO = 'ONDC-Official/ONDC-RET-Specifications';
const BRANCH = 'release-2.0.2';
const COMMIT = 'aa74e5d8e0543f0b7e943d029a08ec10f8b1c0e3';
const FILES = {
  domains: {
    path: 'api/components/enums/context.yaml',
    sha256: 'c6ef5f4366c345afff73c40b0e23c212f3b29c4b262ce6ca11c6f7851c7f3008',
  },
  categories: {
    path: 'api/components/enums/category.yaml',
    sha256: 'c60356865176d2255def3e47913933920bbb3b675f332b84a98e1acd48323347',
  },
};

// ONDC uses abbreviations for two domains; show the full name, keep the source label.
const DISPLAY = { BPC: 'Beauty & Personal Care', 'F&B': 'Food & Beverage' };

const meta = {
  name: 'ondc-taxonomy',
  title: `ONDC retail domains + Grocery categories (${BRANCH})`,
  license:
    'ONDC open protocol specification (no LICENSE file); codes used as protocol identifiers',
  attribution:
    'Domain and category codes: ONDC Retail Specifications (github.com/ONDC-Official/ONDC-RET-Specifications).',
  transformVersion: 1,
  maxRejectRatio: 0,
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
    scope: "t.scheme = 'ondc'",
    maxDeactivateRatio: 0.05,
  },
];

async function extract(ctx) {
  const out = {};
  for (const [key, f] of Object.entries(FILES)) {
    const file = await downloadPinned(ctx, {
      url: githubRaw(REPO, COMMIT, f.path),
      file: `${COMMIT}/${f.path.split('/').pop()}`,
      sha256: f.sha256,
    });
    out[key] = fs.readFileSync(file, 'utf8');
  }
  return {
    version: `${BRANCH}@${COMMIT.slice(0, 12)}`,
    inputSha256: sha256(`${FILES.domains.sha256}:${FILES.categories.sha256}`),
    domains: parseCodeList(out.domains, 'domain'),
    categories: parseCodeList(out.categories, 'category_ids'),
  };
}

function transform(input) {
  const rejects = [];
  const nodes = [];
  const domains = new Map();

  for (const d of input.domains) {
    const code = d.code.replace(/^ONDC:/, '');
    if (!/^RET1[0-9A-Z]$/.test(code)) {
      rejects.push({
        entity: 'taxonomy_nodes',
        source_key: d.code,
        reason: 'not_a_retail_domain_code',
        raw: d,
      });
      continue;
    }
    const label = cleanText(d.description);
    const name = DISPLAY[label] || label;
    domains.set(code, name);
    nodes.push({
      id: `ondc:${code}`,
      scheme: 'ondc',
      external_id: code,
      parent_id: null,
      name,
      full_path: name,
      level: 0,
      attributes: [],
      extra: { kind: 'domain', ondc_code: `ONDC:${code}`, source_label: label },
    });
  }

  const seen = new Set();
  for (const c of input.categories) {
    const m = c.code.match(/^(RET1[0-9A-Z])-([0-9A-F]{4})$/);
    if (!m || !domains.has(m[1])) {
      rejects.push({
        entity: 'taxonomy_nodes',
        source_key: c.code,
        reason: 'category_code_without_known_domain',
        raw: c,
      });
      continue;
    }
    if (seen.has(c.code)) {
      rejects.push({
        entity: 'taxonomy_nodes',
        source_key: c.code,
        reason: 'duplicate_code',
        raw: c,
      });
      continue;
    }
    seen.add(c.code);
    const name = cleanText(c.description);
    nodes.push({
      id: `ondc:${c.code}`,
      scheme: 'ondc',
      external_id: c.code,
      parent_id: `ondc:${m[1]}`,
      name,
      full_path: `${domains.get(m[1])} > ${name}`,
      level: 1,
      attributes: [],
      extra: { kind: 'category', domain: m[1] },
    });
  }

  return {
    entities: { taxonomy_nodes: nodes },
    rejects,
    review: siblingNameCollisions(nodes, meta.name),
    inputCount: input.domains.length + input.categories.length,
    notes: { domains: domains.size, categories: nodes.length - domains.size },
  };
}

module.exports = { meta, entities, extract, transform };
