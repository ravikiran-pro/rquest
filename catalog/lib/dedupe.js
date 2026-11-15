'use strict';

const { syncReview } = require('./loader');

/**
 * Find probable duplicate items and put them in the review queue (never merges by itself).
 *
 * Exact duplicates are already impossible (deterministic ids: same barcode or same
 * brand|name|quantity → same row). This catches the near misses. A pair must share brand,
 * category, pack size and the numbers in the name ("500 mg" ≠ "650 mg"), and then EITHER
 *   - have the same set of words (word order / case / punctuation: "Nachos, Cheese Jalapeno"
 *     = "Cheese Jalapeno Nachos"), OR
 *   - be ≥ `typoThreshold` similar overall (pg_trgm), which catches typos.
 * Plain trigram similarity alone is NOT enough: "Pantoprazole … Levosulpiride" vs
 * "Esomeprazole … Levosulpiride" scores 0.85 but they are different medicines.
 */
async function findDuplicates(
  client,
  { typoThreshold = 0.9, log = console.log } = {}
) {
  await client.query('BEGIN');
  try {
    const { rows } = await client.query(
      `WITH active AS (
         SELECT id, name, name_key, brand_key, taxonomy_node_id, unit, net_quantity, gtin, primary_source,
                regexp_replace(name_key, '[^0-9 ]', '', 'g') AS numbers,
                (SELECT string_agg(DISTINCT w, ' ' ORDER BY w)
                   FROM unnest(string_to_array(name_key, ' ')) AS w) AS words
         FROM catalog.items
         WHERE is_active AND status <> 'rejected' AND brand_key IS NOT NULL
       )
       SELECT a.id AS a_id, a.name AS a_name, a.primary_source AS a_source, a.gtin AS a_gtin,
              b.id AS b_id, b.name AS b_name, b.primary_source AS b_source, b.gtin AS b_gtin,
              round(similarity(a.name_key, b.name_key)::numeric, 3) AS similarity
       FROM active a
       JOIN active b
         ON a.id < b.id
        AND a.brand_key = b.brand_key
        AND a.taxonomy_node_id IS NOT DISTINCT FROM b.taxonomy_node_id
        AND a.unit IS NOT DISTINCT FROM b.unit
        AND (a.net_quantity IS NULL OR b.net_quantity IS NULL OR a.net_quantity = b.net_quantity)
        AND a.numbers = b.numbers
       WHERE a.words = b.words OR similarity(a.name_key, b.name_key) >= $1
       ORDER BY similarity DESC, a.id, b.id`,
      [typoThreshold]
    );
    const items = rows.map((r) => ({
      kind: 'item_possible_duplicate',
      entity: 'item_pair',
      entity_key: `${r.a_id}|${r.b_id}`,
      payload: {
        similarity: Number(r.similarity),
        a: { id: r.a_id, name: r.a_name, source: r.a_source, gtin: r.a_gtin },
        b: { id: r.b_id, name: r.b_name, source: r.b_source, gtin: r.b_gtin },
        action:
          'If they are the same product: node cli.js merge <keep_id> <drop_id>; otherwise dismiss.',
      },
    }));
    const run = await client.query(
      "INSERT INTO catalog.import_runs (source, source_version, status) VALUES ('dedupe', $1, 'running') RETURNING id",
      [`words-or-similarity-${typoThreshold}`]
    );
    const stats = await syncReview(client, run.rows[0].id, 'dedupe', items);
    await client.query(
      "UPDATE catalog.import_runs SET status = 'succeeded', stats = $2, finished_at = now() WHERE id = $1",
      [run.rows[0].id, { candidates: rows.length, review: stats }]
    );
    await client.query('COMMIT');
    log(
      `duplicate candidates: ${rows.length}  review: ${JSON.stringify(stats)}`
    );
    return { candidates: rows, stats };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

/**
 * Human decisions. Both only touch catalog.items/review_queue, and both are protected from
 * later source runs (sources never change verified or rejected items).
 */
async function mergeItems(client, keepId, dropId, { by = 'cli' } = {}) {
  if (keepId === dropId) throw new Error('keep and drop are the same item');
  await client.query('BEGIN');
  try {
    const found = await client.query(
      'SELECT id, status FROM catalog.items WHERE id = ANY($1)',
      [[keepId, dropId]]
    );
    if (found.rowCount !== 2) throw new Error('both item ids must exist');
    await client.query(
      `UPDATE catalog.items
          SET status = 'rejected', updated_at = now(),
              attributes = attributes || jsonb_build_object('merged_into', $2::text, 'merged_by', $3::text, 'merged_at', now())
        WHERE id = $1`,
      [dropId, keepId, by]
    );
    const resolved = await client.query(
      `UPDATE catalog.review_queue SET status = 'resolved', resolution = $3, resolved_at = now(), updated_at = now()
        WHERE status = 'open' AND kind = 'item_possible_duplicate'
          AND entity_key IN ($1 || '|' || $2, $2 || '|' || $1)`,
      [keepId, dropId, `merged into ${keepId} by ${by}`]
    );
    await client.query('COMMIT');
    return { resolved: resolved.rowCount };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function setItemStatus(client, id, status, { by = 'cli' } = {}) {
  if (!['verified', 'rejected', 'ready'].includes(status))
    throw new Error(`status must be verified, rejected or ready`);
  const res = await client.query(
    `UPDATE catalog.items SET status = $2, updated_at = now(),
            attributes = attributes || jsonb_build_object('status_by', $3::text, 'status_at', now())
      WHERE id = $1 RETURNING id`,
    [id, status, by]
  );
  if (!res.rowCount) throw new Error(`no item ${id}`);
}

module.exports = { findDuplicates, mergeItems, setItemStatus };
