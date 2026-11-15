'use strict';

const { assertActiveReferences } = require('./loader');

const ITEM_COLUMNS = [
  'id',
  'gtin',
  'kind',
  'name',
  'name_key',
  'brand_key',
  'net_quantity',
  'unit',
  'quantity_text',
  'taxonomy_node_id',
  'classification_basis',
  'hsn_code',
  'country_of_origin',
  'manufacturer',
  'image_url',
  'attributes',
  'dedupe_key',
  'status',
  'quality_score',
  'primary_source',
];

/**
 * Loader specs for any source that produces products: brands → items → item_sources.
 * The rules are identical for every product source:
 *  - a source only changes items it owns (primary_source), never verified/rejected items;
 *  - an item is deactivated only if no other source still provides it;
 *  - brands are shared reference data and are never auto-deactivated.
 */
function itemEntities(source, { maxDeactivateRatio = 0.05 } = {}) {
  const owns = `t.primary_source = '${source}'`;
  return [
    {
      table: 'brands',
      key: ['brand_key'],
      columns: ['brand_key', 'name', 'aliases', 'source'],
      scope: 'false',
      protect: `t.source = '${source}'`,
    },
    {
      table: 'items',
      key: ['id'],
      columns: ITEM_COLUMNS,
      scope:
        `${owns} AND NOT EXISTS (SELECT 1 FROM catalog.item_sources s ` +
        `WHERE s.item_id = t.id AND s.source <> '${source}' AND s.is_active)`,
      protect: `${owns} AND t.status NOT IN ('verified', 'rejected')`,
      maxDeactivateRatio,
      beforeUpsert: assertActiveReferences(source, [
        { column: 'taxonomy_node_id', table: 'taxonomy_nodes', key: 'id' },
        { column: 'hsn_code', table: 'hsn_codes', key: 'code' },
      ]),
    },
    {
      table: 'item_sources',
      key: ['source', 'source_id'],
      columns: [
        'source',
        'source_id',
        'item_id',
        'license',
        'source_url',
        'source_modified_at',
        'raw',
      ],
      scope: `t.source = '${source}'`,
      maxDeactivateRatio,
    },
  ];
}

module.exports = { itemEntities, ITEM_COLUMNS };
