'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const util = require('util');

const ROOT = path.resolve(__dirname, '..');
// The app's root env file (read by require('dotenv').config() when the app starts).
// Catalog sits directly alongside the app in the existing database as schema `catalog`.
const APP_ENV_FILE = path.join(ROOT, '..', '.env');

/**
 * Per-environment defaults of the app's Sequelize connection. Mirrors
 * src/api/config/config.js (the pipeline never imports app code) - keep them in sync.
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
  // Load the app's root .env into process.env if available
  if (fs.existsSync(APP_ENV_FILE) && typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(APP_ENV_FILE);
    } catch {
      // ignore
    }
  }
}

/** The app's .env as a plain object (process.env is left untouched). */
function readAppEnvFile() {
  if (!fs.existsSync(APP_ENV_FILE)) return {};
  try {
    const content = fs.readFileSync(APP_ENV_FILE, 'utf8');
    if (typeof util.parseEnv === 'function') {
      return util.parseEnv(content);
    }
    const result = {};
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      result[key] = val;
    }
    return result;
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
  loadEnv();
  const file = readAppEnvFile();
  const get = (key) => {
    const value = process.env[key] !== undefined ? process.env[key] : file[key];
    return value === undefined || value === '' ? undefined : String(value);
  };

  const env = get('NODE_ENV') || 'development';

  // Support direct DATABASE_URL / DB_URL from the existing app configuration if set
  const directUrl = get('DATABASE_URL') || get('DB_URL');
  if (directUrl) {
    return { url: directUrl, env };
  }

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
  const query = defaults.ssl || get('DB_SSL') === 'true' ? '?sslmode=no-verify' : '';
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
  const app = appDatabase();
  return {
    root: ROOT,
    // Catalog uses the app's existing database, so `catalog` sits next to `public` in the same DB.
    databaseUrl: app.url,
    databaseSource: `app DB_* settings (NODE_ENV=${app.env})`,
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
