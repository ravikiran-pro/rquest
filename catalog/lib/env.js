'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const util = require('util');

const ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env.catalog');
// The app's env file (read by `require('dotenv').config()` when the app starts from the
// repo root). Only its DB_* / NODE_ENV values are used, and only when
// CATALOG_DATABASE_URL is not set.
const APP_ENV_FILE = path.join(ROOT, '..', '.env');

/**
 * Per-environment defaults of the app's Sequelize connection. Mirrors
 * src/api/config/config.js (the pipeline never imports app code) — keep them in sync.
 */
const APP_DB_DEFAULTS = {
  local: { user: 'postgres', password: 'postgres', database: 'rquest', host: 'localhost', port: '5432' },
  test: { user: 'postgres', password: '12345678', database: 'rquest', host: 'localhost', port: '5432' },
  development: {
    user: 'postgres',
    password: 'postgres',
    database: 'request_db_4cxm',
    host: 'localhost',
    port: '5432',
  },
  // No defaults in production; the app connects with ssl { require, rejectUnauthorized: false }.
  production: { ssl: true },
};

let loaded = false;

function loadEnv() {
  if (loaded) return;
  loaded = true;
  // The pipeline's own env file. Values already in the environment win.
  if (fs.existsSync(ENV_FILE) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(ENV_FILE);
  }
}

/** The app's .env as a plain object (process.env is left untouched). */
function readAppEnvFile() {
  if (!fs.existsSync(APP_ENV_FILE) || typeof util.parseEnv !== 'function') return {};
  try {
    return util.parseEnv(fs.readFileSync(APP_ENV_FILE, 'utf8'));
  } catch (err) {
    return {};
  }
}

/**
 * The app's own database, as a connection URL: the same DB_USER / DB_PASSWORD / DB_HOST /
 * DB_PORT / DB_NAME, NODE_ENV selection and defaults as src/api/config/config.js, so the
 * `catalog` schema lands in the database the API reads. Real environment variables win
 * over the root .env (like dotenv). Returns { url, env } or { url: null, env, missing }.
 */
function appDatabase() {
  const file = readAppEnvFile();
  const get = (key) => {
    const value = process.env[key] !== undefined ? process.env[key] : file[key];
    return value === undefined || value === '' ? undefined : String(value);
  };
  const env = get('NODE_ENV') || 'development';
  const defaults = APP_DB_DEFAULTS[env];
  if (!defaults) return { url: null, env, missing: [`settings for NODE_ENV=${env}`] };

  const settings = {
    user: get('DB_USER') || defaults.user,
    password: get('DB_PASSWORD') || defaults.password,
    database: get('DB_NAME') || defaults.database,
    host: get('DB_HOST') || defaults.host,
    port: get('DB_PORT') || defaults.port,
  };
  const missing = ['user', 'database', 'host']
    .filter((k) => !settings[k])
    .map((k) => `DB_${k === 'database' ? 'NAME' : k.toUpperCase()}`);
  if (missing.length) return { url: null, env, missing };

  const auth = settings.password
    ? `${encodeURIComponent(settings.user)}:${encodeURIComponent(settings.password)}`
    : encodeURIComponent(settings.user);
  // A socket directory (/var/run/postgresql) is percent-encoded; IPv6 needs brackets.
  let host = settings.host;
  if (host.startsWith('/')) host = encodeURIComponent(host);
  else if (host.includes(':') && !host.startsWith('[')) host = `[${host}]`;
  const port = settings.port ? `:${settings.port}` : '';
  // sslmode=no-verify = the app's { ssl: { require: true, rejectUnauthorized: false } }.
  const query = defaults.ssl ? '?sslmode=no-verify' : '';
  return {
    url: `postgres://${auth}@${host}${port}/${encodeURIComponent(settings.database)}${query}`,
    env,
  };
}

/** Connection URL with the password masked, for log lines. */
function redactUrl(url) {
  return url ? url.replace(/^(postgres(?:ql)?:\/\/[^:@/]*):[^@]*@/, '$1:***@') : url;
}

function config() {
  loadEnv();
  const override = process.env.CATALOG_DATABASE_URL || null;
  const app = override ? null : appDatabase();
  return {
    root: ROOT,
    // CATALOG_DATABASE_URL (catalog/.env.catalog or the environment) overrides; otherwise
    // the app's own database, so `catalog` sits next to `public` in the same DB.
    databaseUrl: override || app.url,
    databaseSource: override ? 'CATALOG_DATABASE_URL' : `app DB_* settings (NODE_ENV=${app.env})`,
    databaseMissing: app && !app.url ? app.missing : null,
    // Raw downloads stay outside the repo so nodemon/Vite never see them.
    cacheDir:
      process.env.CATALOG_CACHE_DIR ||
      path.join(os.homedir(), '.cache', 'rquest-catalog'),
    snapshotDir: path.join(ROOT, 'snapshots'),
    seedDir: path.join(ROOT, 'seeds'),
    userAgent:
      process.env.CATALOG_USER_AGENT || 'RquestCatalog/0.1 (catalog-pipeline)',
  };
}

module.exports = { config, appDatabase, redactUrl, ROOT };
