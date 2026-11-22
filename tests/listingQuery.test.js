// Run with: node --test tests/listingQuery.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isLegacyQuery,
  parseListingQuery,
  buildListingWhere,
  listingOrder,
  needsDetailsCondition,
  MAX_LIMIT,
  DEFAULT_LIMIT,
} = require('../src/api/services/listingQuery');

const parse = (query, scope) => parseListingQuery(query, { scope });

test('legacy mode: no paging or filter params', () => {
  assert.equal(isLegacyQuery({}), true);
  assert.equal(isLegacyQuery({ type: 'food' }), true);
  assert.equal(isLegacyQuery({ limit: '10' }), false);
  assert.equal(isLegacyQuery({ q: '' }), false);
  assert.equal(parse({}, 'public').params.legacy, true);
  assert.equal(parse({ section_id: '4' }, 'public').params.legacy, false);
  // Owners always page
  assert.equal(parse({}, 'owner').params.legacy, false);
});

test('limit and offset: defaults, clamping and errors', () => {
  assert.equal(parse({ limit: '' }, 'public').params.limit, DEFAULT_LIMIT);
  assert.equal(parse({ limit: '500' }, 'public').params.limit, MAX_LIMIT);
  assert.equal(parse({ limit: '0' }, 'public').params.limit, 1);
  assert.equal(parse({ limit: 'ten' }, 'public').code, 'bad_param');
  assert.equal(parse({ limit: '-3' }, 'public').code, 'bad_param');
  assert.equal(parse({ offset: '60' }, 'public').params.offset, 60);
  assert.equal(parse({ offset: '100001' }, 'public').code, 'bad_param');
  assert.equal(parse({ offset: '1.5' }, 'public').code, 'bad_param');
});

test('stock filters: in|out publicly, more for owners', () => {
  assert.equal(parse({ stock: 'out' }, 'public').params.stock, 'out');
  assert.equal(parse({ stock: 'low' }, 'public').params.stock, null);
  assert.equal(parse({ stock: 'tracked' }, 'public').params.stock, null);
  assert.equal(parse({ stock: 'low' }, 'owner').params.stock, 'low');
  assert.equal(parse({ stock: 'always' }, 'owner').params.stock, 'always');
  assert.equal(parse({ stock: 'nope' }, 'owner').code, 'bad_param');
  assert.equal(parse({ stock: 'nope' }, 'public').code, 'bad_param');
});

test('q length, ids, sort and owner flags', () => {
  assert.equal(parse({ q: '  atta ' }, 'public').params.q, 'atta');
  assert.equal(parse({ q: '   ' }, 'public').params.q, null);
  assert.equal(parse({ q: 'x'.repeat(100) }, 'public').params.q.length, 100);
  assert.equal(parse({ q: 'x'.repeat(101) }, 'public').code, 'bad_param');
  assert.equal(parse({ section_id: '44' }, 'public').params.section_id, 44);
  assert.equal(parse({ section_id: 'none' }, 'public').params.section_id, 'none');
  assert.equal(parse({ section_id: 'abc' }, 'public').code, 'bad_param');
  assert.equal(parse({ sub_category_id: '12' }, 'public').params.sub_category_id, 12);
  assert.equal(parse({ sub_category_id: 'x' }, 'public').code, 'bad_param');
  assert.equal(parse({ sort: 'price_desc' }, 'public').params.sort, 'price_desc');
  assert.equal(parse({ sort: 'random' }, 'public').code, 'bad_param');
  assert.equal(parse({ type: 'food' }, 'public').params.type, 'food');
  assert.equal(parse({ type: 'all' }, 'public').params.type, null);
  assert.equal(parse({}, 'owner').params.include_hidden, true);
  assert.equal(parse({ include_hidden: '0' }, 'owner').params.include_hidden, false);
  assert.equal(parse({ needs_details: '1' }, 'owner').params.needs_details, true);
  assert.equal(parse({ needs_details: '1' }, 'public').params.needs_details, false);
});

test('buildListingWhere: parameterised, hidden sections excluded publicly', () => {
  const { params } = parse({ q: "50% off_'x", section_id: '3', stock: 'in', sub_category_id: '9' }, 'public');
  const { sql, replacements } = buildListingWhere(params, { shopId: 'shop-1', scope: 'public' });
  assert.match(sql, /l\.shop_id = :shop_id/);
  assert.match(sql, /hs\.is_hidden/);
  assert.match(sql, /l\.section_id = :section_id/);
  assert.match(sql, /l\.sub_category_id = :sub_category_id/);
  assert.equal(sql.includes("50%"), false, 'user text never enters the SQL');
  assert.equal(replacements.q_like, "%50\\% off\\_'x%");
  assert.equal(replacements.section_id, 3);

  const owner = buildListingWhere(parse({ stock: 'low' }, 'owner').params, { shopId: 's', scope: 'owner' });
  assert.equal(owner.sql.includes('hs.is_hidden'), false);
  assert.match(owner.sql, /low_stock_threshold/);
  const ownerNoHidden = buildListingWhere(parse({ include_hidden: '0' }, 'owner').params, { shopId: 's', scope: 'owner' });
  assert.match(ownerNoHidden.sql, /hs\.is_hidden/);
  assert.match(buildListingWhere({ section_id: 'none' }, { shopId: 's' }).sql, /l\.section_id IS NULL/);
});

test('needsDetailsCondition and ordering', () => {
  const none = needsDetailsCondition(new Map());
  assert.equal(none.sql, 'FALSE');
  const cond = needsDetailsCondition(
    new Map([
      [12, ['dosage_form']],
      [null, ['gender', 'size']],
      [13, []],
    ])
  );
  assert.match(cond.sql, /l\.sub_category_id = :nd_s1/);
  assert.match(cond.sql, /l\.sub_category_id IS NULL/);
  assert.deepEqual(Object.values(cond.replacements).sort(), [12, 'dosage_form', 'gender', 'size'].sort());
  const owner = buildListingWhere(parse({ needs_details: '1' }, 'owner').params, {
    shopId: 's',
    scope: 'owner',
    needsDetails: cond,
  });
  assert.ok(owner.sql.includes(cond.sql));
  assert.equal(listingOrder('default'), 'l.is_available DESC, l.name ASC, l.id ASC');
  assert.match(listingOrder('newest'), /createdAt" DESC/);
});
