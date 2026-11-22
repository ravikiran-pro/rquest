// Run with: node --test tests/sections.test.js
//
// Pure checks always run. The migration check runs when RUN_DB_TESTS=1 and DB_* point at a
// scratch database that already has the app's tables (it runs inside a rolled-back transaction).
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  sectionNameKey,
  nameKey,
  checkSectionName,
  fitName,
  pickDisplayName,
  planAutoSections,
  MAX_SECTION_NAME,
} = require('../src/api/services/sections');

test('sectionNameKey trims, collapses spaces and ignores case', () => {
  assert.equal(sectionNameKey('  Fresh   Fruits '), 'fresh fruits');
  assert.equal(sectionNameKey('Fresh\tFruits'), 'fresh fruits');
  assert.equal(sectionNameKey('FRESH FRUITS'), sectionNameKey('fresh fruits'));
  assert.equal(sectionNameKey(null), '');
  assert.equal(nameKey, sectionNameKey);
});

test('checkSectionName and fitName', () => {
  assert.equal(checkSectionName('  ').code, 'name_required');
  assert.equal(checkSectionName('x'.repeat(MAX_SECTION_NAME + 1)).code, 'name_too_long');
  assert.equal(checkSectionName("  Today's   specials ").name, "Today's specials");
  assert.equal(fitName('a'.repeat(70)).length, MAX_SECTION_NAME);
  // A cut that ends on a space is trimmed (the migration does the same)
  assert.equal(fitName(`${'a'.repeat(59)} b`), 'a'.repeat(59));
});

test('pickDisplayName: the most common spelling, ties go to the first seen', () => {
  assert.equal(pickDisplayName(['Snacks', 'snacks', 'Snacks', 'SNACKS ']), 'Snacks');
  assert.equal(pickDisplayName(['Dairy', 'dairy']), 'Dairy');
  assert.equal(pickDisplayName(['', '  ']), null);
});

test('planAutoSections creates missing auto sections, appended in order', () => {
  const plan = planAutoSections(
    [
      { id: 12, name: 'Bakery' },
      { id: 13, name: 'Cafe' },
    ],
    [{ id: 1, name: "Today's specials", name_key: "today's specials", sub_category_id: null, is_auto: false, sort_order: 4 }]
  );
  assert.deepEqual(plan.inserts, [
    { sub_category_id: 12, name: 'Bakery', name_key: 'bakery', sort_order: 5 },
    { sub_category_id: 13, name: 'Cafe', name_key: 'cafe', sort_order: 6 },
  ]);
  assert.deepEqual(plan.adopts, []);
  assert.deepEqual(plan.demotes, []);
});

test('planAutoSections adopts a manual section with the same name or the former auto section', () => {
  const plan = planAutoSections(
    [
      { id: 12, name: 'Bakery' },
      { id: 13, name: 'Cafe' },
    ],
    [
      { id: 7, name: 'bakery', sub_category_id: null, is_auto: false, sort_order: 0 },
      { id: 8, name: 'Coffee & tea', sub_category_id: 13, is_auto: false, sort_order: 1 },
    ]
  );
  assert.deepEqual(plan.inserts, []);
  assert.deepEqual(plan.adopts, [
    { id: 7, sub_category_id: 12 },
    { id: 8, sub_category_id: 13 },
  ]);
});

test('planAutoSections demotes the auto section of a removed sub-category and is a no-op when done', () => {
  const sections = [
    { id: 1, name: 'Bakery', sub_category_id: 12, is_auto: true, sort_order: 0 },
    { id: 2, name: 'Cafe', sub_category_id: 13, is_auto: true, sort_order: 1 },
  ];
  const plan = planAutoSections([{ id: 12, name: 'Bakery' }], sections);
  assert.deepEqual(plan, { inserts: [], adopts: [], demotes: [2] });
  // Re-adding the sub-category adopts its former section again
  const back = planAutoSections(
    [
      { id: 12, name: 'Bakery' },
      { id: 13, name: 'Cafe' },
    ],
    [sections[0], { ...sections[1], is_auto: false }]
  );
  assert.deepEqual(back, { inserts: [], adopts: [{ id: 2, sub_category_id: 13 }], demotes: [] });
  // Already in sync
  assert.deepEqual(planAutoSections([{ id: 12, name: 'Bakery' }], [sections[0]]), { inserts: [], adopts: [], demotes: [] });
});

test('planAutoSections makes a clashing auto name unique', () => {
  const plan = planAutoSections(
    [
      { id: 1, name: 'Repairs' },
      { id: 2, name: 'Repairs' },
    ],
    [{ id: 10, name: 'Repairs', sub_category_id: 1, is_auto: true, sort_order: 0 }]
  );
  assert.deepEqual(plan.inserts, [{ sub_category_id: 2, name: 'Repairs (2)', name_key: 'repairs (2)', sort_order: 1 }]);
});

// ── Optional DB check: the D2 backfill maps tabs to sections ──────────────────────────
const dbTest = process.env.RUN_DB_TESTS === '1' ? test : test.skip;
dbTest('D2 backfill: listing tabs become sections and listings point at them', async () => {
  const { sequelize } = require('../src/api/models');
  const migration = require('../src/api/migrations/20261123000100-shop-sections.js');
  const [shop] = await sequelize.query('SELECT id FROM shops LIMIT 1', { type: sequelize.QueryTypes.SELECT });
  if (!shop) return;
  const t = await sequelize.transaction();
  try {
    const rows = await sequelize.query(
      `SELECT l.id, l.metadata->>'section' AS section, s.name_key
         FROM shop_listings l LEFT JOIN shop_sections s ON s.id = l.section_id
        WHERE COALESCE(l.metadata->>'section', '') <> '' LIMIT 50`,
      { type: sequelize.QueryTypes.SELECT, transaction: t }
    );
    for (const row of rows) assert.equal(row.name_key, sectionNameKey(row.section).slice(0, MAX_SECTION_NAME).trim());
    assert.equal(typeof migration.up, 'function');
  } finally {
    await t.rollback();
    await sequelize.close();
  }
});
