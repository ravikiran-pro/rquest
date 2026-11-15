'use strict';

/**
 * Source: hand-curated catalog items no open dataset provides —
 *   seeds/produce.csv   loose produce & staples (no barcode, no brand, searched by local names)
 *   seeds/services.csv  local services → scheme "service" taxonomy + SAC defaults + service items
 * Run after hsn, ondc-taxonomy and curated-taxonomy.
 */

const path = require('path');
const { sha256, sha256File } = require('../../lib/hash');
const { readCsv } = require('../../lib/csv');
const { cleanText, nameKey } = require('../../lib/text');
const { normalizeHsn } = require('../../lib/hsn');
const { formatQuantity } = require('../../lib/quantity');
const { itemEntities } = require('../../lib/itemEntities');
const { assertActiveReferences, LoadError } = require('../../lib/loader');

const NAME = 'curated-items';
const LICENSE = 'Internal (curated)';
const SOLD_BY = {
  kg: { value: 1000, unit: 'g', label: '1 kg' },
  g250: { value: 250, unit: 'g', label: '250 g' },
  l: { value: 1000, unit: 'ml', label: '1 l' },
  pc: { value: 1, unit: 'pc', label: '1 pc' },
  dozen: { value: 12, unit: 'pc', label: '1 dozen' },
  bunch: { value: 1, unit: 'pc', label: '1 bunch' },
};
const BILLING = new Set([
  'visit',
  'hour',
  'job',
  'piece',
  'kg',
  'month',
  'session',
  'day',
  'trip',
]);
const KEY = /^[a-z][a-z0-9_-]*$/;

const meta = {
  name: NAME,
  title: 'Curated loose produce, staples and local services',
  license: LICENSE,
  transformVersion: 1,
  maxRejectRatio: 0,
};

const [brandsSpec, itemsSpec, itemSourcesSpec] = itemEntities(NAME, {
  maxDeactivateRatio: 0.2,
});

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
    scope: "t.scheme = 'service'",
    maxDeactivateRatio: 0.2,
    beforeUpsert: async (client, staging) => {
      const bad = await client.query(
        `SELECT s.id, s.extra->>'shop_type' AS shop_type FROM ${staging} s
          WHERE s.extra->>'shop_type' IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM catalog.taxonomy_nodes n
                             WHERE n.id = 'shop_type:' || (s.extra->>'shop_type') AND n.is_active)`
      );
      if (bad.rowCount)
        throw new LoadError(
          `${NAME}: services reference unknown shop types`,
          bad.rows
        );
      return 0;
    },
  },
  {
    table: 'taxonomy_hsn_defaults',
    key: ['node_id'],
    columns: ['node_id', 'hsn_code', 'confidence', 'source', 'note'],
    scope: `t.source = '${NAME}'`,
    maxDeactivateRatio: 0.2,
    beforeUpsert: assertActiveReferences(NAME, [
      { column: 'node_id', table: 'taxonomy_nodes', key: 'id' },
      { column: 'hsn_code', table: 'hsn_codes', key: 'code' },
    ]),
  },
  brandsSpec,
  itemsSpec,
  itemSourcesSpec,
];

async function extract(ctx) {
  const files = ['produce.csv', 'services.csv'].map((f) =>
    path.join(ctx.config.seedDir, f)
  );
  const shas = await Promise.all(files.map(sha256File));
  return {
    version: 'seed',
    inputSha256: sha256(shas.join(':')),
    produce: readCsv(files[0]),
    services: readCsv(files[1]),
  };
}

