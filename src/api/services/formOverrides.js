/**
 * Store form customisation and catalogue-owned fields (pure functions; no database access).
 *
 * A shop may override the form of each of its sub-categories (shop_form_overrides):
 *   { fields: { <base key>: { hidden?, label?, required?: true, defaultValue? } },
 *     custom_fields: [ <field>, ... ] }   (up to 10, keys c_*)
 * Locked base fields (source 'catalog' or statutory) cannot be changed, and a field the base
 * marks required cannot be hidden.
 *
 * Catalogue snapshots: a field with a catalog_path reads its value from the listing's
 * catalog_snapshot. A catalogue-owned field with a value there is locked on that listing.
 */
const { normalizeSchema, validateMetadata, coerceValue, isEmpty } = require('./formSchema');

const MAX_CUSTOM_FIELDS = 10;
const MAX_LABEL = 60;
const CUSTOM_KEY_PATTERN = /^c_[a-z0-9_]{1,30}$/;
const CUSTOM_FIELD_TYPES = ['text', 'number', 'select', 'radio', 'boolean', 'date'];
const OVERRIDE_PROPS = ['hidden', 'label', 'required', 'defaultValue'];

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** A field the catalogue or the law owns: a store override may not touch it. */
const isLockedField = (field) => Boolean(field) && (field.source === 'catalog' || field.statutory === true);

const lockedMessage = (field) =>
  `${field.label || field.key} is ${field.source === 'catalog' ? 'set by the catalogue' : 'required by law'} and can't be changed`;

/**
 * Clean and check an override document against the base schema.
 * Returns { override: { fields, custom_fields }, errors: [{ key, message }] }.
 */
