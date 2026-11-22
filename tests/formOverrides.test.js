// Run with: node --test tests/formOverrides.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeOverride,
  layerSchema,
  resolveListingSchema,
  prefillFromSnapshot,
  lockedKeysFor,
  validateListingFields,
  applyOwnerStatutory,
  keysLeavingSchema,
} = require('../src/api/services/formOverrides');
const { FORM_TEMPLATES, normalizeSchema } = require('../src/api/services/formSchema');

const template = (key) => normalizeSchema(FORM_TEMPLATES.find((t) => t.key === key).fields).schema;
const salon = template('salon');
const pharmacy = template('pharmacy');
const bakery = template('bakery');

test('layerSchema: hide, rename, require, default; custom fields appended; flags', () => {
  const resolved = layerSchema(salon, {
    fields: {
      service_mode: { hidden: true },
      duration_mins: { label: 'Time needed', required: true, defaultValue: 30 },
    },
    custom_fields: [{ key: 'c_hair_wash', label: 'Includes hair wash', type: 'boolean', defaultValue: false }],
  });
  const keys = resolved.map((f) => f.key);
  assert.deepEqual(keys, ['service_for', 'duration_mins', 'appointment_required', 'c_hair_wash']);
  const duration = resolved.find((f) => f.key === 'duration_mins');
  assert.equal(duration.label, 'Time needed');
  assert.equal(duration.required, true);
  assert.equal(duration.defaultValue, 30);
  assert.equal(duration.origin, 'base');
  assert.equal(duration.locked, false);
  assert.equal(duration.hidden_allowed, true);
  const custom = resolved.at(-1);
  assert.equal(custom.origin, 'custom');
  assert.equal(custom.source, 'store');
  assert.equal(custom.filterable, false);
  // No override: every base field, flagged
  assert.equal(layerSchema(salon, null).length, salon.length);
});

test('layerSchema ignores overrides on locked fields and hiding required ones', () => {
  const resolved = layerSchema(bakery, { fields: { food_type: { hidden: true, label: 'Veg?' } } });
  const food = resolved.find((f) => f.key === 'food_type');
  assert.ok(food, 'statutory field cannot be hidden');
  assert.equal(food.label, 'Dietary Tag');
  assert.equal(food.locked, true);
  assert.equal(food.required_locked, true);
  assert.equal(food.hidden_allowed, false);
});

