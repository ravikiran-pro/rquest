'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { encodeValue, encodeRow } = require('../lib/copy');
const { cleanText, nameKey } = require('../lib/text');
const { parseCsv } = require('../lib/csv');
const { contentHash, stableStringify } = require('../lib/hash');

test('COPY encoding escapes control characters and drops NUL', () => {
  assert.equal(encodeValue(null), '\\N');
  assert.equal(encodeValue(undefined), '\\N');
  assert.equal(encodeValue(true), 't');
  assert.equal(encodeValue(12.5), '12.5');
  assert.equal(encodeValue('a\tb\nc\\d\re'), 'a\\tb\\nc\\\\d\\re');
  assert.equal(encodeValue('x\u0000y'), 'xy');
  assert.equal(encodeValue({ a: 'q\u0000' }), '{"a":"q"}');
  assert.throws(() => encodeValue(NaN));
  assert.equal(encodeRow({ a: 1, b: null }, ['a', 'b']), '1\t\\N\n');
});

test('cleanText removes markup and normalises spacing, never words', () => {
  assert.equal(
    cleanText('<b>Amul</b>&nbsp;Butter ,  500g'),
    'Amul Butter, 500g'
  );
  assert.equal(cleanText('Rice\u200B (Basmati )'), 'Rice (Basmati)');
  assert.equal(cleanText(''), null);
  assert.equal(cleanText(null), null);
});

test('nameKey is case/accent/punctuation insensitive', () => {
  assert.equal(nameKey('Café  Coffee-Day & Co.'), 'cafe coffee day and co');
  assert.equal(nameKey('AMUL Butter'), nameKey('amul   butter!'));
});

test('parseCsv handles quotes, escaped quotes, CRLF and comments', () => {
  const rows = parseCsv(
    '# comment\r\ncode,title\r\n01,"Live animals"\r\n04,"Dairy ""produce"", eggs"\r\n'
  );
  assert.deepEqual(rows, [
    { code: '01', title: 'Live animals' },
    { code: '04', title: 'Dairy "produce", eggs' },
  ]);
  assert.throws(() => parseCsv('a,b\n1\n'));
});

test('contentHash is independent of key order', () => {
  assert.equal(
    contentHash({ a: 1, b: [1, 2] }),
    contentHash({ b: [1, 2], a: 1 })
  );
  assert.notEqual(contentHash({ a: 1 }), contentHash({ a: 2 }));
  assert.equal(stableStringify({ b: 1, a: undefined }), '{"b":1}');
});