function normalizeOverride(input, baseSchema, available = []) {
  const errors = [];
  const fail = (key, message) => errors.push({ key, message });
  const base = Array.isArray(baseSchema) ? baseSchema : [];
  const byKey = new Map(base.filter((f) => f && f.key).map((f) => [f.key, f]));
  const override = { fields: {}, custom_fields: [], enabled_attributes: [] };
  const enableable = new Map((Array.isArray(available) ? available : []).filter((f) => f && f.key).map((f) => [f.key, f]));
  // Researched attributes the store switches on (see services/attributeSets.enableableFields)
  for (const key of enableable.keys()) byKey.set(key, enableable.get(key));

  if (input !== undefined && input !== null && !isPlainObject(input)) {
    return { override, errors: [{ key: null, message: 'The form settings must be an object' }] };
  }
  const src = input || {};

  if (src.fields !== undefined && src.fields !== null && !isPlainObject(src.fields)) {
    fail('fields', 'fields must be an object keyed by field key');
  } else {
    for (const [key, rawProps] of Object.entries(src.fields || {})) {
      const field = byKey.get(key);
      if (!field) {
        fail(key, `"${key}" is not a field of this form`);
        continue;
      }
      if (!isPlainObject(rawProps)) {
        fail(key, `${field.label || key}: settings must be an object`);
        continue;
      }
      const props = {};
      const sent = Object.keys(rawProps).filter((p) => rawProps[p] !== undefined && rawProps[p] !== null);
      const unknown = sent.filter((p) => !OVERRIDE_PROPS.includes(p));
      if (unknown.length) {
        fail(key, `${field.label || key}: only hidden, label, required and defaultValue can be changed`);
        continue;
      }
      // A no-op entry ({ hidden: false } etc.) on a locked field is not a change
      const meaningful = sent.filter(
        (p) => !(p === 'hidden' && rawProps.hidden === false) && !(p === 'required' && rawProps.required === false)
      );
      if (isLockedField(field) && meaningful.length) {
        fail(key, lockedMessage(field));
        continue;
      }
      if (rawProps.hidden === true) {
        if (field.required) {
          fail(key, `${field.label || key} is required and can't be hidden`);
          continue;
        }
        props.hidden = true;
      }
      if (rawProps.label !== undefined && rawProps.label !== null) {
        const label = String(rawProps.label).trim();
        if (!label || label.length > MAX_LABEL) {
          fail(key, `${field.label || key}: label must be 1–${MAX_LABEL} characters`);
          continue;
        }
        if (label !== field.label) props.label = label;
      }
      if (rawProps.required === true && !field.required) props.required = true;
      if (rawProps.defaultValue !== undefined && rawProps.defaultValue !== null && !isEmpty(rawProps.defaultValue)) {
        const coerced = coerceValue(field, rawProps.defaultValue);
        if (coerced.error) {
          fail(key, `Default value: ${coerced.error}`);
          continue;
        }
        props.defaultValue = coerced.value;
      }
      if (Object.keys(props).length) override.fields[key] = props;
    }
  }

  if (src.enabled_attributes !== undefined && src.enabled_attributes !== null && !Array.isArray(src.enabled_attributes)) {
    fail('enabled_attributes', 'enabled_attributes must be a list of attribute keys');
  } else {
    const seen = new Set();
    for (const raw of src.enabled_attributes || []) {
      const key = typeof raw === 'string' ? raw.trim() : '';
      if (seen.has(key)) continue;
      if (!enableable.has(key)) {
        fail(key || 'enabled_attributes', `"${key}" is not an attribute this sub-category can enable`);
        continue;
      }
      seen.add(key);
      override.enabled_attributes.push(key);
    }
  }

  if (src.custom_fields !== undefined && src.custom_fields !== null && !Array.isArray(src.custom_fields)) {
    fail('custom_fields', 'custom_fields must be a list');
  } else {
    const custom = src.custom_fields || [];
    if (custom.length > MAX_CUSTOM_FIELDS) {
      fail('custom_fields', `You can add at most ${MAX_CUSTOM_FIELDS} custom fields`);
    } else {
      const seen = new Set();
      const cleaned = [];
      custom.forEach((raw, index) => {
        if (!isPlainObject(raw)) {
          fail(`custom_fields.${index}`, `Custom field ${index + 1} is not a valid field`);
          return;
        }
        const key = typeof raw.key === 'string' ? raw.key.trim() : '';
        const name = String(raw.label || key || `Custom field ${index + 1}`).trim();
        if (!CUSTOM_KEY_PATTERN.test(key)) {
          fail(key || `custom_fields.${index}`, `${name}: key must start with c_ and use only lowercase letters, numbers and underscores`);
          return;
        }
        if (byKey.has(key) || seen.has(key)) {
          fail(key, `${name}: key "${key}" is already used`);
          return;
        }
        seen.add(key);
        const type = raw.type === undefined || raw.type === null || raw.type === '' ? 'text' : String(raw.type);
        if (!CUSTOM_FIELD_TYPES.includes(type)) {
          fail(key, `${name}: type must be one of ${CUSTOM_FIELD_TYPES.join(', ')}`);
          return;
        }
        cleaned.push({
          key,
          label: raw.label,
          type,
          required: raw.required === true,
          placeholder: raw.placeholder,
          options: raw.options,
          defaultValue: raw.defaultValue,
        });
      });
      const { schema, errors: schemaErrors } = normalizeSchema(cleaned);
      schemaErrors.forEach((e) => fail(e.key || 'custom_fields', e.message));
      override.custom_fields = schema.map((f) => ({ ...f, source: 'store', filterable: false }));
    }
  }

  if (errors.length) override.custom_fields = [];
  return { override, errors };
}

/**
 * The resolved form: base fields in base order with the override applied and hidden fields
 * removed, then the attributes the store enabled (from `available`, in research order), then
 * custom fields. Each field carries origin ('base' | 'enabled' | 'custom'), locked,
 * hidden_allowed and required_locked (for the form settings UI).
 */
