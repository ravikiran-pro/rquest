// Run with: node --test tests/shopSubCategories.test.js
//
// Pure checks always run. The API checks run when API_BASE is set, against a server whose
// database has the shop_sub_categories migration and (for browse) the catalog schema loaded,
// e.g.:  API_BASE=http://localhost:3199/api/v1 AUTH_TOKEN=<same secret> node --test tests/...
// The DB checks also need the same DB_* settings as the server (they read through the models).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { parseSubCategoryIds, capError, DEFAULT_MAX_SUB_CATEGORIES } = require('../src/api/services/shopSubCategories');

const ROOT = path.join(__dirname, '..');
const API = process.env.API_BASE;
const SECRET = process.env.AUTH_TOKEN || '';

// ── Pure ──────────────────────────────────────────────────────────────────────────────
test('sub_category_ids is an ordered, distinct list', () => {
  assert.deepEqual(parseSubCategoryIds({ sub_category_ids: [39, '1', 2] }), { provided: true, ids: [39, 1, 2] });
  assert.match(parseSubCategoryIds({ sub_category_ids: [1, 1] }).error, /only be chosen once/);
  assert.match(parseSubCategoryIds({ sub_category_ids: [1, 'x'] }).error, /Invalid sub-category id/);
  assert.match(parseSubCategoryIds({ sub_category_ids: 'x' }).error, /list/);
});

test('the older sub_category_id is a one-item list; null or empty clears', () => {
  assert.deepEqual(parseSubCategoryIds({ sub_category_id: 7 }), { provided: true, ids: [7] });
  assert.deepEqual(parseSubCategoryIds({ sub_category_id: null }), { provided: true, ids: [] });
  assert.deepEqual(parseSubCategoryIds({}), { provided: false });
});

test('the cap: platform default 5, and a clear message above it', () => {
  assert.equal(DEFAULT_MAX_SUB_CATEGORIES, 5);
  assert.equal(capError([1, 2, 3, 4, 5], 5), null);
  assert.match(capError([1, 2, 3, 4, 5, 6], 5), /at most 5/);
});

// ── API (needs API_BASE) ──────────────────────────────────────────────────────────────
const apiTest = API ? test : test.skip;
const jwt = API ? require(path.join(ROOT, 'node_modules/jsonwebtoken')) : null;
const OWNER_ID = '00000000-0000-4000-8000-0000000000aa';
const ADMIN_ROLE = 'd5e858d8-636c-4fc3-8c3a-0a76131c95e9';
const MERCHANT_ROLE = 'a5e858d8-636c-4fc3-8c3a-0a76131c95e5';
const owner = () => (jwt ? jwt.sign({ user_id: OWNER_ID, role_id: MERCHANT_ROLE }, SECRET) : '');
const admin = () => (jwt ? jwt.sign({ user_id: OWNER_ID, role_id: ADMIN_ROLE }, SECRET) : '');
const stranger = () => (jwt ? jwt.sign({ user_id: '00000000-0000-4000-8000-000000000000', role_id: MERCHANT_ROLE }, SECRET) : '');

async function call(method, url, body, token) {
  const res = await fetch(`${API}/${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// Sub-category ids by key, from the live tree
let subId = {};
async function loadSubIds() {
  if (Object.keys(subId).length) return;
  const tree = (await call('GET', 'shops/my_categories')).body.data;
  for (const sub of tree.flatMap((c) => c.sub_categories)) subId[sub.key] = sub.id;
}

const newShop = async (sub_category_ids, extra = {}) =>
  call(
    'POST',
    'shops/client_register',
    {
      shop_name: `Test Shop ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      latitude: 12.9,
      longitude: 80.2,
      sub_category_ids,
      ...extra,
    },
    owner()
  );

apiTest('my_categories reports the platform limit', async () => {
  const r = await call('GET', 'shops/my_categories');
  assert.deepEqual(r.body.limits, { max_sub_categories: 5 });
});

