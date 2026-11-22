// Run with: node --test tests/stock.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  defaultStockMode,
  normaliseStockInput,
  applyStockFields,
  deriveAvailability,
  stockState,
  planOrderStock,
  planRestock,
} = require('../src/api/services/stock');

const apply = (current, body, options) => {
  const parsed = normaliseStockInput(body);
  assert.equal(parsed.code, undefined, JSON.stringify(parsed));
  return applyStockFields(current, parsed.input, options);
};

test('defaultStockMode by listing type, template and snapshot', () => {
  assert.equal(defaultStockMode({ listingType: 'service' }), 'always');
  assert.equal(defaultStockMode({ listingType: 'food' }), 'toggle');
  assert.equal(defaultStockMode({ listingType: 'rental' }), 'toggle');
  assert.equal(defaultStockMode({ listingType: 'product', snapshot: { attributes: { loose: true } } }), 'toggle');
  assert.equal(defaultStockMode({ listingType: 'product', snapshot: { attributes: { sold_by: 'kg' } } }), 'toggle');
  assert.equal(defaultStockMode({ listingType: 'product', templateKey: 'produce' }), 'toggle');
  assert.equal(defaultStockMode({ listingType: 'product', templateKey: 'meat_fish' }), 'toggle');
  assert.equal(defaultStockMode({ listingType: 'product', templateKey: 'grocery' }), 'tracked');
  assert.equal(defaultStockMode({ listingType: 'product', snapshot: { kind: 'service' } }), 'always');
  assert.equal(defaultStockMode(), 'tracked');
});

test('a tracked default without a quantity falls back to toggle; with one it stays tracked', () => {
  const none = apply(null, {}, { defaultMode: 'tracked' });
  assert.deepEqual(none.values, { stock_mode: 'toggle', stock_qty: null, low_stock_threshold: null, is_available: true });
  const withQty = apply(null, { stock_qty: '12' }, { defaultMode: 'tracked' });
  assert.equal(withQty.values.stock_mode, 'tracked');
  assert.equal(withQty.values.stock_qty, 12);
  assert.equal(withQty.values.low_stock_threshold, 5);
  assert.equal(withQty.values.is_available, true);
});

test('tracked needs a quantity; qty 0 means unavailable', () => {
  assert.equal(apply(null, { stock_mode: 'tracked' }).code, 'stock_qty_required');
  const zero = apply(null, { stock_mode: 'tracked', stock_qty: 0 });
  assert.equal(zero.values.is_available, false);
  // Switching an existing toggle listing to tracked also needs a quantity
  const toggle = { stock_mode: 'toggle', stock_qty: null, is_available: true, low_stock_threshold: null };
  assert.equal(apply(toggle, { stock_mode: 'tracked' }).code, 'stock_qty_required');
  // A tracked listing keeps its quantity when only the threshold changes
  const tracked = { stock_mode: 'tracked', stock_qty: 4, is_available: true, low_stock_threshold: 2 };
  assert.deepEqual(apply(tracked, { low_stock_threshold: 3 }).values, {
    stock_mode: 'tracked',
    stock_qty: 4,
    low_stock_threshold: 3,
    is_available: true,
  });
});

test('toggle keeps the owner flag, always forces true, conflicts are errors', () => {
  const off = apply(null, { stock_mode: 'toggle', is_available: false, stock_qty: 9 });
  assert.equal(off.values.is_available, false);
  assert.equal(off.values.stock_qty, null);
  const current = { stock_mode: 'toggle', is_available: false, stock_qty: null, low_stock_threshold: null };
  assert.equal(apply(current, {}).values.is_available, false);
  assert.equal(apply(current, { is_available: 'true' }).values.is_available, true);

  const always = apply(null, { stock_mode: 'always' });
  assert.equal(always.values.is_available, true);
  assert.equal(apply(null, { stock_mode: 'always', is_available: false }).code, 'is_available_derived');
  assert.equal(apply(null, { stock_mode: 'tracked', stock_qty: 3, is_available: false }).code, 'is_available_derived');
  // Matching the derived value is fine
  assert.equal(apply(null, { stock_mode: 'tracked', stock_qty: 3, is_available: true }).values.stock_qty, 3);
});

