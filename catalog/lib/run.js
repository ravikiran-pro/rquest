'use strict';

const path = require('path');
const { connect } = require('./db');
const { config } = require('./env');
const { assertMigrated } = require('../db/schema');
const {
  upsertEntity,
  insertRejects,
  syncReview,
  LoadError,
} = require('./loader');
const { writeSnapshot } = require('./snapshot');

/**
 * Run one source end-to-end: extract → transform → one bulk transaction → snapshot.
 *
 * A source module exports:
 *   meta:      { name, title, license, transformVersion, maxRejectRatio? }
 *   entities:  [loader specs] in load order
 *   extract(ctx)            → { version, inputSha256, ...anything transform needs }
 *   transform(extracted, ctx) → { entities: { [table]: rows[] }, rejects: [], review: [], inputCount, notes? }
 */
async function runSource(source, opts = {}) {
  const log = opts.log || console.log;
  const cfg = config();
  const ctx = {
    config: cfg,
    log,
    cacheDir: path.join(cfg.cacheDir, source.meta.name),
  };
  const client = await connect(opts.databaseUrl);
  const lockKey = `rquest-catalog:${source.meta.name}`;
  let locked = false;
  try {
    await assertMigrated(client);
    const lock = await client.query(
      'SELECT pg_try_advisory_lock(hashtext($1)) AS ok',
      [lockKey]
    );
    if (!lock.rows[0].ok)
      throw new Error(`Another run of "${source.meta.name}" is in progress`);
    locked = true;

    log(`▸ extract ${source.meta.name}`);
    const extracted = await source.extract(ctx);
    const sourceVersion = `${extracted.version}+t${source.meta.transformVersion}`;

    if (!opts.force && !opts.dryRun) {
      // Compare with the LATEST successful run only: input A → B → A must reload A.
      const last = await client.query(
        `SELECT id FROM (
           SELECT id, source_version, input_sha256 FROM catalog.import_runs
            WHERE source = $1 AND status = 'succeeded' ORDER BY id DESC LIMIT 1
         ) latest WHERE source_version = $2 AND input_sha256 = $3`,
        [source.meta.name, sourceVersion, extracted.inputSha256]
      );
      if (last.rowCount) {
        await client.query(
          `INSERT INTO catalog.import_runs (source, source_version, input_sha256, status, finished_at, stats)
           VALUES ($1, $2, $3, 'skipped', now(), $4)`,
          [
            source.meta.name,
            sourceVersion,
            extracted.inputSha256,
            { same_as_run: last.rows[0].id },
          ]
        );
        log(
          `  input unchanged since run #${last.rows[0].id} — nothing to do (use --force to reload)`
        );
        return { status: 'skipped' };
      }
    }

    log(`▸ transform ${source.meta.name}`);
    const result = await source.transform(extracted, ctx);
    for (const spec of source.entities) {
      if (!Array.isArray(result.entities[spec.table])) {
        throw new LoadError(`transform did not produce entity "${spec.table}"`);
      }
    }

    const rejectRatio = result.inputCount
      ? result.rejects.length / result.inputCount
      : 0;
    const maxReject = source.meta.maxRejectRatio ?? 0.05;
    if (rejectRatio > maxReject && !opts.allowRejects) {
      throw new LoadError(
        `${result.rejects.length} of ${result.inputCount} input rows rejected ` +
          `(${(rejectRatio * 100).toFixed(1)}% > ${(maxReject * 100).toFixed(
            1
          )}%). ` +
          'Inspect with --dry-run; override with --allow-rejects.'
      );
    }

    const run = await client.query(
      `INSERT INTO catalog.import_runs (source, source_version, input_sha256, status)
       VALUES ($1, $2, $3, 'running') RETURNING id`,
      [source.meta.name, sourceVersion, extracted.inputSha256]
    );
    const runId = run.rows[0].id;
    log(
      `▸ load ${source.meta.name} (run #${runId}${
        opts.dryRun ? ', DRY RUN' : ''
      })`
    );

    const stats = { input_rows: result.inputCount, notes: result.notes || {} };
    await client.query('BEGIN');
    try {
      for (const spec of source.entities) {
        stats[spec.table] = await upsertEntity(
          client,
          runId,
          spec,
          result.entities[spec.table],
          opts
        );
      }
      stats.rejects = await insertRejects(
        client,
        runId,
        source.meta.name,
        result.rejects
      );
      stats.review = await syncReview(
        client,
        runId,
        source.meta.name,
        result.review
      );

      if (opts.dryRun) {
        await client.query('ROLLBACK');
        await finishRun(client, runId, 'dry_run', stats);
      } else {
        await finishRun(client, runId, 'succeeded', stats);
        await client.query('COMMIT');
      }
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      await finishRun(client, runId, 'failed', stats, err.message).catch(
        () => {}
      );
      throw err;
    }

    // Snapshots are written only after a successful commit (dry runs go to the cache dir).
    const snapshotRoot = opts.snapshotDir
      ? path.join(
          opts.snapshotDir,
          opts.dryRun ? 'dry-run' : '',
          source.meta.name
        )
      : opts.dryRun
      ? path.join(ctx.cacheDir, 'dry-run-snapshot')
      : path.join(cfg.snapshotDir, source.meta.name);
    const manifest = writeSnapshot(snapshotRoot, source, result, {
      source_version: sourceVersion,
      input_sha256: extracted.inputSha256,
    });
    stats.snapshot = {
      dir: path.relative(cfg.root, snapshotRoot),
      files: manifest.length,
    };
    printStats(log, stats);
    return { status: opts.dryRun ? 'dry_run' : 'succeeded', runId, stats };
  } finally {
    if (locked)
      await client
        .query('SELECT pg_advisory_unlock(hashtext($1))', [lockKey])
        .catch(() => {});
    await client.end();
  }
}

async function finishRun(client, runId, status, stats, error = null) {
  await client.query(
    `UPDATE catalog.import_runs SET status = $2, stats = $3, error = $4, finished_at = now() WHERE id = $1`,
    [runId, status, stats, error]
  );
}

function printStats(log, stats) {
  const rows = Object.entries(stats).filter(
    ([, v]) => v && typeof v === 'object' && 'staged' in v
  );
  if (rows.length) {
    log(
      '  entity                     staged  inserted  updated  unchanged  deactivated  skipped'
    );
    for (const [name, s] of rows) {
      log(
        `  ${name.padEnd(26)} ${String(s.staged).padStart(6)} ${String(
          s.inserted
        ).padStart(9)} ` +
          `${String(s.updated).padStart(8)} ${String(s.unchanged).padStart(
            10
          )} ` +
          `${String(s.deactivated).padStart(12)} ${String(s.skipped).padStart(
            8
          )}`
      );
    }
  }
  log(`  rejects: ${stats.rejects}   review: ${JSON.stringify(stats.review)}`);
  if (stats.notes && Object.keys(stats.notes).length)
    log(`  notes: ${JSON.stringify(stats.notes)}`);
}

module.exports = { runSource };