apiTest('create and update take several sub-categories; the first is primary', async () => {
  await loadSubIds();
  const created = await newShop([subId.kirana, subId.salon, subId.pharmacy]);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const shop = created.body.data;
  assert.deepEqual(shop.sub_category_ids, [subId.kirana, subId.salon, subId.pharmacy]);
  assert.equal(shop.sub_category_id, subId.kirana);
  assert.equal(shop.max_sub_categories, 5);

  const updated = await call('PUT', `shops/${shop.id}`, { sub_category_ids: [subId.pharmacy, subId.kirana] }, owner());
  assert.equal(updated.status, 201, JSON.stringify(updated.body));
  assert.deepEqual(updated.body.data.sub_category_ids, [subId.pharmacy, subId.kirana]);
  assert.equal(updated.body.data.sub_category_id, subId.pharmacy);
});

apiTest('the old single sub_category_id still works', async () => {
  await loadSubIds();
  const created = await newShop(undefined, { sub_category_id: subId.kirana });
  assert.deepEqual(created.body.data.sub_category_ids, [subId.kirana]);
});

apiTest('more than the cap is refused with 400', async () => {
  await loadSubIds();
  const six = Object.values(subId).slice(0, 6);
  const r = await newShop(six);
  assert.equal(r.status, 400);
  assert.match(r.body.error, /at most 5/);
});

apiTest('an unknown sub-category id is refused', async () => {
  const r = await newShop([999999]);
  assert.equal(r.status, 400);
  assert.match(r.body.error, /Sub-category not found/);
});

apiTest('admin raises a shop cap; non-admins cannot; the cap cannot go below the chosen count', async () => {
  await loadSubIds();
  const shop = (await newShop([subId.kirana, subId.salon, subId.pharmacy, subId.fruits_vegetables])).body.data;
  const denied = await call('PUT', 'master/shops/max_sub_categories', { shop_id: shop.id, max_sub_categories: 6 }, owner());
  assert.equal(denied.status, 403);
  const low = await call('PUT', 'master/shops/max_sub_categories', { shop_id: shop.id, max_sub_categories: 3 }, admin());
  assert.equal(low.status, 409);
  const raised = await call('PUT', 'master/shops/max_sub_categories', { shop_id: shop.id, max_sub_categories: 6 }, admin());
  assert.equal(raised.status, 200, JSON.stringify(raised.body));
  assert.equal(raised.body.data.max_sub_categories, 6);
  const bad = await call('PUT', 'master/shops/max_sub_categories', { shop_id: shop.id, max_sub_categories: 21 }, admin());
  assert.equal(bad.status, 400);
});

apiTest('search matches a shop by any of its sub-categories', async () => {
  await loadSubIds();
  const shop = (await newShop([subId.kirana, subId.fruits_vegetables])).body.data;
  const r = await call('POST', 'shops/search', { sub_category_id: subId.fruits_vegetables, search: '' });
  assert.ok(r.body.data.some((s) => s.id === shop.id), 'secondary sub-category should match');
});

