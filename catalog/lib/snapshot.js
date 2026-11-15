'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { stableStringify, sha256 } = require('./hash');

/**
 * Write a reviewable, diff-friendly snapshot of a transform result:
 *   <dir>/<entity>.ndjson.gz   rows sorted by natural key, keys sorted per row
 *   <dir>/rejects.ndjson.gz, review.ndjson.gz
 *   <dir>/manifest.ndjson      one line per file: rows + sha256 of the *uncompressed* content
 *
 * Extensions are deliberately .ndjson / .gz: nodemon (which watches the whole repo for
 * .js/.json in `npm run dev`) ignores them, so a pipeline run never restarts the app.
 */
function writeSnapshot(dir, source, result, info) {
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  const write = (name, rows, sortKey) => {
    const sorted = sortKey
      ? [...rows].sort((a, b) => cmp(sortKey(a), sortKey(b)))
      : rows;
    const body =
      sorted.map((r) => stableStringify(r)).join('\n') +
      (sorted.length ? '\n' : '');
    fs.writeFileSync(
      path.join(dir, `${name}.ndjson.gz`),
      zlib.gzipSync(body, { level: 9 })
    );
    files.push({
      file: `${name}.ndjson.gz`,
      rows: sorted.length,
      sha256: sha256(body),
    });
  };
  for (const spec of source.entities) {
    write(spec.table, result.entities[spec.table], (r) =>
      spec.key.map((k) => String(r[k])).join('\u0001')
    );
  }
  write(
    'rejects',
    result.rejects,
    (r) => `${r.entity}\u0001${r.source_key}\u0001${r.reason}`
  );
  write(
    'review',
    result.review,
    (r) => `${r.kind}\u0001${r.entity}\u0001${r.entity_key}`
  );

  const header = {
    source: source.meta.name,
    title: source.meta.title,
    license: source.meta.license,
    attribution: source.meta.attribution || null,
    ...info,
  };
  const manifest =
    [header, ...files].map((l) => stableStringify(l)).join('\n') + '\n';
  fs.writeFileSync(path.join(dir, 'manifest.ndjson'), manifest);
  return files;
}

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

module.exports = { writeSnapshot };