test('normalizeOverride accepts the allowed changes', () => {
  const { override, errors } = normalizeOverride(
    {
      fields: { service_mode: { hidden: true }, duration_mins: { label: ' Time needed ', required: true, defaultValue: '30' } },
      custom_fields: [{ key: 'c_hair_wash', label: 'Includes hair wash', type: 'boolean', defaultValue: 'no' }],
    },
    salon
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(override.fields, {
    service_mode: { hidden: true },
    duration_mins: { label: 'Time needed', required: true, defaultValue: 30 },
  });
  assert.equal(override.custom_fields[0].defaultValue, false);
  assert.equal(override.custom_fields[0].source, 'store');
});

test('normalizeOverride rejects locked, required-hidden, unknown and bad custom fields', () => {
  const keysOf = (input, base) => normalizeOverride(input, base).errors.map((e) => e.key);
  // catalogue field
  const catalogue = normalizeOverride({ fields: { composition: { label: 'Salt' } } }, pharmacy).errors;
  assert.match(catalogue[0].message, /set by the catalogue/);
  // statutory field
  const statutory = normalizeOverride({ fields: { food_type: { hidden: true } } }, bakery).errors;
  assert.match(statutory[0].message, /required by law/);
  // a no-op entry on a locked field is fine
  assert.deepEqual(normalizeOverride({ fields: { food_type: { hidden: false } } }, bakery).errors, []);
  // base-required field cannot be hidden (fashion.gender is required, store-owned)
  assert.deepEqual(keysOf({ fields: { gender: { hidden: true } } }, template('fashion')), ['gender']);
  // unknown base key
  assert.deepEqual(keysOf({ fields: { colourway: { hidden: true } } }, salon), ['colourway']);
  // unknown prop
  assert.deepEqual(keysOf({ fields: { service_mode: { options: ['A', 'B'] } } }, salon), ['service_mode']);
  // label too long
  assert.deepEqual(keysOf({ fields: { service_mode: { label: 'x'.repeat(61) } } }, salon), ['service_mode']);
  // custom: 11 fields
  const eleven = Array.from({ length: 11 }, (_, i) => ({ key: `c_f${i}`, label: `F${i}`, type: 'text' }));
  assert.deepEqual(keysOf({ custom_fields: eleven }, salon), ['custom_fields']);
  // custom: key without c_
  assert.deepEqual(keysOf({ custom_fields: [{ key: 'wash', label: 'Wash', type: 'text' }] }, salon), ['wash']);
  // custom: duplicate key, and a key clashing with the base
  assert.deepEqual(
    keysOf(
      {
        custom_fields: [
          { key: 'c_a', label: 'A', type: 'text' },
          { key: 'c_a', label: 'A again', type: 'text' },
        ],
      },
      salon
    ),
    ['c_a']
  );
  // custom: unsupported type
  assert.deepEqual(keysOf({ custom_fields: [{ key: 'c_notes', label: 'Notes', type: 'textarea' }] }, salon), ['c_notes']);
  // errors drop the custom fields
  assert.deepEqual(normalizeOverride({ custom_fields: eleven }, salon).override.custom_fields, []);
});

test('prefillFromSnapshot: paths, missing values and locking', () => {
  const snapshot = {
    brand: 'Cipla',
    manufacturer: 'Cipla Ltd',
    quantity_text: 'Strip of 15',
    attributes: { generic: 'Paracetamol 650mg', dosage_form: 'strip / tablets', prescription_required: 'unknown' },
  };
  const { values, lockedKeys } = prefillFromSnapshot(pharmacy, snapshot);
  assert.equal(values.dosage_form, 'Strip / Tablets');
  assert.equal(values.composition, 'Paracetamol 650mg');
  assert.equal(values.manufacturer, 'Cipla Ltd');
  assert.equal(values.pack_size, 'Strip of 15');
  // 'unknown' on a yes/no field is missing → not locked, editable by the store
  assert.equal('prescription_required' in values, false);
  assert.equal(lockedKeys.includes('prescription_required'), false);
  assert.ok(lockedKeys.includes('dosage_form'));
  // A store field with a catalog_path is a prefill only, never locked
  const salonPrefill = prefillFromSnapshot(salon, { attributes: { duration_mins: 20 } });
  assert.equal(salonPrefill.values.duration_mins, 20);
  assert.deepEqual(salonPrefill.lockedKeys, []);
  // A custom product (no catalog_item_id) has no locked keys
  assert.deepEqual(lockedKeysFor(pharmacy, { catalog_item_id: null, catalog_snapshot: snapshot }), []);
  assert.ok(lockedKeysFor(pharmacy, { catalog_item_id: 'gtin:1', catalog_snapshot: snapshot }).includes('composition'));
});

test('validateListingFields restores locked keys and relaxes catalogue fields on copies', () => {
  const snapshot = { attributes: { generic: 'Paracetamol 650mg', dosage_form: 'Syrup / Liquid' } };
  // Update input tries to change a locked catalogue value
  const updated = validateListingFields({
    schema: pharmacy,
    metadata: { composition: 'Something else', dosage_form: 'Drops', batch_no: 'B1', prescription_required: false, schedule_drug: false },
    snapshot,
    catalogItemId: 'gtin:1',
  });
  assert.deepEqual(updated.errors, []);
  assert.equal(updated.metadata.composition, 'Paracetamol 650mg');
  assert.equal(updated.metadata.dosage_form, 'Syrup / Liquid');
  assert.equal(updated.metadata.batch_no, 'B1');

  // Required catalogue field missing on an import: not enforced, flagged as needs details.
  // Statutory fields the catalogue lacks are reported missing (no default is filled for them).
  const gap = validateListingFields({ schema: pharmacy, metadata: {}, snapshot: { attributes: {} }, catalogItemId: 'gtin:2', prefill: true });
  assert.deepEqual(gap.errors.map((e) => e.key), ['prescription_required', 'schedule_drug']);
  assert.equal(gap.needsDetails, true);
  // Starter items and imports (enforceRequired false) leave them empty rather than defaulting
  const lenient = validateListingFields({
    schema: pharmacy,
    metadata: {},
    snapshot: { attributes: {} },
    catalogItemId: 'gtin:2',
    enforceRequired: false,
  });
  assert.deepEqual(lenient.errors, []);
  assert.equal('prescription_required' in lenient.metadata, false);

  // The same field on a custom product is enforced
  const custom = validateListingFields({ schema: pharmacy, metadata: {} });
  assert.deepEqual(custom.errors.map((e) => e.key), ['dosage_form']);

  // Required store fields are always enforced, also on copies
  const required = layerSchema(pharmacy, { fields: { batch_no: { required: true } } });
  const store = validateListingFields({ schema: required, metadata: {}, snapshot, catalogItemId: 'gtin:3', prefill: true });
  assert.deepEqual(store.errors.map((e) => e.key), ['prescription_required', 'schedule_drug', 'batch_no']);
});

test('resolution order: override > legacy shop form > sub-category > category', () => {
  const shopForm = [{ key: 'shop_field', label: 'Shop', type: 'text', required: false, filterable: false }];
  const subForm = salon;
  const categoryForm = [{ key: 'cat_field', label: 'Cat', type: 'text', required: false, filterable: false }];
  const override = { fields: { service_mode: { hidden: true } }, custom_fields: [] };

  const withOverride = resolveListingSchema({ override, shopForm, subForm, categoryForm });
  assert.equal(withOverride.source, 'override');
  assert.equal(withOverride.schema.some((f) => f.key === 'service_mode'), false);
  assert.ok(withOverride.schema.some((f) => f.key === 'service_for'));

  assert.equal(resolveListingSchema({ shopForm, subForm, categoryForm }).source, 'shop');
  assert.equal(resolveListingSchema({ shopForm: [], subForm, categoryForm }).source, 'sub_category');
  assert.equal(resolveListingSchema({ subForm: [], categoryForm }).source, 'category');
  assert.equal(resolveListingSchema({}).source, 'none');
  // An override on a sub-category without fields layers on the category form
  const onCategory = resolveListingSchema({ override: { fields: {} }, subForm: [], categoryForm });
  assert.deepEqual(onCategory.schema.map((f) => f.key), ['cat_field']);
});

test('keysLeavingSchema: keys of the old form that the new form does not have', () => {
  assert.deepEqual(keysLeavingSchema(bakery, salon), bakery.map((f) => f.key));
  assert.deepEqual(keysLeavingSchema(salon, salon), []);
});

test('applyOwnerStatutory: owner answers fill a copy\'s statutory fields before the copy rules check them', () => {
  const snapshot = { attributes: { generic: 'Paracetamol 650mg', prescription_status: 'unknown' } };
  // Catalogue has no value: the owner's answers are accepted, nothing is reported missing
  const answered = applyOwnerStatutory(pharmacy, { batch_no: 'B1' }, { prescription_required: true, schedule_drug: false });
  assert.deepEqual(answered.prescription_required, true);
  assert.deepEqual(answered.schedule_drug, false);
  const checked = validateListingFields({ schema: pharmacy, metadata: answered, snapshot, catalogItemId: 'gtin:4', prefill: true });
  assert.deepEqual(checked.errors.filter((e) => ['prescription_required', 'schedule_drug'].includes(e.key)), []);
  assert.equal(checked.metadata.prescription_required, true);
  assert.equal(checked.metadata.schedule_drug, false);

  // Left unanswered, or answered with something the field does not take: still an error
  const partial = applyOwnerStatutory(pharmacy, {}, { prescription_required: 'maybe' });
  assert.equal('prescription_required' in partial, false);
  const missing = validateListingFields({ schema: pharmacy, metadata: partial, snapshot, catalogItemId: 'gtin:4', prefill: true });
  assert.deepEqual(missing.errors.map((e) => e.key), ['prescription_required', 'schedule_drug']);

  // Only catalogue statutory fields take owner answers; the store's own fields are not touched
  assert.deepEqual(applyOwnerStatutory(pharmacy, {}, { batch_no: 'X' }), {});
  assert.deepEqual(applyOwnerStatutory(pharmacy, null, null), {});

  // A false answer is an answer, not a missing one (validator must not treat it as empty)
  const falseOnly = validateListingFields({
    schema: pharmacy,
    metadata: applyOwnerStatutory(pharmacy, {}, { prescription_required: false, schedule_drug: false }),
    snapshot,
    catalogItemId: 'gtin:5',
    prefill: true,
  });
  assert.deepEqual(falseOnly.errors, []);
  assert.equal(falseOnly.metadata.prescription_required, false);
  assert.equal(falseOnly.metadata.schedule_drug, false);

  // Select statutory field (Kirana Dietary Tag): an owner answer is coerced to the option
  const grocery = template('grocery');
  const diet = validateListingFields({
    schema: grocery,
    metadata: applyOwnerStatutory(grocery, {}, { food_type: 'veg' }),
    snapshot: { attributes: {} },
    catalogItemId: 'gtin:6',
    prefill: true,
  });
  assert.deepEqual(diet.errors.filter((e) => e.key === 'food_type'), []);
  assert.equal(diet.metadata.food_type, 'veg');
});
