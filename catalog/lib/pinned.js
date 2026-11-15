'use strict';

const fs = require('fs');
const path = require('path');
const { fetchBuffer } = require('./http');
const { sha256 } = require('./hash');

/**
 * Download a file whose exact content is pinned by SHA-256, caching it outside the repo.
 * The cached copy is re-verified on every run, so a changed upstream file or a corrupted
 * cache stops the run instead of silently loading different data.
 *
 * To update a source: change the pinned URL (commit) and sha256 together, review the
 * dry-run diff, then commit the new snapshot.
 */
async function downloadPinned(ctx, { url, file, sha256: expected }) {
  const target = path.join(ctx.cacheDir, file);
  if (fs.existsSync(target)) {
    const actual = sha256(fs.readFileSync(target));
    if (actual === expected) return target;
    ctx.log(`  cached ${file} does not match its pin — downloading again`);
  }
  ctx.log(`  downloading ${url}`);
  const buffer = await fetchBuffer(url, { timeoutMs: 300000 });
  const actual = sha256(buffer);
  if (actual !== expected) {
    throw new Error(
      `Pinned download mismatch for ${url}\n  expected sha256 ${expected}\n  got      ${actual}\n` +
        'Upstream content changed: review it, then update the pin in the source module.'
    );
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, buffer);
  return target;
}

const githubRaw = (repo, commit, filePath) =>
  `https://raw.githubusercontent.com/${repo}/${commit}/${filePath}`;

module.exports = { downloadPinned, githubRaw };
