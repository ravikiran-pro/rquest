#!/usr/bin/env node
'use strict';

/**
 * Rquest catalog pipeline CLI.
 *
 *   node cli.js migrate                      create/upgrade the `catalog` schema
 *   node cli.js sources                      list sources with license + version
 *   node cli.js run <source> [flags]         extract → transform → bulk load
 *   node cli.js status                       last runs, row counts, open review items
 *
 * run flags:
 *   --dry-run        do everything inside a transaction, print the diff, then ROLLBACK
 *   --force          reload even if the input is unchanged since the last successful run
 *   --allow-shrink   permit deactivating more than the per-entity safety threshold
 *   --allow-rejects  permit a reject ratio above the source's threshold
 */

const { connect } = require('./lib/db');
const { migrate } = require('./db/schema');
const { runSource } = require('./lib/run');
const { SOURCES, getSource } = require('./sources');

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
  } finally {
    await client.end();
  }
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
    case 'run': {
      if (!positional[0])
        throw new Error(
          'Usage: node cli.js run <source> [--dry-run] [--force]'
        );
      await runSource(getSource(positional[0]), flags);
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
