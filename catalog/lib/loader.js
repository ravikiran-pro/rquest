'use strict';

const { copyRows, quoteIdent } = require('./copy');
const { contentHash } = require('./hash');

class LoadError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'LoadError';
    this.details = details;
  }
}

/**
 * Bulk-upsert one entity inside the caller's open transaction.
 *
 *   1. COPY all rows into a temp staging table (ON COMMIT DROP).
 *   2. Reject the whole batch if any key appears twice.
 *   3. INSERT ... ON CONFLICT DO UPDATE only where content_hash changed — unchanged
 *      rows are not written at all, so re-running an identical import is a no-op.
 *   4. Soft-deactivate rows in `scope` that the source no longer provides (never DELETE).
 *   5. Abort (caller rolls back) if more than `maxDeactivateRatio` would be deactivated.
 *
 * spec: {
 *   table: 'hsn_codes',              // catalog.<table>
 *   key: ['code'],                   // natural key = the table's unique/PK constraint
 *   columns: ['code', ...],          // business columns supplied by the transform
 *   scope: "t.source = 'x'",         // rows this source owns (for deactivation); default all
 *   protect: 'NOT t.verified',       // rows matching NOT(protect) are never changed
 *   beforeUpsert: async (client, stagingTable) => skippedCount,
 *   maxDeactivateRatio: 0.02,
 * }
 */
