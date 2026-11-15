'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env.catalog');

let loaded = false;

function loadEnv() {
  if (loaded) return;
  loaded = true;
  // Only the pipeline's own env file is read — never the app's .env / DB_* variables.
  if (fs.existsSync(ENV_FILE) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(ENV_FILE);
  }
}

function config() {
  loadEnv();
  return {
    root: ROOT,
    databaseUrl: process.env.CATALOG_DATABASE_URL || null,
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

module.exports = { config, ROOT };
