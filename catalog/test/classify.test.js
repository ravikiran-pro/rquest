'use strict';

/** Runs against the real seeds/ files: a reordered or broken rule fails here first. */

const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../lib/product');

const seeds = P.loadProductSeeds(path.join(__dirname, '..', 'seeds'));
const byName = (name) => P.classify([], name, seeds).node;

test('product-form words beat ingredient words', () => {
  assert.equal(byName('Cadbury Dairy Milk Chocolate'), 'ondc:RET10-1047');
  assert.equal(byName('Butter Cookies'), 'ondc:RET10-1045');
  assert.equal(byName('Peanut Butter Crunchy'), 'ondc:RET10-103B');
  assert.equal(byName('Butter Chicken Masala'), 'ondc:RET10-1040');
  assert.equal(byName('Milk Rusk'), 'ondc:RET10-1004');
});

test('regressions from the first real-data spot check', () => {
  assert.equal(
    byName('Pro Performance 100% Whey - Chocolate Fudge'),
    'ondc:RET18'
  );
  assert.equal(byName('Cheese Jalapeno Nachos'), 'ondc:RET10-1046');
  assert.equal(byName('Peanut and Rajgira chikki'), 'ondc:RET10-1049');
  assert.equal(byName('Full Fat Greek Yoghurt'), 'ondc:RET10-1006');
  assert.equal(byName('Methi dana'), 'ondc:RET10-1040');
  assert.equal(byName('Happy Treats French Fries'), 'ondc:RET10-1044');
  assert.equal(byName('Flavored Drink Mango'), 'ondc:RET10-1018');
  assert.equal(byName('Gulab Jamun Mix'), 'ondc:RET10-104A');
});

test('personal care beats food words; hair oil is not cooking oil', () => {
  assert.equal(byName('Parachute Coconut Hair Oil'), 'ondc:RET10-100B');
  assert.equal(byName('Fortune Sunflower Oil'), 'ondc:RET10-1042');
  assert.equal(byName('Milk Protein Face Wash'), 'ondc:RET10-1014');
});

test('word boundaries: no substring hits', () => {
  assert.equal(byName('Eggless Cake'), 'ondc:RET10-1005');
  assert.equal(byName('Milkshake Strawberry'), null);
  assert.equal(byName('S24 Ultra Waterproof Case'), null);
});

test('deepest mapped source category wins over broad tags and keywords', () => {
  const r = P.classify(
    ['en:dairies', 'en:butter-fat', 'en:ghee'],
    'Anything Biscuits',
    seeds
  );
  assert.deepEqual(
    [r.node, r.basis, r.matched],
    ['ondc:RET10-1043', 'source_category', 'en:ghee']
  );
});

test('every seed points at a node id with a valid scheme prefix', () => {
  for (const node of [
    ...seeds.byTag.values(),
    ...seeds.rules.map((r) => r.node),
  ]) {
    assert.match(node, /^(ondc|shopify|shop_type|service):[A-Za-z0-9-]+$/);
  }
});

test('names: promo text stripped, shouting tamed, acronyms kept', () => {
  assert.equal(
    P.stripPromo('Maggi Noodles (Buy 2 Get 1 Free) MRP Rs 14'),
    'Maggi Noodles'
  );
  assert.equal(P.stripPromo('Sugar Free Chocolate'), 'Sugar Free Chocolate');
  assert.equal(
    P.titleCaseIfShouting('MTR READY TO EAT POHA', 'MTR'),
    'MTR Ready To Eat Poha'
  );
  assert.equal(P.titleCaseIfShouting('almond', null), 'Almond');
  assert.equal(P.titleCaseIfShouting('maSti Curd', null), 'MaSti Curd');
});

test('brands collapse through aliases and punctuation-insensitive keys', () => {
  assert.deepEqual(P.brandOf('Haldirams, Haldiram Foods', seeds), {
    key: 'haldiram s',
    display: "Haldiram's",
    raw: 'Haldirams',
  });
  assert.equal(
    P.brandOf('AMUL', seeds).key,
    P.brandOf('Amul Gujarat Co-operative Milk Marketing Federation', seeds).key
  );
  assert.equal(P.brandOf('', seeds), null);
});

test('identity: barcode first, then brand|name|quantity, else per record', () => {
  const q = { value: 500, unit: 'g' };
  assert.equal(
    P.identityOf({ gtin: '08901063010307' }).id,
    'gtin:08901063010307'
  );
  const a = P.identityOf({
    brandKey: 'amul',
    nameKeyValue: 'amul butter',
    quantity: q,
    source: 's',
    sourceId: '1',
  });
  const b = P.identityOf({
    brandKey: 'amul',
    nameKeyValue: 'amul butter',
    quantity: q,
    source: 's',
    sourceId: '2',
  });
  assert.equal(a.id, b.id, 'same product from two records → one item');
  assert.match(a.id, /^key:[0-9a-f]{20}$/);
  assert.equal(
    P.identityOf({ nameKeyValue: 'x', source: 'off-india', sourceId: '42' }).id,
    'src:off-india:42'
  );
});

test('quality gate needs name, brand, category and (quantity or barcode)', () => {
  const full = {
    name: 'x',
    brand: {},
    quantity: {},
    category: 'n',
    gtin: 'g',
    image: 'i',
    diet: 'veg',
  };
  assert.deepEqual(P.qualityOf(full), { score: 100, status: 'ready' });
  assert.equal(P.qualityOf({ ...full, brand: null }).status, 'incomplete');
  assert.equal(P.qualityOf({ ...full, quantity: null }).status, 'ready');
  assert.equal(
    P.qualityOf({ ...full, quantity: null, gtin: null }).status,
    'incomplete'
  );
});

test('regressions from the first load: masala vs pav, spice-flavoured tea', () => {
  assert.equal(byName('Aachi 50G Pav Bhaji Masala'), 'ondc:RET10-1040');
  assert.equal(byName('Ladi Pav'), 'ondc:RET10-1003');
  assert.equal(byName('Adrak Elaichi Chai - Low Sugar'), 'ondc:RET10-101F');
  assert.equal(byName('Aachi Tea Masala'), 'ondc:RET10-1040');
  assert.equal(byName('Elaichi Powder'), 'ondc:RET10-1040');
  assert.equal(byName('Aachi Rice Pongal Mix'), 'ondc:RET10-104A');
});
