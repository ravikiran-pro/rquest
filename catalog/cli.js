#!/usr/bin/env node
'use strict';

/**
 * Rquest catalog pipeline CLI.
 *
 *   node cli.js migrate                      create/upgrade the `catalog` schema
 *   node cli.js sources                      list sources with license + version
 *   node cli.js run <source> [flags]         extract → transform → bulk load
 *   node cli.js extract <source>             download into the cache only (no database)
 *   node cli.js run-all [flags]              every source in dependency order, then dedupe
 *   node cli.js dedupe                       queue probable duplicate items for review
 *   node cli.js merge <keep_id> <drop_id>    mark drop as a duplicate of keep (rejected)
 *   node cli.js verify <item_id>             mark an item verified (sources won't change it)
 *   node cli.js status                       last runs, catalog health, open review items
 *
 * run flags:
 *   --dry-run        do everything inside a transaction, print the diff, then ROLLBACK
 *   --force          reload even if the input is unchanged since the last successful run
 *   --allow-shrink   permit deactivating more than the per-entity safety threshold
 *   --allow-rejects  permit a reject ratio above the source's threshold
 */

const path = require('path');
const { config, redactUrl } = require('./lib/env');
const { connect } = require('./lib/db');
const { migrate } = require('./db/schema');
const { runSource } = require('./lib/run');
const { findDuplicates, mergeItems, setItemStatus } = require('./lib/dedupe');
const { SOURCES, getSource } = require('./sources');

const withClient = async (fn) => {
  const client = await connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
};

function parseFlags(argv) {
  const flags = {};
  const positional = [];
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const name = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      flags[name] = true;
    } else positional.push(arg);
  }
  return { flags, positional };
}

async function cmdMigrate() {
  const cfg = config();
  if (cfg.databaseUrl) {
    console.log(`database: ${redactUrl(cfg.databaseUrl)} (from ${cfg.databaseSource})`);
  }
  const client = await connect();
  try {
    const n = await migrate(client);
    console.log(
      n ? `catalog schema migrated (${n} new)` : 'catalog schema is up to date'
    );
  } finally {
    await client.end();
  }
}

function cmdSources() {
  for (const name of Object.keys(SOURCES)) {
    const { meta } = getSource(name);
    console.log(
      `${name.padEnd(14)} ${meta.title}\n${''.padEnd(14)} license: ${
        meta.license
      }`
    );
  }
}

async function cmdStatus() {
  const client = await connect();
  try {
    const runs = await client.query(`
      SELECT DISTINCT ON (source) source, id, status, source_version, finished_at
      FROM catalog.import_runs WHERE status <> 'skipped'
      ORDER BY source, id DESC`);
    console.log('Last run per source:');
    for (const r of runs.rows) {
      console.log(
        `  ${r.source.padEnd(14)} #${r.id} ${r.status.padEnd(10)} ${
          r.source_version
        } ${r.finished_at?.toISOString() ?? ''}`
      );
    }
    const tables = await client.query(`
      SELECT c.relname AS table
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'is_active'
      WHERE n.nspname = 'catalog' AND c.relkind = 'r' ORDER BY 1`);
    console.log('Rows (active / total):');
    for (const { table } of tables.rows) {
      const { rows } = await client.query(
        `SELECT count(*) FILTER (WHERE is_active)::int AS active, count(*)::int AS total FROM catalog."${table}"`
      );
      console.log(`  ${table.padEnd(26)} ${rows[0].active} / ${rows[0].total}`);
    }
    const review = await client.query(
      `SELECT source, kind, count(*)::int AS n FROM catalog.review_queue WHERE status = 'open' GROUP BY 1, 2 ORDER BY 1, 2`
    );
    console.log('Open review items:');
    if (!review.rowCount) console.log('  none');
    for (const r of review.rows)
      console.log(`  ${r.source.padEnd(14)} ${r.kind.padEnd(30)} ${r.n}`);

    const health = await client.query(`
      SELECT primary_source AS source, kind,
             count(*)::int AS items,
             count(*) FILTER (WHERE status = 'ready')::int AS ready,
             count(*) FILTER (WHERE status = 'verified')::int AS verified,
             round(100.0 * count(*) FILTER (WHERE taxonomy_node_id IS NOT NULL) / count(*))::int AS pct_category,
             round(100.0 * count(*) FILTER (WHERE effective_hsn IS NOT NULL) / count(*))::int AS pct_hsn,
             round(100.0 * count(*) FILTER (WHERE gst_rate IS NOT NULL) / count(*))::int AS pct_gst,
             round(100.0 * count(*) FILTER (WHERE net_quantity IS NOT NULL OR kind = 'service') / count(*))::int AS pct_qty,
             round(100.0 * count(*) FILTER (WHERE gtin IS NOT NULL) / count(*))::int AS pct_barcode,
             round(100.0 * count(*) FILTER (WHERE image_url IS NOT NULL) / count(*))::int AS pct_image
      FROM catalog.items_enriched WHERE is_active GROUP BY 1, 2 ORDER BY 1, 2`);
    console.log('Catalog health (active items; % with each field):');
    console.log(
      '  source           kind      items  ready verified  categ  hsn  gst  qty  barcode image'
    );
    for (const h of health.rows) {
      console.log(
        `  ${h.source.padEnd(16)} ${h.kind.padEnd(8)} ${String(
          h.items
        ).padStart(6)} ${String(h.ready).padStart(6)} ` +
          `${String(h.verified).padStart(8)} ${String(h.pct_category).padStart(
            5
          )}% ${String(h.pct_hsn).padStart(3)}% ` +
          `${String(h.pct_gst).padStart(3)}% ${String(h.pct_qty).padStart(
            3
          )}% ${String(h.pct_barcode).padStart(6)}% ${String(
            h.pct_image
          ).padStart(4)}%`
      );
    }
  } finally {
    await client.end();
  }
}

