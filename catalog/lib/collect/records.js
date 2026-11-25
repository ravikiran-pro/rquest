'use strict';

const { sha256 } = require('../hash');

/**
 * collect_records: what scrapers found. Upsert by (scraper, record_key); a record whose
 * payload did not change only gets last_seen bumped.
 */
const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, stable(value[k])]));
  }
  return value;
};
const hashPayload = (payload) => sha256(JSON.stringify(stable(payload)));

async function saveRecords(client, scraper, jobId, records) {
  const out = { inserted: 0, changed: 0, unchanged: 0 };
  for (const r of records || []) {
    if (!r || !r.key || !r.payload || typeof r.payload !== 'object') continue;
    const hash = hashPayload(r.payload);
    const { rows } = await client.query(
      `INSERT INTO catalog.collect_records (scraper, record_key, job_id, source_url, payload, content_hash)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       ON CONFLICT (scraper, record_key) DO UPDATE
         SET last_seen = now(), job_id = EXCLUDED.job_id, source_url = EXCLUDED.source_url,
             payload = CASE WHEN collect_records.content_hash = EXCLUDED.content_hash THEN collect_records.payload ELSE EXCLUDED.payload END,
             changed_at = CASE WHEN collect_records.content_hash = EXCLUDED.content_hash THEN collect_records.changed_at ELSE now() END,
             content_hash = EXCLUDED.content_hash
       RETURNING (xmax = 0) AS inserted, changed_at = now() AS changed`,
      [scraper, String(r.key).slice(0, 500), jobId || null, r.url || null, JSON.stringify(r.payload), hash]
    );
    if (rows[0].inserted) out.inserted += 1;
    else if (rows[0].changed) out.changed += 1;
    else out.unchanged += 1;
  }
  return out;
}

/**
 * Every record of a scraper, for its source's extract: { records, inputSha256 }.
 * inputSha256 changes only when a record is added, removed or changed, so an unchanged
 * collection makes `node cli.js run <source>` a no-op (the loader's skip check).
 */
async function readRecords(client, scraper) {
  const { rows } = await client.query(
    `SELECT record_key, source_url, payload, content_hash, last_seen
       FROM catalog.collect_records WHERE scraper = $1 ORDER BY record_key`,
    [scraper]
  );
  return {
    records: rows,
    inputSha256: sha256(rows.map((r) => `${r.record_key}:${r.content_hash}`).join('\n')),
  };
}

module.exports = { saveRecords, readRecords, hashPayload };