apiTest('browse: items of the shop’s sub-categories, already_added, kind and status filters', async () => {
  await loadSubIds();
  const shop = (await newShop([subId.kirana])).body.data;
  const base = `catalog/browse?shop_id=${shop.id}`;

  const all = await call('GET', `${base}&sub_category_id=${subId.kirana}&limit=100`, undefined, owner());
  assert.equal(all.status, 200, JSON.stringify(all.body));
  assert.ok(Array.isArray(all.body.data) && all.body.count >= 1);
  assert.equal(all.body.sub_category.id, subId.kirana);
  const rice = all.body.data.find((i) => i.id === 'src:test:rice');
  assert.ok(rice, 'rice is under kirana');
  assert.equal(rice.already_added, null);
  assert.ok(!all.body.data.some((i) => i.id === 'src:test:snack'), 'inactive items are hidden');
  assert.ok(!all.body.data.some((i) => i.id === 'src:test:rej'), 'rejected items are hidden');

  const services = await call('GET', `${base}&all=1&kind=service`, undefined, owner());
  assert.ok(services.body.data.length && services.body.data.every((i) => i.kind === 'service'));

  const imported = await call(
    'POST',
    'catalog/import-bulk',
    { shop_id: shop.id, sub_category_id: subId.kirana, items: [{ item_id: 'src:test:rice', price: 90 }] },
    owner()
  );
  assert.equal(imported.body.created.length, 1, JSON.stringify(imported.body));

  const added = await call('GET', `${base}&sub_category_id=${subId.kirana}&status=added`, undefined, owner());
  assert.deepEqual(added.body.data.map((i) => i.id), ['src:test:rice']);
  assert.equal(added.body.data[0].already_added, imported.body.created[0]);
  const notAdded = await call('GET', `${base}&sub_category_id=${subId.kirana}&status=not_added`, undefined, owner());
  assert.ok(!notAdded.body.data.some((i) => i.id === 'src:test:rice'));

  const defaulted = await call('GET', base, undefined, owner());
  assert.equal(defaulted.status, 200);
  assert.equal(defaulted.body.sub_category.id, subId.kirana, 'defaults to the shop’s own sub-category');

  const denied = await call('GET', base, undefined, stranger());
  assert.equal(denied.status, 403);
});

apiTest('import-bulk: partial success, duplicates skipped, 200 items max', async () => {
  await loadSubIds();
  const shop = (await newShop([subId.kirana])).body.data;
  const r = await call(
    'POST',
    'catalog/import-bulk',
    {
      shop_id: shop.id,
      items: [
        { item_id: 'src:test:rice', price: 90 },
        { item_id: 'src:test:rice', price: 95 },
        { item_id: 'src:test:nope', price: 10 },
        { item_id: 'src:test:oil' },
        { item_id: 'src:test:oil', price: 120, stock: 4 },
      ],
    },
    owner()
  );
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.created.length, 2);
  assert.deepEqual(r.body.skipped, [
    { item_id: 'src:test:rice', reason: 'already_added' },
    { item_id: 'src:test:nope', reason: 'not_found' },
    { item_id: 'src:test:oil', reason: 'invalid_price' },
  ]);

  const tooMany = Array.from({ length: 201 }, () => ({ item_id: 'src:test:rice', price: 1 }));
  const big = await call('POST', 'catalog/import-bulk', { shop_id: shop.id, items: tooMany }, owner());
  assert.equal(big.status, 400);
  assert.match(big.body.error, /at most 200/);
});

apiTest('single import records metadata.sub_category_id on the copy', async () => {
  await loadSubIds();
  const shop = (await newShop([subId.kirana])).body.data;
  const r = await call(
    'POST',
    'catalog/import',
    { shop_id: shop.id, item_id: 'src:test:para', price: 40 },
    owner()
  );
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.metadata.sub_category_id, subId.kirana);
  assert.equal(r.body.data.metadata.catalog_item_id, 'src:test:para');
});

apiTest('starter listings are gone after the migration (the ordered one is kept)', async () => {
  const models = require(path.join(ROOT, 'src/api/models'));
  try {
    const [gone] = await models.sequelize.query(
      "SELECT count(*)::int AS n FROM shop_listings WHERE name IN ('Basmati Rice (1kg)','Chakki Atta Flour (5kg)','Men’s Haircut & Styling') AND metadata = '{}'::jsonb",
      { type: models.sequelize.QueryTypes.SELECT }
    );
    assert.equal(gone.n, 0);
    const [kept] = await models.sequelize.query(
      "SELECT count(*)::int AS n FROM shop_listings WHERE name = 'Refined Sunflower Oil (1L)'",
      { type: models.sequelize.QueryTypes.SELECT }
    );
    assert.equal(kept.n, 1, 'an ordered starter is kept');
  } finally {
    await models.sequelize.close();
  }
});
