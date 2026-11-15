'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { transform } = require('../sources/hsn');

const rate = (code, igst) => ({
  code,
  igstRate: igst,
  cgstRate: igst / 2,
  sgstRate: igst / 2,
  cessRate: 0,
  rateSource: 'chapter-level',
  effectiveFrom: '2025-09-22',
  notificationRef: 'Notification No. 09/2025-CT(Rate)',
});

const INPUT = {
  packageMeta: { version: 'fixture' },
  chapters: [
    { code: '01', title: 'Live animals' },
    { code: '04', title: 'Dairy produce' },
    { code: '22', title: 'Beverages' },
    { code: '30', title: 'Pharmaceutical products' },
    { code: '85', title: 'Electrical machinery' },
    { code: '99', title: 'Services' },
  ],
  headings: [],
  supplement: [
    { code: '0407', description: "Birds' eggs, in shell", reference: 'WCO' },
  ],
  hsn: [
    { code: '1011010', description: 'LIVE HORSES, ASSES PURE-BRED HORSES' },
    { code: '1011020', description: 'LIVE HORSES, ASSES PURE-BRED ASSES' },
    { code: '4011000', description: 'MILK AND CREAM-FAT <= 1%' },
    {
      code: '4012000',
      description: 'Milk and cream, not concentrated - fat > 1%',
    },
    { code: '22030000', description: '-' },
    { code: '30049011', description: 'MEDICAMENTS AYURVEDIC' },
    { code: '85461000', description: 'INSULATORS OF ANY MATERIAL - OF GLASS' },
    {
      code: '85462011',
      description: 'INSULATORS OF ANY MATERIAL - OF CERAMICS: - PORCELAIN A',
    },
    {
      code: '85462012',
      description: 'INSULATORS OF ANY MATERIAL - OF CERAMICS: - PORCELAIN B',
    },
    {
      code: '85462019',
      description: 'INSULATORS OF ANY MATERIAL - OF CERAMICS: - PORCELAIN C',
    },
    { code: '85469010', description: 'INSULATORS OF ANY MATERIAL - OTHER' },
  ],
  sac: [
    { code: '9954', description: 'Construction services' },
    { code: '995411', description: 'Construction services of single dwelling' },
  ],
  rates: [
    rate('1011010', 0),
    rate('1011020', 0),
    rate('4011000', 0),
    rate('4012000', 0),
    rate('22030000', 18),
    rate('30049011', 12),
    rate('85461000', 18),
    rate('85462011', 18),
    rate('85462012', 18),
    rate('85462019', 18),
    rate('85469010', 18),
  ],
};

const out = transform(INPUT);
const codes = new Map(out.entities.hsn_codes.map((r) => [r.code, r]));
const rates = new Map(out.entities.hsn_rates.map((r) => [r.code, r]));

test('codes are zero-padded and every ancestor exists', () => {
  assert.ok(codes.has('01011010') && !codes.has('1011010'));
  for (const row of codes.values()) {
    if (row.parent_code)
      assert.ok(codes.has(row.parent_code), `parent of ${row.code}`);
  }
  assert.equal(out.rejects.length, 0);
});

test('heading labels vote per child subheading, not per leaf', () => {
  assert.equal(codes.get('8546').description, 'INSULATORS OF ANY MATERIAL');
  assert.equal(codes.get('0401').description, 'MILK AND CREAM');
  assert.equal(codes.get('01').description_basis, 'curated');
});

test('description-less codes are kept as placeholders with no rate', () => {
  const beer = codes.get('22030000');
  assert.equal(beer.description_basis, 'placeholder');
  assert.ok(
    out.review.some(
      (r) => r.kind === 'hsn_description_missing' && r.entity_key === '22030000'
    )
  );
  assert.ok(
    ![...rates.keys()].some((c) => '22030000'.startsWith(c)),
    'no rate covers the placeholder'
  );
});

test('supplemented codes never inherit a collapsed source rate', () => {
  assert.equal(codes.get('0407').description_basis, 'curated');
  assert.ok(
    !rates.has('04'),
    'chapter 04 must not collapse over the unrated 0407'
  );
  assert.equal(rates.get('0401').igst_rate, 0);
  assert.ok(![...rates.keys()].some((c) => '0407'.startsWith(c)));
});

test('abolished GST slabs go to review, never into rates', () => {
  assert.ok(![...rates.keys()].some((c) => '30049011'.startsWith(c)));
  const item = out.review.find((r) => r.kind === 'rate_invalid_slab');
  assert.equal(item.entity_key, '30');
  assert.equal(item.payload.source_igst_rate, 12);
});

test('uniform rates collapse to the shortest prefix; SAC hangs off chapter 99', () => {
  assert.equal(rates.get('85').igst_rate, 18);
  assert.equal(rates.get('01').basis, 'chapter');
  assert.equal(codes.get('9954').parent_code, '99');
  assert.equal(codes.get('99').type, 'SAC');
});

test('curated heading titles win; remaining fallbacks are queued for review', () => {
  const withHeading = transform({
    ...INPUT,
    headings: [
      {
        code: '8546',
        title: 'Electrical insulators of any material',
        reference: 'WCO',
      },
    ],
    hsn: [
      ...INPUT.hsn,
      { code: '96190010', description: 'TAMPONS' },
      { code: '96190020', description: 'CLINICAL DIAPERS' },
    ],
    rates: [...INPUT.rates, rate('96190010', 5), rate('96190020', 5)],
  });
  const byCode = new Map(
    withHeading.entities.hsn_codes.map((r) => [r.code, r])
  );
  assert.equal(
    byCode.get('8546').description,
    'Electrical insulators of any material'
  );
  assert.equal(byCode.get('8546').description_basis, 'curated');
  assert.equal(byCode.get('9619').description, 'Heading 9619');
  assert.ok(
    withHeading.review.some(
      (r) => r.kind === 'hsn_description_fallback' && r.entity_key === '9619'
    )
  );
});