function layerSchema(base, override, available = []) {
  const fields = isPlainObject(override) && isPlainObject(override.fields) ? override.fields : {};
  const custom = isPlainObject(override) && Array.isArray(override.custom_fields) ? override.custom_fields : [];
  const enabledKeys = new Set(isPlainObject(override) && Array.isArray(override.enabled_attributes) ? override.enabled_attributes : []);
  const enabled = (Array.isArray(available) ? available : []).filter((f) => f && enabledKeys.has(f.key));
  const out = [];
  for (const field of [...(Array.isArray(base) ? base : []), ...enabled.map((f) => ({ ...f, __enabled: true }))]) {
    if (!field || !field.key) continue;
    const locked = isLockedField(field);
    const props = locked ? {} : fields[field.key] || {};
    if (props.hidden === true && !field.required) continue;
    const { __enabled: isEnabled, ...resolved } = field;
    if (out.some((f) => f.key === resolved.key)) continue;
    if (typeof props.label === 'string' && props.label.trim()) resolved.label = props.label.trim();
    if (props.required === true) resolved.required = true;
    if (props.defaultValue !== undefined && props.defaultValue !== null) resolved.defaultValue = props.defaultValue;
    out.push({
      ...resolved,
      origin: isEnabled ? 'enabled' : 'base',
      locked,
      hidden_allowed: !locked && !field.required,
      required_locked: locked || Boolean(field.required),
    });
  }
  const used = new Set(out.map((f) => f.key));
  for (const field of custom) {
    if (!field || !field.key || used.has(field.key)) continue;
    used.add(field.key);
    out.push({
      ...field,
      source: 'store',
      filterable: false,
      origin: 'custom',
      locked: false,
      hidden_allowed: false,
      required_locked: false,
    });
  }
  return out;
}

const hasFields = (schema) => Array.isArray(schema) && schema.length > 0;

/**
 * Which form a listing follows (most specific first):
 *   1. an override row for (shop, sub-category) → layerSchema(sub form || category form, override)
 *   2. the shop's own form (legacy admin whole-form replacement)
 *   3. the sub-category form
 *   4. the category form
 * Returns { schema, base, source: 'override' | 'shop' | 'sub_category' | 'category' | 'none' }.
 */
function resolveListingSchema({ override, shopForm, subForm, categoryForm, available } = {}) {
  const base = hasFields(subForm) ? subForm : Array.isArray(categoryForm) ? categoryForm : [];
  if (override && isPlainObject(override)) {
    return { schema: layerSchema(base, override, available), base, source: 'override' };
  }
  if (hasFields(shopForm)) return { schema: shopForm, base, source: 'shop' };
  if (hasFields(subForm)) return { schema: subForm, base, source: 'sub_category' };
  if (Array.isArray(categoryForm) && categoryForm.length) return { schema: categoryForm, base, source: 'category' };
  return { schema: [], base, source: 'none' };
}

/** The value at a catalog_path ('brand', 'attributes.dosage_form', ...) in a snapshot. */
function readCatalogPath(snapshot, path) {
  if (!isPlainObject(snapshot) || typeof path !== 'string' || !path) return undefined;
  if (path.startsWith('attributes.')) {
    const attrs = snapshot.attributes;
    return isPlainObject(attrs) ? attrs[path.slice('attributes.'.length)] : undefined;
  }
  return snapshot[path];
}

/**
 * Values the snapshot provides for the schema's fields, and which keys are locked.
 * A value that is empty or does not coerce to the field's type (e.g. 'unknown' on a yes/no
 * field) counts as missing. A catalogue-owned field with a value is locked.
 * Returns { values: { key: value }, lockedKeys: [key] }.
 */
function prefillFromSnapshot(schema, snapshot) {
  const values = {};
  const lockedKeys = [];
  if (!isPlainObject(snapshot)) return { values, lockedKeys };
  for (const field of Array.isArray(schema) ? schema : []) {
    if (!field || !field.key || !field.catalog_path) continue;
    const raw = readCatalogPath(snapshot, field.catalog_path);
    if (isEmpty(raw) || (typeof raw === 'object' && raw !== null)) continue;
    const coerced = coerceValue(field, raw);
    if (coerced.error || isEmpty(coerced.value)) continue;
    values[field.key] = coerced.value;
    if (field.source === 'catalog') lockedKeys.push(field.key);
  }
  return { values, lockedKeys };
}

/** Locked keys of a listing: only catalogue copies (catalog_item_id) with a snapshot have any. */
function lockedKeysFor(schema, listing) {
  if (!listing || !listing.catalog_item_id || !isPlainObject(listing.catalog_snapshot)) return [];
  return prefillFromSnapshot(schema, listing.catalog_snapshot).lockedKeys;
}

/** True when a required field of the schema has no value in metadata. */
function needsDetails(schema, metadata) {
  const meta = isPlainObject(metadata) ? metadata : {};
  return (Array.isArray(schema) ? schema : []).some((f) => f && f.key && f.required && isEmpty(meta[f.key]));
}

