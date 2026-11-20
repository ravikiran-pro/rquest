/**
 * Database access for the master catalog API.
 *
 * The `catalog` schema lives in the app's own database (the pipeline in catalog/ writes
 * it), so this uses the app's Sequelize connection: raw, parameterised SQL with
 * schema-qualified `catalog.` names. No second pool, no CATALOG_DATABASE_URL.
 */
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../models');

const NOT_SET_UP_MESSAGE = 'Master catalog is not set up yet. Run: npm run catalog:migrate';

// Everything the endpoints read or write. Missing any of them = not set up (or migrated
// only part of the way).
const REQUIRED_RELATIONS = [
  'catalog.items',
  'catalog.items_enriched',
  'catalog.item_sources',
  'catalog.brands',
  'catalog.taxonomy_nodes',
  'catalog.taxonomy_mappings',
  'catalog.hsn_codes',
  'catalog.hsn_rates',
  'catalog.review_queue',
  'catalog.import_runs',
];

const READY_TTL_MS = 60 * 1000;
const MISSING_TTL_MS = 5 * 1000;

let state = { checkedAt: 0, ready: false, trgmSchema: null };
let pending = null;

const quoteIdent = (name) => `"${String(name).replace(/"/g, '""')}"`;

async function probe() {
  const [row] = await sequelize.query(
    `SELECT (SELECT count(*) FROM unnest(ARRAY[:relations]::text[]) AS r(name)
              WHERE to_regclass(r.name) IS NULL)::int AS missing,
            (SELECT n.nspname FROM pg_extension e
               JOIN pg_namespace n ON n.oid = e.extnamespace
              WHERE e.extname = 'pg_trgm') AS trgm_schema`,
    { replacements: { relations: REQUIRED_RELATIONS }, type: QueryTypes.SELECT }
  );
  return {
    checkedAt: Date.now(),
    ready: row.missing === 0,
    // pg_trgm is optional: the pipeline installs it into `catalog` (not on the app's
    // search_path), so its functions are always called schema-qualified.
    trgmSchema: row.trgm_schema ? quoteIdent(row.trgm_schema) : null,
  };
}

/** Is the catalog schema present? Cached briefly; concurrent callers share one probe. */
async function catalogStatus({ force = false } = {}) {
  const ttl = state.ready ? READY_TTL_MS : MISSING_TTL_MS;
  if (!force && state.checkedAt && Date.now() - state.checkedAt < ttl) return state;
  if (!pending) {
    pending = probe()
      .then((next) => {
        state = next;
        return next;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

const forgetStatus = () => {
  state = { checkedAt: 0, ready: false, trgmSchema: null };
};

// Postgres errors that mean "the catalog schema/objects are not there".
const MISSING_OBJECT_CODES = new Set(['42P01', '3F000', '42883', '42703']);

const isConnectionError = (err) =>
  Boolean(err) &&
  (/^Sequelize(Connection|ConnectionRefused|HostNotFound|HostNotReachable|ConnectionTimedOut|AccessDenied|InvalidConnection)Error$/.test(
    err.name
  ) ||
    ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EHOSTUNREACH'].includes(err.code));

const notSetUp = (res) => res.status(503).json({ success: false, error: NOT_SET_UP_MESSAGE });

/** Middleware: 503 (never a 500) until `npm run catalog:migrate` has created the schema. */
async function requireCatalog(req, res, next) {
  try {
    const status = await catalogStatus();
    if (!status.ready) return notSetUp(res);
    req.catalog = status;
    return next();
  } catch (err) {
    if (isConnectionError(err)) {
      console.error('Catalog: database not reachable:', err.message);
      return res.status(503).json({ success: false, error: 'The database is not reachable' });
    }
    console.error('Catalog: status check failed:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}

/** Shared error responder for handlers. */
function sendError(res, err, label) {
  const code = err && (err.original?.code || err.parent?.code || err.code);
  if (MISSING_OBJECT_CODES.has(code) && /catalog/i.test(String(err.message || ''))) {
    // The schema was dropped or is mid-migration since the last check.
    forgetStatus();
    return notSetUp(res);
  }
  if (isConnectionError(err)) {
    return res.status(503).json({ success: false, error: 'The database is not reachable' });
  }
  console.error(`Catalog: ${label} failed:`, err);
  return res.status(500).json({ success: false, error: 'Internal Server Error' });
}

/** Express 4 does not catch rejected promises: route every async handler through here. */
const handle = (label, fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    if (res.headersSent) return;
    sendError(res, err, label);
  }
};

const select = (sql, replacements = {}, options = {}) =>
  sequelize.query(sql, { replacements, type: QueryTypes.SELECT, ...options });

module.exports = {
  sequelize,
  QueryTypes,
  select,
  handle,
  requireCatalog,
  catalogStatus,
  forgetStatus,
  NOT_SET_UP_MESSAGE,
};
