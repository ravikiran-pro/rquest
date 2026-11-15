'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeGtin, displayGtin } = require('../lib/gtin');
const {
  parseQuantity,
  splitTrailingQuantity,
  formatQuantity,
} = require('../lib/quantity');

test('GTIN: UPC-A and its EAN-13 form are one identity', () => {
  assert.equal(normalizeGtin('012345678905').gtin, '00012345678905');
  assert.equal(normalizeGtin('0012345678905').gtin, '00012345678905');
  assert.equal(normalizeGtin('8901030384652').gtin, null, 'bad check digit');
  assert.equal(normalizeGtin('8901030384652').reason, 'bad_check_digit');
  assert.equal(normalizeGtin('8901063010307').gtin, '08901063010307');
  assert.equal(displayGtin('08901063010307'), '8901063010307');
});

test('GTIN: lengths, EAN-8, all-zero and in-store ranges', () => {
  assert.equal(normalizeGtin('96385074').gtin, '00000096385074');
  assert.equal(displayGtin('00000096385074'), '96385074');
  assert.equal(normalizeGtin('12345').reason, 'bad_length');
  assert.equal(normalizeGtin('0000000000000').reason, 'all_zero');
  assert.equal(normalizeGtin('2012345678903').reason, 'restricted_circulation');
  assert.equal(normalizeGtin(null).reason, 'empty');
});

test('quantity: units convert to g / ml / pc', () => {
  assert.deepEqual(parseQuantity('500 g'), {
    value: 500,
    unit: 'g',
    packCount: null,
  });
  assert.deepEqual(parseQuantity('1 Kg'), {
    value: 1000,
    unit: 'g',
    packCount: null,
  });
  assert.deepEqual(parseQuantity('1.5kg'), {
    value: 1500,
    unit: 'g',
    packCount: null,
  });
  assert.deepEqual(parseQuantity('1 L'), {
    value: 1000,
    unit: 'ml',
    packCount: null,
  });
  assert.deepEqual(parseQuantity('200ML'), {
    value: 200,
    unit: 'ml',
    packCount: null,
  });
  assert.deepEqual(parseQuantity('500 gms'), {
    value: 500,
    unit: 'g',
    packCount: null,
  });
  assert.deepEqual(parseQuantity('1,000 g'), {
    value: 1000,
    unit: 'g',
    packCount: null,
  });
  assert.deepEqual(parseQuantity('10 tablets'), {
    value: 10,
    unit: 'pc',
    packCount: null,
  });
  assert.deepEqual(parseQuantity('Pack of 6'), {
    value: 6,
    unit: 'pc',
    packCount: null,
  });
});

test('quantity: multipacks multiply out', () => {
  assert.deepEqual(parseQuantity('2 x 200 ml'), {
    value: 400,
    unit: 'ml',
    packCount: 2,
  });
  assert.deepEqual(parseQuantity('200g x 3'), {
    value: 600,
    unit: 'g',
    packCount: 3,
  });
  assert.deepEqual(parseQuantity('1 kg (2 x 500 g)'), {
    value: 1000,
    unit: 'g',
    packCount: 2,
  });
});

test('quantity: nonsense is null, not a guess', () => {
  assert.equal(parseQuantity(''), null);
  assert.equal(parseQuantity('large'), null);
  assert.equal(parseQuantity('7 Up'), null);
  assert.equal(parseQuantity('0 g'), null);
});

test('trailing pack size is split off the name, other numbers are kept', () => {
  assert.deepEqual(splitTrailingQuantity('Amul Butter 500g'), {
    name: 'Amul Butter',
    quantity: { value: 500, unit: 'g', packCount: null },
  });
  assert.equal(splitTrailingQuantity('Tata Salt (1 kg)').name, 'Tata Salt');
  assert.equal(splitTrailingQuantity('Maggi 2-Minute Noodles').quantity, null);
  assert.equal(splitTrailingQuantity('7 Up').name, '7 Up');
  assert.equal(
    splitTrailingQuantity('500g').quantity,
    null,
    'never strip the whole name'
  );
});

test('formatQuantity uses the friendly unit', () => {
  assert.equal(formatQuantity({ value: 1000, unit: 'g' }), '1 kg');
  assert.equal(formatQuantity({ value: 1500, unit: 'ml' }), '1.5 l');
  assert.equal(formatQuantity({ value: 6, unit: 'pc' }), '6 pc');
});
