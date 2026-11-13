// Run with: node --test tests/formSchema.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  FORM_TEMPLATES,
  suggestTemplate,
  listTemplates,
  normalizeSchema,
  validateMetadata,
  resolveSchema,
  mergeFilterFields,
  buildMetadataFilter,
} = require('../src/api/services/formSchema');

test('every built-in template is a valid schema', () => {
  for (const template of FORM_TEMPLATES) {
    const { schema, errors } = normalizeSchema(template.fields);
    assert.deepEqual(errors, [], `template ${template.key}`);
    assert.equal(schema.length, template.fields.length);
  }
  assert.equal(listTemplates().length, FORM_TEMPLATES.length);
  assert.equal(listTemplates()[0].keywords, undefined);
});

test('suggestTemplate matches a category name and falls back to general', () => {
  assert.equal(suggestTemplate('Medical & Pharmacy').key, 'pharmacy');
  assert.equal(suggestTemplate('Restaurants').key, 'food');
  assert.equal(suggestTemplate('Cake Shop').key, 'bakery');
  assert.equal(suggestTemplate('Bike Rental').key, 'rentals');
  assert.equal(suggestTemplate('Electronics').key, 'electronics');
  assert.equal(suggestTemplate('Electrical Hardware').key, 'hardware');
  assert.equal(suggestTemplate('Pet Supplies').key, 'general');
  assert.equal(suggestTemplate('').key, 'general');
  assert.equal(suggestTemplate(undefined).key, 'general');
});

test('normalizeSchema cleans a valid schema', () => {
  const { schema, errors } = normalizeSchema([
    { label: ' Fabric Type ', type: 'select', options: ['Cotton', ' Silk ', 'cotton', ''], filterable: true, required: 1 },
    { key: 'Wash Care', label: 'Wash care', type: 'text', filterable: true, placeholder: ' Hand wash ' },
    { key: 'stock', label: 'Stock', type: 'number', defaultValue: '5' },
  ]);
  assert.deepEqual(errors, []);
  assert.deepEqual(schema[0], {
    key: 'fabric_type',
    label: 'Fabric Type',
    type: 'select',
    required: true,
    options: ['Cotton', 'Silk'],
    filterable: true,
  });
  // free-text fields cannot be filters
  assert.equal(schema[1].key, 'wash_care');
  assert.equal(schema[1].filterable, false);
  assert.equal(schema[1].placeholder, 'Hand wash');
  assert.equal(schema[2].defaultValue, 5);
});

test('normalizeSchema reports problems', () => {
  const messages = (input) => normalizeSchema(input).errors.map((e) => e.message).join(' | ');
  assert.match(messages('nope'), /must be a list/);
  assert.match(messages([{ key: 'a', label: '' }]), /needs a label/);
  assert.match(messages([{ label: 'Size' }, { label: 'size' }]), /more than one field/);
  assert.match(messages([{ label: 'Section' }]), /used by the system/);
  assert.match(messages([{ label: '9 lives' }]), /must start with a letter/);
  assert.match(messages([{ label: 'Kind', type: 'select', options: ['one'] }]), /at least 2 options/);
  assert.match(messages([{ label: 'Kind', type: 'colour' }]), /unknown field type/);
  assert.match(
    messages([{ label: 'Kind', type: 'select', options: ['a', 'b'], defaultValue: 'c' }]),
    /Default value/
  );
  assert.match(messages(new Array(41).fill({ label: 'x' })), /at most 40 fields/);
  assert.deepEqual(normalizeSchema(undefined), { schema: [], errors: [] });
  assert.deepEqual(normalizeSchema([]), { schema: [], errors: [] });
});

const pharmacy = normalizeSchema(FORM_TEMPLATES.find((t) => t.key === 'pharmacy').fields).schema;

test('validateMetadata converts values and fills defaults', () => {
  const { metadata, errors } = validateMetadata(pharmacy, {
    dosage_form: 'capsules',
    expiry_date: '2027-06-30',
    prescription_required: 'yes',
    batch_no: '  B-1 ',
    section: 'Tablets',
    category_id: 4,
  });
  assert.deepEqual(errors, []);
  assert.equal(metadata.dosage_form, 'Capsules'); // matched to the option's spelling
  assert.equal(metadata.prescription_required, true);
  assert.equal(metadata.schedule_drug, false); // default
  assert.equal(metadata.batch_no, 'B-1');
  assert.equal(metadata.section, 'Tablets'); // keys outside the schema are kept
  assert.equal(metadata.category_id, 4);
  assert.equal('composition' in metadata, false);
});