function transform(input) {
  const rejects = [];
  const bad = (key, reason, raw) =>
    rejects.push({ entity: 'items', source_key: key, reason, raw });
  const nodes = [];
  const defaults = [];
  const items = [];
  const itemSources = [];
  const seen = new Set();
  const addItem = (item, raw) => {
    items.push(item);
    itemSources.push({
      source: NAME,
      source_id: item.id.slice(`src:${NAME}:`.length),
      item_id: item.id,
      license: LICENSE,
      source_url: null,
      source_modified_at: null,
      raw,
    });
  };

  for (const r of input.produce) {
    const name = cleanText(r.name);
    const sold = SOLD_BY[r.sold_by];
    if (!KEY.test(r.key) || seen.has(r.key)) {
      bad(r.key, 'bad_or_duplicate_key', r);
      continue;
    }
    if (!name) {
      bad(r.key, 'empty_name', r);
      continue;
    }
    if (!sold) {
      bad(r.key, `bad_sold_by:${r.sold_by}`, r);
      continue;
    }
    if (!/^ondc:RET1[0-9A-Z](-[0-9A-F]{4})?$/.test(r.node_id)) {
      bad(r.key, 'bad_node_id', r);
      continue;
    }
    seen.add(r.key);
    addItem(
      {
        id: `src:${NAME}:${r.key}`,
        gtin: null,
        kind: 'product',
        name,
        name_key: nameKey(name),
        brand_key: null,
        net_quantity: sold.value,
        unit: sold.unit,
        quantity_text: sold.label || formatQuantity(sold),
        taxonomy_node_id: r.node_id,
        classification_basis: 'curated',
        hsn_code: null,
        country_of_origin: null,
        manufacturer: null,
        image_url: null,
        attributes: {
          loose: true,
          sold_by: r.sold_by,
          aliases: (r.aliases || '')
            .split(';')
            .map((a) => cleanText(a))
            .filter(Boolean),
        },
        dedupe_key: null,
        status: 'ready',
        quality_score: 100,
        primary_source: NAME,
      },
      r
    );
  }

  const groups = new Map();
  for (const r of input.services) {
    const name = cleanText(r.name);
    if (!KEY.test(r.key) || seen.has(`svc-${r.key}`) || groups.has(r.key)) {
      bad(r.key, 'bad_or_duplicate_key', r);
      continue;
    }
    if (!name) {
      bad(r.key, 'empty_name', r);
      continue;
    }
    if (!r.group) {
      groups.set(r.key, name);
      nodes.push({
        id: `service:${r.key}`,
        scheme: 'service',
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
    const sac = normalizeHsn(r.sac_code);
    if (!groups.has(r.group)) {
      bad(r.key, `unknown_or_later_group:${r.group}`, r);
      continue;
    }
    if (!sac || !sac.startsWith('99')) {
      bad(r.key, 'sac_code_must_be_a_99xx_services_code', r);
      continue;
    }
    if (!BILLING.has(r.billing_unit)) {
      bad(r.key, `bad_billing_unit:${r.billing_unit}`, r);
      continue;
    }
    seen.add(`svc-${r.key}`);
    const nodeId = `service:${r.key}`;
    nodes.push({
      id: nodeId,
      scheme: 'service',
      external_id: r.key,
      parent_id: `service:${r.group}`,
      name,
      full_path: `${groups.get(r.group)} > ${name}`,
      level: 1,
      attributes: [],
      extra: {
        kind: 'service',
        billing_unit: r.billing_unit,
        shop_type: r.shop_type || null,
      },
    });
    defaults.push({
      node_id: nodeId,
      hsn_code: sac,
      confidence: sac.length === 6 ? 'exact' : 'broad',
      source: NAME,
      note: null,
    });
    addItem(
      {
        id: `src:${NAME}:svc-${r.key}`,
        gtin: null,
        kind: 'service',
        name,
        name_key: nameKey(name),
        brand_key: null,
        net_quantity: null,
        unit: null,
        quantity_text: null,
        taxonomy_node_id: nodeId,
        classification_basis: 'curated',
        hsn_code: null,
        country_of_origin: null,
        manufacturer: null,
        image_url: null,
        attributes: {
          billing_unit: r.billing_unit,
          shop_type: r.shop_type || null,
        },
        dedupe_key: null,
        status: 'ready',
        quality_score: 100,
        primary_source: NAME,
      },
      r
    );
  }

  return {
    entities: {
      taxonomy_nodes: nodes,
      taxonomy_hsn_defaults: defaults,
      brands: [],
      items,
      item_sources: itemSources,
    },
    rejects,
    review: [],
    inputCount: input.produce.length + input.services.length,
    notes: {
      produce_items: input.produce.length,
      service_groups: groups.size,
      services: defaults.length,
    },
  };
}

module.exports = { meta, entities, extract, transform };