/** Every source in registry order (the order encodes the dependencies), then dedupe. */
async function cmdRunAll(flags) {
  for (const name of Object.keys(SOURCES)) {
    await runSource(getSource(name), flags);
  }
  if (!flags.dryRun) await withClient((c) => findDuplicates(c));
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { flags, positional } = parseFlags(rest);
  switch (command) {
    case 'migrate':
      return cmdMigrate();
    case 'sources':
      return cmdSources();
    case 'status':
      return cmdStatus();
    case 'run-all':
      return cmdRunAll(flags);
    case 'dedupe':
      return withClient((c) => findDuplicates(c));
    case 'merge': {
      const [keep, drop] = positional;
      if (!keep || !drop)
        throw new Error('Usage: node cli.js merge <keep_id> <drop_id>');
      const out = await withClient((c) =>
        mergeItems(c, keep, drop, { by: process.env.USER || 'cli' })
      );
      console.log(
        `${drop} → rejected, merged into ${keep} (${out.resolved} review item(s) resolved)`
      );
      return undefined;
    }
    case 'verify': {
      if (!positional[0])
        throw new Error('Usage: node cli.js verify <item_id>');
      await withClient((c) =>
        setItemStatus(c, positional[0], 'verified', {
          by: process.env.USER || 'cli',
        })
      );
      console.log(`${positional[0]} → verified`);
      return undefined;
    }
    case 'run': {
      if (!positional[0])
        throw new Error(
          'Usage: node cli.js run <source> [--dry-run] [--force]'
        );
      await runSource(getSource(positional[0]), flags);
      return undefined;
    }
    case 'extract': {
      if (!positional[0])
        throw new Error('Usage: node cli.js extract <source>');
      const source = getSource(positional[0]);
      const cfg = config();
      const ctx = {
        config: cfg,
        log: console.log,
        cacheDir: path.join(cfg.cacheDir, source.meta.name),
      };
      const out = await source.extract(ctx);
      console.log(
        `extracted ${source.meta.name}: ${out.version} (${out.inputSha256.slice(
          0,
          12
        )})`
      );
      return undefined;
    }
    default:
      console.log(
        require('fs')
          .readFileSync(__filename, 'utf8')
          .split('*/')[0]
          .split('/**')[1]
          .replace(/^ \* ?/gm, '')
      );
      return command
        ? Promise.reject(new Error(`Unknown command: ${command}`))
        : undefined;
  }
}

main().catch((err) => {
  console.error(`✖ ${err.message}`);
  if (err.details) console.error(JSON.stringify(err.details, null, 2));
  process.exitCode = 1;
});
