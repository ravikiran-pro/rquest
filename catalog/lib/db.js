'use strict';

const { Client } = require('pg');
const { config } = require('./env');

/**
 * Open a dedicated connection for one pipeline command.
 *
 * Every statement in the pipeline schema-qualifies `catalog.` objects. `public`
 * stays on the search_path only so extension functions/operators installed there
 * (pg_trgm, btree_gist, unaccent) still resolve.
 */
async function connect(databaseUrl = config().databaseUrl) {
  if (!databaseUrl) {
    throw new Error(
      'CATALOG_DATABASE_URL is not set. Copy catalog/.env.catalog.example to catalog/.env.catalog.'
    );
  }
  const client = new Client({
    connectionString: databaseUrl,
    application_name: 'rquest-catalog',
  });
  await client.connect();
  await client.query('SET search_path TO catalog, public');
  return client;
}

module.exports = { connect };
