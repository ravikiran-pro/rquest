#!/usr/bin/env node
'use strict';

/**
 * Publish the catalogue's exports to the app. The catalogue never writes outside catalog/;
 * the app takes a copy of what it needs from catalog/exports/.
 *
 *   npm run catalog:publish            (from the repo root)
 *   node catalog/scripts/publish.js --check   exit 1 when the app copy is out of date
 *
 * When the catalogue becomes its own service, this copy is replaced by the app fetching the
 * same documents from the service.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, '..', 'src', 'api', 'data');
const EXPORTS = [{ from: 'exports/attributeSets.json', to: 'attributeSets.json' }];

let stale = 0;
for (const { from, to } of EXPORTS) {
  const src = path.join(ROOT, from);
  const dst = path.join(APP, to);
  if (!fs.existsSync(src)) {
    console.error(`missing ${from}: run node attributes/build.js in catalog/ first`);
    process.exit(1);
  }
  const next = fs.readFileSync(src);
  const same = fs.existsSync(dst) && Buffer.compare(next, fs.readFileSync(dst)) === 0;
  if (process.argv.includes('--check')) {
    if (!same) {
      console.error(`out of date: src/api/data/${to} (run npm run catalog:publish)`);
      stale += 1;
    }
    continue;
  }
  if (!same) fs.writeFileSync(dst, next);
  console.log(`${same ? 'unchanged' : 'published'} src/api/data/${to}`);
}
process.exit(stale ? 1 : 0);
