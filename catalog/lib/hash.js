'use strict';

const crypto = require('crypto');
const fs = require('fs');

/** JSON with sorted keys so the same logical row always hashes the same. */
function stableStringify(value) {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value)
    .filter((k) => value[k] !== undefined)
    .sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
    .join(',')}}`;
}

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

const contentHash = (obj) => sha256(stableStringify(obj));

function sha256File(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(file)
      .on('error', reject)
      .on('data', (d) => hash.update(d))
      .on('end', () => resolve(hash.digest('hex')));
  });
}

/** Verify an npm-style Subresource Integrity string ("sha512-<base64>"). */
function verifyIntegrity(buffer, integrity) {
  const [algo, expected] = String(integrity).split('-', 2);
  if (!algo || !expected) throw new Error(`Bad integrity string: ${integrity}`);
  const actual = crypto.createHash(algo).update(buffer).digest('base64');
  if (actual !== expected) {
    throw new Error(
      `Integrity mismatch (${algo}): expected ${expected}, got ${actual}`
    );
  }
}

module.exports = {
  stableStringify,
  sha256,
  contentHash,
  sha256File,
  verifyIntegrity,
};
