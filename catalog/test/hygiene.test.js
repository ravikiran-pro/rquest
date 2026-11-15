'use strict';

/**
 * Invisible / irregular characters (zero-width spaces, NBSP, BOM, stray control bytes,
 * combining marks) silently change how regexes, CSV keys and names behave. Fail on any in
 * pipeline code or seeds; write such characters as \uXXXX escapes instead.
 * The set is built from code points so this file cannot contain the characters itself.
 */

const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const RANGES = [
  [0x00, 0x08], [0x0b, 0x0c], [0x0e, 0x1f], [0x7f, 0x7f], [0xa0, 0xa0], [0x300, 0x36f],
  [0x1680, 0x1680], [0x2000, 0x200d], [0x2028, 0x2029], [0x202f, 0x202f], [0x205f, 0x2060],
  [0x3000, 0x3000], [0xfeff, 0xfeff],
];
const ROOT = path.join(__dirname, '..');
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return ['node_modules', 'snapshots'].includes(e.name) ? [] : walk(p);
    return /\.(js|json|csv)$/.test(e.name) && e.name !== 'package-lock.json' ? [p] : [];
  });

test('no invisible or irregular characters in pipeline code and seeds', () => {
  const offenders = [];
  for (const file of walk(ROOT)) {
    let line = 1;
    for (const ch of fs.readFileSync(file, 'utf8')) {
      const cp = ch.codePointAt(0);
      if (cp === 0x0a) line += 1;
      if (cp !== 0x09 && cp !== 0x0a && cp !== 0x0d && RANGES.some(([a, b]) => cp >= a && cp <= b)) {
        offenders.push(`${path.relative(ROOT, file)}:${line} U+${cp.toString(16).toUpperCase().padStart(4, '0')}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});
