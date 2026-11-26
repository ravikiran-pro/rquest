'use strict';

/**
 * The collect_jobs queue (catalog migration 5). Every function takes a pg client.
 *
 * A job is one page or request: { key, kind?, params?, priority?, refreshAfter?, runAt? }.
 * Keys are unique per scraper, so enqueueing is idempotent (a seed can run any number of
 * times). A done job with refresh_after becomes due again that long after it finished.
 */

const MAX_ATTEMPTS = 5;

async function enqueue(client, scraper, jobs) {
  let added = 0;
  for (const j of jobs || []) {
    if (!j || !j.key) continue;
    const { rowCount } = await client.query(
      `INSERT INTO catalog.collect_jobs (scraper, job_key, kind, params, priority, refresh_after, next_run_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6::interval, COALESCE($7::timestamptz, now()))
       ON CONFLICT (scraper, job_key) DO NOTHING`,
      [
        scraper,
        String(j.key).slice(0, 500),
        j.kind || 'page',
        JSON.stringify(j.params || {}),
        j.priority || 0,
        j.refreshAfter || null,
        j.runAt || null,
      ]
    );
    added += rowCount;
  }
  return added;
}

/** Claim the next due job of any of `scrapers` for `workerId` (lease in seconds). */
async function claim(client, { scrapers, workerId, leaseSeconds = 600 }) {
  const { rows } = await client.query(
    `UPDATE catalog.collect_jobs j
        SET status = 'running', locked_by = $2, locked_until = now() + ($3 || ' seconds')::interval,
            attempts = j.attempts + 1, updated_at = now()
      WHERE j.id = (
        SELECT id FROM catalog.collect_jobs
         WHERE scraper = ANY($1)
           AND ((status = 'queued' AND next_run_at <= now())
             OR (status = 'running' AND locked_until < now())
             OR (status = 'done' AND refresh_after IS NOT NULL AND finished_at + refresh_after <= now()))
         ORDER BY priority DESC, next_run_at
         LIMIT 1
         FOR UPDATE SKIP LOCKED)
      RETURNING j.*`,
    [scrapers, workerId, String(leaseSeconds)]
  );
  return rows[0] || null;
}

async function complete(client, job, { records = 0 } = {}) {
  await client.query(
    `UPDATE catalog.collect_jobs SET status = 'done', records = $2, attempts = 0, last_error = NULL,
            locked_by = NULL, locked_until = NULL, finished_at = now(), updated_at = now()
      WHERE id = $1`,
    [job.id, records]
  );
}

/** A fatal error (4xx, robots refusal, bad params) fails at once; others back off. */
async function fail(client, job, err) {
  const fatal = Boolean(err && err.fatal);
  const giveUp = fatal || job.attempts >= MAX_ATTEMPTS;
  const backoffMin = Math.min(2 ** job.attempts, 240);
  await client.query(
    `UPDATE catalog.collect_jobs
        SET status = $2, last_error = $3, locked_by = NULL, locked_until = NULL, updated_at = now(),
            next_run_at = now() + ($4 || ' minutes')::interval
      WHERE id = $1`,
    [job.id, giveUp ? 'failed' : 'queued', String((err && err.message) || err).slice(0, 2000), String(backoffMin)]
  );
  return giveUp;
}

/** Failed (and optionally skipped) jobs of a scraper back to the queue. */
async function retry(client, scraper) {
  const { rowCount } = await client.query(
    `UPDATE catalog.collect_jobs SET status = 'queued', attempts = 0, next_run_at = now(), updated_at = now()
      WHERE scraper = $1 AND status IN ('failed', 'skipped')`,
    [scraper]
  );
  return rowCount;
}

async function status(client) {
  const { rows } = await client.query(
    `SELECT j.scraper,
            count(*) FILTER (WHERE status = 'queued')::int AS queued,
            count(*) FILTER (WHERE status = 'running')::int AS running,
            count(*) FILTER (WHERE status = 'done')::int AS done,
            count(*) FILTER (WHERE status = 'failed')::int AS failed,
            max(finished_at) AS last_finished,
            (SELECT count(*)::int FROM catalog.collect_records r WHERE r.scraper = j.scraper) AS records,
            (SELECT last_error FROM catalog.collect_jobs f WHERE f.scraper = j.scraper AND f.status = 'failed'
              ORDER BY updated_at DESC LIMIT 1) AS last_error
       FROM catalog.collect_jobs j GROUP BY j.scraper ORDER BY j.scraper`
  );
  return rows;
}

module.exports = { enqueue, claim, complete, fail, retry, status, MAX_ATTEMPTS };
