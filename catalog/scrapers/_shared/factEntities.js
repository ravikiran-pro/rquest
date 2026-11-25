'use strict';

const { assertActiveReferences } = require('../../lib/loader');

/**
 * Loader spec for a collector that adds attributes to items other sources own
 * (catalog.item_facts, migration 6). Emit rows:
 *   { item_id, attribute_key, value, source, source_url, confidence }
 * `value` is any JSON (a string, number, boolean, list); keys come from the attribute
 * dictionary (seeds/attributes/definitions.json). items_enriched merges the most confident
 * fact per key in under the item's own non-null attributes.
 */
function factEntities(source, { maxDeactivateRatio = 0.2 } = {}) {
  return [
    {
      table: 'item_facts',
      key: ['item_id', 'attribute_key', 'source'],
      columns: ['item_id', 'attribute_key', 'value', 'source', 'source_url', 'confidence'],
      scope: `t.source = '${source}'`,
      maxDeactivateRatio,
      beforeUpsert: assertActiveReferences(source, [{ column: 'item_id', table: 'items', key: 'id' }]),
    },
  ];
}

module.exports = { factEntities };