test('normaliseStockInput rejects bad values and reads legacy keys', () => {
  assert.equal(normaliseStockInput({ stock_mode: 'counted' }).code, 'invalid_stock_mode');
  assert.equal(normaliseStockInput({ stock_qty: -1 }).code, 'invalid');
  assert.equal(normaliseStockInput({ stock_qty: 1.5 }).code, 'invalid');
  assert.equal(normaliseStockInput({ stock_qty: 'ten' }).code, 'invalid');
  assert.equal(normaliseStockInput({ is_available: 'maybe' }).code, 'invalid');
  assert.equal(normaliseStockInput({ stock: '7' }).input.stock_qty, 7);
  assert.equal(normaliseStockInput({ stock_quantity: 3 }).input.stock_qty, 3);
  assert.equal(normaliseStockInput({ delta: '-2' }).input.delta, -2);
  assert.deepEqual(normaliseStockInput({ stock_qty: '' }).input, {});
});

test('deriveAvailability', () => {
  assert.equal(deriveAvailability('tracked', 0), false);
  assert.equal(deriveAvailability('tracked', 2), true);
  assert.equal(deriveAvailability('always', 0, false), true);
  assert.equal(deriveAvailability('toggle', null, false), false);
  assert.equal(deriveAvailability('toggle', null, undefined), true);
});

test('stockState thresholds', () => {
  assert.equal(stockState({ stock_mode: 'tracked', stock_qty: 0 }), 'out');
  assert.equal(stockState({ stock_mode: 'tracked', stock_qty: 5, low_stock_threshold: 5 }), 'low');
  assert.equal(stockState({ stock_mode: 'tracked', stock_qty: 6, low_stock_threshold: 5 }), 'in_stock');
  assert.equal(stockState({ stock_mode: 'tracked', stock_qty: 3, low_stock_threshold: null }), 'low');
  assert.equal(stockState({ stock_mode: 'tracked', stock_qty: 1, low_stock_threshold: 0 }), 'in_stock');
  assert.equal(stockState({ stock_mode: 'toggle', is_available: false }), 'out');
  assert.equal(stockState({ stock_mode: 'toggle', is_available: true }), 'in_stock');
  assert.equal(stockState({ stock_mode: 'always', is_available: false }), 'in_stock');
});

test('planOrderStock sums duplicate lines and rejects unavailable or short items', () => {
  const listings = new Map([
    ['a', { id: 'a', name: 'Salt', stock_mode: 'tracked', stock_qty: 5, is_available: true }],
    ['b', { id: 'b', name: 'Brownie', stock_mode: 'toggle', stock_qty: null, is_available: false }],
    ['c', { id: 'c', name: 'Haircut', stock_mode: 'always', stock_qty: null, is_available: true }],
    ['d', { id: 'd', name: 'Tomato', stock_mode: 'toggle', stock_qty: null, is_available: true }],
  ]);
  const ok = planOrderStock(
    [
      { listing_id: 'a', quantity: 2 },
      { listing_id: 'c', quantity: 1 },
      { listing_id: 'a', quantity: 3 },
      { listing_id: 'd', quantity: 4 },
    ],
    listings
  );
  assert.deepEqual(ok.short, []);
  assert.deepEqual(ok.deductions, [{ listing_id: 'a', quantity: 5 }]);
  assert.deepEqual(ok.lineDeducted, [2, 0, 3, 0]);

  const bad = planOrderStock(
    [
      { listing_id: 'a', quantity: 4 },
      { listing_id: 'a', quantity: 2 },
      { listing_id: 'b', quantity: 1 },
    ],
    listings
  );
  assert.deepEqual(bad.short, [
    { listing_id: 'a', name: 'Salt', requested: 6, available: 5 },
    { listing_id: 'b', name: 'Brownie', requested: 1, available: 0 },
  ]);
});

test('planRestock: only deducted lines, only tracked listings, and a second run is a no-op', () => {
  const items = [
    { listing_id: 'a', stock_deducted: 2 },
    { listing_id: 'a', stock_deducted: 3 },
    { listing_id: 'b', stock_deducted: 0 },
    { listing_id: 'c', stock_deducted: 4 },
  ];
  const listings = new Map([
    ['a', { stock_mode: 'tracked' }],
    ['b', { stock_mode: 'tracked' }],
    ['c', { stock_mode: 'toggle' }],
  ]);
  assert.deepEqual(planRestock(items, listings), [{ listing_id: 'a', quantity: 5 }]);
  // After the restock every line is zeroed (order_items.stock_deducted = 0)
  const after = items.map((i) => ({ ...i, stock_deducted: 0 }));
  assert.deepEqual(planRestock(after, listings), []);
  // Without listing info every deducted line counts (the SQL re-checks the mode)
  assert.deepEqual(planRestock(items), [
    { listing_id: 'a', quantity: 5 },
    { listing_id: 'c', quantity: 4 },
  ]);
});
