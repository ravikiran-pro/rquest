'use strict';

/**
 * Source: hand-verified GST rates from seeds/hsn_rate_overrides.csv.
 * The CSV (and its git history) is the audit trail: who verified what, from which notification.
 */

const path = require('path');
const { sha256File } = require('../../lib/hash');
const { readCsv } = require('../../lib/csv');
const { normalizeHsnDetailed, basisFor } = require('../../lib/hsn');
const { LoadError } = require('../../lib/loader');

const SOURCE = 'hsn-overrides';
const GST2_EFFECTIVE = '2025-09-22';
const GST2_SLABS = new Set([0, 0.1, 0.25, 1.5, 3, 5, 18, 40]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const meta = {
  name: SOURCE,
  title: 'Verified GST rate overrides (seeds/hsn_rate_overrides.csv)',
  license: 'Internal (curated from CBIC notifications)',
  transformVersion: 1,
  maxRejectRatio: 0, // a typo in a hand-verified file must stop the run
};

const entities = [
  {
    table: 'hsn_rates',
    key: ['code', 'effective_from'],
    columns: [
      'code',
      'effective_from',
      'effective_to',
      'igst_rate',
      'cess_rate',
      'basis',
      'verified',
      'source',
      'notification_ref',
    ],
    scope: `t.source = '${SOURCE}'`,
    maxDeactivateRatio: 1, // deleting a line from the CSV is a deliberate act
    beforeUpsert: async (client, staging) => {
      const unknown = await client.query(
        `SELECT s.code FROM ${staging} s
          WHERE NOT EXISTS (SELECT 1 FROM catalog.hsn_codes c WHERE c.code = s.code AND c.is_active)`
      );
      if (unknown.rowCount) {
        throw new LoadError(
          'hsn-overrides: codes not in catalog.hsn_codes (run `hsn` first?)',
          unknown.rows
        );
      }
      // Retire unverified source rates the override supersedes.
      await client.query(
        `UPDATE catalog.hsn_rates t SET is_active = false, updated_at = now()
           FROM ${staging} s
          WHERE t.code = s.code AND t.is_active AND NOT t.verified
            AND t.effective_from <> s.effective_from
            AND daterange(t.effective_from, t.effective_to, '[)') && daterange(s.effective_from, s.effective_to, '[)')`
      );
      return 0;
    },
  },
];

async function extract(ctx) {
  const file = path.join(ctx.config.seedDir, 'hsn_rate_overrides.csv');
  return {
    version: 'seed',
    inputSha256: await sha256File(file),
    rows: readCsv(file),
  };
}

function transform(input) {
  const rejects = [];
  const rows = [];
  const seen = new Set();
  for (const rec of input.rows) {
    const bad = (reason) =>
      rejects.push({
        entity: 'hsn_rates',
        source_key: rec.code,
        reason,
        raw: rec,
      });
    const { code, error } = normalizeHsnDetailed(rec.code);
    if (!code) {
      bad(`invalid_code:${error}`);
      continue;
    }
    if (!ISO_DATE.test(rec.effective_from)) {
      bad('effective_from_not_iso_date');
      continue;
    }
    if (rec.effective_to && !ISO_DATE.test(rec.effective_to)) {
      bad('effective_to_not_iso_date');
      continue;
    }
    if (rec.effective_to && rec.effective_to <= rec.effective_from) {
      bad('effective_to_not_after_from');
      continue;
    }
    const igst = Number(rec.igst_rate);
    const cess = rec.cess_rate === '' ? 0 : Number(rec.cess_rate);
    if (
      rec.igst_rate === '' ||
      !Number.isFinite(igst) ||
      !Number.isFinite(cess)
    ) {
      bad('rate_not_a_number');
      continue;
    }
    if (rec.effective_from >= GST2_EFFECTIVE && !GST2_SLABS.has(igst)) {
      bad(`not_a_gst2_slab:${igst}`);
      continue;
    }
    if (!rec.notification_ref) {
      bad('notification_ref_required');
      continue;
    }
    const key = `${code}|${rec.effective_from}`;
    if (seen.has(key)) {
      bad('duplicate_row');
      continue;
    }
    seen.add(key);
    rows.push({
      code,
      effective_from: rec.effective_from,
      effective_to: rec.effective_to || null,
      igst_rate: igst,
      cess_rate: cess,
      basis: basisFor(code),
      verified: true,
      source: SOURCE,
      notification_ref: rec.notification_ref,
    });
  }
  return {
    entities: { hsn_rates: rows },
    rejects,
    review: [],
    inputCount: input.rows.length,
  };
}

module.exports = { meta, entities, extract, transform };