/**
 * The rule a catalogue copy checks one field by. Catalogue and statutory fields get no default:
 * the catalogue did not supply the value, so the owner must. A statutory field is required by
 * law, so it is enforced when enforceRequired; a catalogue field stays relaxed (needs details).
 */
function copyCheckField(field, enforceRequired) {
  if (!field || (field.source !== 'catalog' && field.statutory !== true)) return field;
  const rule = { ...field };
  delete rule.defaultValue;
  rule.required = field.statutory === true ? enforceRequired : false;
  return rule;
}

/**
 * The metadata a listing stores, checked against its form.
 *   schema          the resolved form
 *   metadata        values sent by the client
 *   snapshot        catalog_snapshot (catalogue copies only)
 *   catalogItemId   set for catalogue copies; enables locking and relaxed catalogue fields
 *   prefill         fill missing values from the snapshot (imports)
 *   enforceRequired false lets every required field through (starter items)
 * Rules: locked keys are always restored from the snapshot; a required catalogue field that
 * is missing on a catalogue copy is not enforced (the listing needs details instead);
 * a catalogue or statutory field missing on a copy gets no default (see copyCheckField), and a
 * statutory one is reported as missing; required store fields are enforced unless enforceRequired is false.
 * Returns { metadata, errors, lockedKeys, needsDetails }.
 */
function validateListingFields({ schema, metadata, snapshot, catalogItemId, prefill = false, enforceRequired = true }) {
  const fields = Array.isArray(schema) ? schema : [];
  const isCopy = Boolean(catalogItemId) && isPlainObject(snapshot);
  const input = isPlainObject(metadata) ? { ...metadata } : {};
  let lockedKeys = [];
  if (isCopy) {
    const { values, lockedKeys: locked } = prefillFromSnapshot(fields, snapshot);
    lockedKeys = locked;
    for (const [key, value] of Object.entries(values)) {
      if (locked.includes(key) || (prefill && isEmpty(input[key]))) input[key] = value;
    }
  }
  // Catalogue fields on a catalogue copy are filled by the catalogue, not the store
  const checkSchema = catalogItemId ? fields.map((f) => copyCheckField(f, enforceRequired)) : fields;
  const { metadata: clean, errors } = validateMetadata(checkSchema, input, { enforceRequired });
  return { metadata: clean, errors, lockedKeys, needsDetails: needsDetails(fields, clean) };
}

/**
 * Owner answers to a catalogue copy's statutory fields (e.g. Rx, Schedule H), merged into the
 * metadata before validateListingFields checks it. `statutory` is { key: answer }. Only values
 * the field accepts are taken; an unanswered or invalid one is left out, so it stays an error.
 */
function applyOwnerStatutory(schema, metadata, statutory) {
  const meta = isPlainObject(metadata) ? { ...metadata } : {};
  if (!isPlainObject(statutory)) return meta;
  for (const field of Array.isArray(schema) ? schema : []) {
    if (!field || field.statutory !== true || field.source !== 'catalog') continue;
    const raw = statutory[field.key];
    if (raw === undefined || raw === null || raw === '') continue;
    const coerced = coerceValue(field, raw);
    if (!coerced.error && !isEmpty(coerced.value)) meta[field.key] = coerced.value;
  }
  return meta;
}

/** Keys that belong to `fromSchema` but not to `toSchema` (dropped on a sub-category change). */
function keysLeavingSchema(fromSchema, toSchema) {
  const keep = new Set((Array.isArray(toSchema) ? toSchema : []).map((f) => f && f.key));
  return (Array.isArray(fromSchema) ? fromSchema : []).map((f) => f && f.key).filter((k) => k && !keep.has(k));
}

module.exports = {
  MAX_CUSTOM_FIELDS,
  CUSTOM_KEY_PATTERN,
  isLockedField,
  normalizeOverride,
  layerSchema,
  resolveListingSchema,
  readCatalogPath,
  prefillFromSnapshot,
  lockedKeysFor,
  needsDetails,
  validateListingFields,
  applyOwnerStatutory,
  keysLeavingSchema,
};
