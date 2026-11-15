'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeHsn,
  normalizeHsnDetailed,
  hsnType,
  parentOf,
  basisFor,
  cleanDescription,
  deriveDescription,
  collapseByPrefix,
} = require('../lib/hsn');

test('normalizeHsn restores the leading zero dropped for chapters 01–09', () => {
  assert.equal(normalizeHsn('1011010'), '01011010');
  assert.equal(normalizeHsn('0101.10.10'), '01011010');
  assert.equal(normalizeHsn(' 0401 '), '0401');
  assert.equal(normalizeHsn(401), '0401');
  assert.equal(normalizeHsn('4'), '04');
  assert.equal(normalizeHsnDetailed('1011010').padded, true);
});

test('normalizeHsn rejects inputs that cannot be a code', () => {
  assert.equal(normalizeHsn(''), null);
  assert.equal(normalizeHsn('abc'), null);
  assert.equal(normalizeHsn(null), null);
  assert.equal(normalizeHsn('123456789'), null);
  assert.equal(normalizeHsn('1234567890'), null);
  assert.equal(
    normalizeHsnDetailed('99541').error,
    'sac_group_level_unsupported'
  );
});

test('SAC codes keep their form and type', () => {
  assert.equal(normalizeHsn('9954'), '9954');
  assert.equal(normalizeHsn('995411'), '995411');
  assert.equal(hsnType('995411'), 'SAC');
  assert.equal(hsnType('09011110'), 'HSN');
});

test('parents and basis follow the 2/4/6/8 hierarchy', () => {
  assert.equal(parentOf('01011010'), '010110');
  assert.equal(parentOf('010110'), '0101');
  assert.equal(parentOf('0101'), '01');
  assert.equal(parentOf('01'), null);
  assert.equal(parentOf('995411'), '9954');
  assert.equal(basisFor('04'), 'chapter');
  assert.equal(basisFor('0401'), 'heading');
  assert.equal(basisFor('040110'), 'subheading');
  assert.equal(basisFor('04011010'), 'item');
});

test('cleanDescription strips CBIC dash prefixes and whitespace only', () => {
  assert.equal(cleanDescription('  - -  Other   goods ,'), 'Other goods');
  assert.equal(cleanDescription('LIVE HORSES,ASSES'), 'LIVE HORSES, ASSES');
  assert.equal(cleanDescription('   '), null);
});

test('deriveDescription uses a majority word-prefix, tolerating one typo leaf', () => {
  const leaves = [
    'LIVE HORSES, ASSES, MULES AND HINNIES PURE-BRED BREEDING ANIMALS HORSES',
    'LIVE HORSES, ASSES, MULES AND HINNIES PURE-BRED BREEDING ANIMALS ASSES',
    'LIVE HORSES, ASSES, MULESANDHINNIES PURE-BRED BREEDING ANIMALS OTHER',
    'LIVE HORSES, ASSES, MULES AND HINNIES OTHER HORSES',
    'LIVE HORSES, ASSES, MULES AND HINNIES OTHER ASSES',
  ];
  assert.equal(
    deriveDescription(leaves),
    'LIVE HORSES, ASSES, MULES AND HINNIES'
  );
  assert.equal(deriveDescription(['ONLY ONE LEAF TEXT']), 'ONLY ONE LEAF TEXT');
  assert.equal(deriveDescription(['A x', 'B y', 'C z']), null);
});

test('collapseByPrefix emits the shortest uniform prefix', () => {
  const leaves = new Map([
    ['04011010', '5'],
    ['04011020', '5'],
    ['04021010', '5'],
    ['07011000', '0'],
    ['07021000', '0'],
  ]);
  assert.deepEqual(collapseByPrefix(leaves), [
    { code: '04', key: '5' },
    { code: '07', key: '0' },
  ]);
});

test('collapseByPrefix never lets a prefix cover a leaf with a different value', () => {
  const leaves = new Map([
    ['33051010', '18'],
    ['33051090', '18'],
    ['33059011', 'INVALID:12'],
    ['33059019', '18'],
    ['33061010', '18'],
  ]);
  const out = collapseByPrefix(leaves);
  assert.deepEqual(out, [
    { code: '330510', key: '18' },
    { code: '33059011', key: 'INVALID:12' },
    { code: '33059019', key: '18' },
    { code: '3306', key: '18' },
  ]);
  for (const [leaf, key] of leaves) {
    const covering = out.filter((o) => leaf.startsWith(o.code));
    assert.equal(covering.length, 1, `exactly one entry covers ${leaf}`);
    assert.equal(covering[0].key, key);
  }
});
