'use strict';

const { readRecords } = require('../../lib/collect/records');

/**
 * A pipeline source over a scraper's collected records, so collected data goes through the
 * normal loader (dedupe by deterministic ids, ownership, deactivation, snapshots):
 *
 *   recordSource({ meta, entities, transform(records, ctx) })
 *
 * extract() reads collect_records for meta.name; transform receives the records
 * ([{ record_key, source_url, payload, last_seen }]) and returns the usual
 * { entities, rejects, review, inputCount, notes }.
 */
function recordSource({ meta, entities, transform, extra }) {
  return {
    meta,
    entities,
    async extract(ctx) {
      const { records, inputSha256 } = await readRecords(ctx.db, meta.name);
      const more = extra ? await extra(ctx) : {};
      return { version: `records-${records.length}`, inputSha256, records, ...more };
    },
    transform(input, ctx) {
      return transform(input.records, { ...ctx, input });
    },
  };
}

module.exports = { recordSource };