test('validateMetadata rejects missing and invalid values', () => {
  const { errors } = validateMetadata(pharmacy, {
    dosage_form: 'Lozenge',
    expiry_date: '31-12-2026',
    prescription_required: 'maybe',
  });
  assert.deepEqual(errors.map((e) => e.key), ['dosage_form', 'expiry_date', 'prescription_required']);
  assert.deepEqual(
    validateMetadata(pharmacy, {}).errors.map((e) => e.key),
    ['dosage_form', 'expiry_date']
  );
  assert.equal(validateMetadata(pharmacy, { dosage_form: 'Drops', expiry_date: '2026-02-30' }).errors.length, 1);

  const numeric = [{ key: 'warranty', label: 'Warranty', type: 'number', required: true }];
  assert.equal(validateMetadata(numeric, { warranty: '12' }).metadata.warranty, 12);
  assert.equal(validateMetadata(numeric, { warranty: 0 }).errors.length, 0);
  assert.equal(validateMetadata(numeric, { warranty: 'a year' }).errors.length, 1);
  assert.equal(validateMetadata(numeric, { warranty: true }).errors.length, 1);
});

test('validateMetadata can let required fields through for system-added items', () => {
  const { metadata, errors } = validateMetadata(pharmacy, {}, { enforceRequired: false });
  assert.deepEqual(errors, []);
  assert.deepEqual(metadata, { prescription_required: false, schedule_drug: false });
  // wrong values are still rejected
  assert.equal(
    validateMetadata(pharmacy, { dosage_form: 'Lozenge' }, { enforceRequired: false }).errors.length,
    1
  );
});

test('validateMetadata with no schema keeps metadata unchanged', () => {
  assert.deepEqual(validateMetadata([], { a: 1 }), { metadata: { a: 1 }, errors: [] });
  assert.deepEqual(validateMetadata(null, null), { metadata: {}, errors: [] });
});

test('resolveSchema prefers the shop form over the category form', () => {
  const category = { form_schema: [{ key: 'a' }] };
  assert.deepEqual(resolveSchema({ form_schema: [{ key: 's' }] }, category), [{ key: 's' }]);
  assert.deepEqual(resolveSchema({ form_schema: [] }, category), [{ key: 'a' }]);
  assert.deepEqual(resolveSchema(null, null), []);
});

test('buildMetadataFilter accepts only filterable fields and converts values', () => {
  const ok = buildMetadataFilter({ dosage_form: 'capsules', prescription_required: 'true', batch_no: '' }, pharmacy);
  assert.deepEqual(ok.errors, []);
  assert.deepEqual(ok.filter, { dosage_form: 'Capsules', prescription_required: true });

  assert.equal(buildMetadataFilter({ batch_no: 'B-1' }, pharmacy).errors.length, 1); // not filterable
  assert.equal(buildMetadataFilter({ dosage_form: 'Lozenge' }, pharmacy).errors.length, 1);

  // without a schema only plain values on well-formed keys pass
  assert.deepEqual(buildMetadataFilter({ food_type: 'veg' }, null).filter, { food_type: 'veg' });
  assert.equal(buildMetadataFilter({ 'bad key': 'x' }, null).errors.length, 1);
  assert.equal(buildMetadataFilter({ food_type: { $ne: 1 } }, null).errors.length, 1);
  assert.deepEqual(buildMetadataFilter(undefined, pharmacy), { filter: {}, errors: [] });
});

test('mergeFilterFields merges filterable fields across forms by key', () => {
  const bakery = normalizeSchema(FORM_TEMPLATES.find((t) => t.key === 'bakery').fields).schema;
  const food = normalizeSchema(FORM_TEMPLATES.find((t) => t.key === 'food').fields).schema;
  const fields = mergeFilterFields([food, bakery, pharmacy, null]);
  assert.deepEqual(
    fields.map((f) => f.key),
    ['food_type', 'spice_level', 'made_to_order', 'dosage_form', 'prescription_required']
  );
  // options from both forms, first label kept, no duplicates
  assert.deepEqual(fields[0].options, ['veg', 'non-veg', 'vegan', 'egg', 'eggless']);
  assert.equal(fields[0].label, 'Dietary Tag');
  assert.equal(fields[2].options, undefined); // toggles have no options
  // a toggle and a dropdown sharing a key stay as the first one seen
  const clash = mergeFilterFields([
    [{ key: 'organic', label: 'Organic', type: 'boolean', filterable: true }],
    [{ key: 'organic', label: 'Organic', type: 'select', options: ['Yes', 'No'], filterable: true }],
  ]);
  assert.deepEqual(clash, [{ key: 'organic', label: 'Organic', type: 'boolean', filterable: true }]);
  assert.deepEqual(mergeFilterFields([]), []);
  assert.deepEqual(mergeFilterFields(undefined), []);
});