async function upsertEntity(client, runId, spec, rows, opts = {}) {
  const table = `catalog.${quoteIdent(spec.table)}`;
  const { columns, key } = spec;
  for (const k of key) {
    if (!columns.includes(k))
      throw new LoadError(`${spec.table}: key column ${k} not in columns`);
  }
  const staging = quoteIdent(`stg_${spec.table}`);
  const dataColumns = [...columns, 'content_hash'];
  const colList = dataColumns.map(quoteIdent).join(', ');
  const keyList = key.map(quoteIdent).join(', ');

  await client.query(
    `CREATE TEMP TABLE ${staging} ON COMMIT DROP AS SELECT ${colList} FROM ${table} WITH NO DATA`
  );

  const staged = rows.map((row) => {
    const out = {};
    for (const c of columns) out[c] = row[c] === undefined ? null : row[c];
    out.content_hash = contentHash(out);
    return out;
  });
  await copyRows(client, staging, dataColumns, staged);

  const dup = await client.query(
    `SELECT ${keyList}, count(*)::int AS n FROM ${staging}
     GROUP BY ${keyList} HAVING count(*) > 1 LIMIT 5`
  );
  if (dup.rowCount) {
    throw new LoadError(`${spec.table}: duplicate keys in batch`, dup.rows);
  }

  const skipped = spec.beforeUpsert
    ? await spec.beforeUpsert(client, staging)
    : 0;

  const scope = spec.scope || 'true';
  const protect = spec.protect ? `(${spec.protect})` : 'true';

  const before = await client.query(
    `SELECT count(*)::int AS n FROM ${table} t WHERE t.is_active AND (${scope})`
  );

  const nonKey = columns.filter((c) => !key.includes(c));
  const setList = [
    ...nonKey.map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`),
    'content_hash = EXCLUDED.content_hash',
    'is_active = true',
    'last_changed_run_id = EXCLUDED.last_changed_run_id',
    'updated_at = now()',
  ].join(', ');

  const upsert = await client.query(
    `WITH up AS (
       INSERT INTO ${table} AS t (${colList}, is_active, first_run_id, last_changed_run_id)
       SELECT ${colList}, true, $1, $1 FROM ${staging}
       ON CONFLICT (${keyList}) DO UPDATE SET ${setList}
       WHERE ${protect}
         AND (t.content_hash IS DISTINCT FROM EXCLUDED.content_hash OR NOT t.is_active)
       RETURNING (xmax = 0) AS inserted
     )
     SELECT count(*) FILTER (WHERE inserted)::int     AS inserted,
            count(*) FILTER (WHERE NOT inserted)::int AS updated
     FROM up`,
    [runId]
  );
  const { inserted, updated } = upsert.rows[0];

  const keyJoin = key
    .map((k) => `s.${quoteIdent(k)} = t.${quoteIdent(k)}`)
    .join(' AND ');
  const deactivate = await client.query(
    `UPDATE ${table} t
        SET is_active = false, last_changed_run_id = $1, updated_at = now()
      WHERE t.is_active AND (${scope}) AND ${protect}
        AND NOT EXISTS (SELECT 1 FROM ${staging} s WHERE ${keyJoin})`,
    [runId]
  );
  const deactivated = deactivate.rowCount;

  const activeBefore = before.rows[0].n;
  const maxRatio = spec.maxDeactivateRatio ?? 0.02;
  if (
    !opts.allowShrink &&
    activeBefore > 0 &&
    deactivated / activeBefore > maxRatio
  ) {
    throw new LoadError(
      `${spec.table}: would deactivate ${deactivated} of ${activeBefore} active rows ` +
        `(> ${(maxRatio * 100).toFixed(
          1
        )}%). Re-run with --allow-shrink if this is intended.`
    );
  }

  const stagedCount = staged.length - skipped;
  return {
    staged: staged.length,
    inserted,
    updated,
    unchanged: stagedCount - inserted - updated,
    deactivated,
    skipped,
  };
}

/**
 * beforeUpsert hook: abort the load if staged rows reference rows that are not active.
 * checks: [{ column, table, key }] — e.g. { column: 'hsn_code', table: 'hsn_codes', key: 'code' }.
 * NULL references are ignored (optional columns).
 */
const assertActiveReferences = (label, checks) => async (client, staging) => {
  for (const { column, table, key } of checks) {
    const missing = await client.query(
      `SELECT DISTINCT s.${quoteIdent(column)} AS ref FROM ${staging} s
        WHERE s.${quoteIdent(column)} IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM catalog.${quoteIdent(table)} x
                           WHERE x.${quoteIdent(key)} = s.${quoteIdent(
        column
      )} AND x.is_active)
        ORDER BY 1 LIMIT 20`
    );
    if (missing.rowCount) {
      throw new LoadError(
        `${label}: ${column} references unknown/inactive catalog.${table} rows`,
        missing.rows
      );
    }
  }
  return 0;
};

/** Rejected input rows are logged per run (they never enter catalog tables). */
async function insertRejects(client, runId, source, rejects) {
  const rows = rejects.map((r) => ({
    run_id: runId,
    source,
    entity: r.entity,
    source_key: r.source_key == null ? null : String(r.source_key),
    reason: r.reason,
    raw: r.raw ?? null,
  }));
  return copyRows(
    client,
    'catalog.rejects',
    ['run_id', 'source', 'entity', 'source_key', 'reason', 'raw'],
    rows
  );
}

/**
 * Sync this source's review items: add new ones, refresh changed payloads, and
 * auto-resolve open items the source no longer reports (the underlying issue is gone).
 */
async function syncReview(client, runId, source, items) {
  const staging = 'stg_review_queue';
  await client.query(
    `CREATE TEMP TABLE ${staging} (kind text, entity text, entity_key text, payload jsonb) ON COMMIT DROP`
  );
  await copyRows(
    client,
    staging,
    ['kind', 'entity', 'entity_key', 'payload'],
    items
  );
  const dup = await client.query(
    `SELECT kind, entity, entity_key FROM ${staging}
     GROUP BY 1, 2, 3 HAVING count(*) > 1 LIMIT 5`
  );
  if (dup.rowCount)
    throw new LoadError('review_queue: duplicate items in batch', dup.rows);

  const upserted = await client.query(
    `INSERT INTO catalog.review_queue AS q (source, kind, entity, entity_key, payload, first_run_id)
     SELECT $1, kind, entity, entity_key, payload, $2 FROM ${staging}
     ON CONFLICT (kind, entity, entity_key) WHERE status = 'open'
     DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()
     WHERE q.payload IS DISTINCT FROM EXCLUDED.payload
     RETURNING (xmax = 0) AS inserted`,
    [source, runId]
  );
  const resolved = await client.query(
    `UPDATE catalog.review_queue q
        SET status = 'resolved', resolution = 'auto: no longer reported by source',
            resolved_at = now(), updated_at = now()
      WHERE q.status = 'open' AND q.source = $1
        AND NOT EXISTS (SELECT 1 FROM ${staging} s
                         WHERE s.kind = q.kind AND s.entity = q.entity AND s.entity_key = q.entity_key)`,
    [source]
  );
  const opened = upserted.rows.filter((r) => r.inserted).length;
  return {
    reported: items.length,
    opened,
    refreshed: upserted.rowCount - opened,
    auto_resolved: resolved.rowCount,
  };
}

module.exports = {
  upsertEntity,
  insertRejects,
  syncReview,
  assertActiveReferences,
  LoadError,
};
