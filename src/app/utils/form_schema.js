/**
 * Client helpers for category form schemas (the custom fields a category or a
 * shop asks for on each listing). The server owns the rules and the templates
 * (src/api/services/formSchema.js); these helpers only read schemas.
 */

export const CHOICE_FIELD_TYPES = ['select', 'radio'];
// Only fields with a fixed set of values can be offered as search filters.
export const FILTERABLE_FIELD_TYPES = ['select', 'radio', 'boolean'];

const hasFields = (schema) => Array.isArray(schema) && schema.length > 0;

/* ------------------------------------------------------------------ */
/* Field ownership (docs/catalogue/03-spec.md §C2)                     */
/* ------------------------------------------------------------------ */

export const FIELD_SOURCES = ['store', 'catalog'];

// Where a field's value can be read in a listing's catalogue snapshot
export const CATALOG_PATH_RE =
  /^(brand|manufacturer|gtin|quantity_text|net_quantity|unit|hsn_code|gst_rate|country_of_origin|attributes\.[a-z][a-z0-9_]{0,39})$/;

export const CATALOG_PATH_SUGGESTIONS = [
  'brand',
  'manufacturer',
  'gtin',
  'quantity_text',
  'net_quantity',
  'unit',
  'hsn_code',
  'gst_rate',
  'country_of_origin',
  'attributes.generic',
  'attributes.dosage_form',
  'attributes.prescription_required',
  'attributes.schedule_drug',
  'attributes.food_type',
  'attributes.organic',
  'attributes.shelf_life',
  'attributes.model_number',
  'attributes.service_for',
  'attributes.duration_mins',
];

export const fieldSource = (field) => (field?.source === 'catalog' ? 'catalog' : 'store');

/** True when a store override cannot change the field (catalogue-owned or required by law). */
export const isOverrideLocked = (field) => Boolean(field?.locked) || fieldSource(field) === 'catalog' || Boolean(field?.statutory);

const isEmptyValue = (value) =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

/** A value from a catalogue snapshot by catalog_path ("brand", "attributes.dosage_form"). */
export const readSnapshotPath = (snapshot, path) => {
  if (!snapshot || typeof snapshot !== 'object' || !path || !CATALOG_PATH_RE.test(path)) return undefined;
  if (path.startsWith('attributes.')) {
    const attrs = snapshot.attributes;
    return attrs && typeof attrs === 'object' ? attrs[path.slice('attributes.'.length)] : undefined;
  }
  return snapshot[path];
};

// Loose coercion for display: values that don't fit the field type count as missing
const coerceForField = (field, value) => {
  if (isEmptyValue(value)) return undefined;
  switch (field?.type) {
    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (['true', 'yes', '1'].includes(String(value).toLowerCase())) return true;
      if (['false', 'no', '0'].includes(String(value).toLowerCase())) return false;
      return undefined;
    case 'number': {
      const n = Number(value);
      return Number.isFinite(n) ? n : undefined;
    }
    case 'select':
    case 'radio': {
      const opts = Array.isArray(field.options) ? field.options : [];
      const hit = opts.find((o) => String(o).toLowerCase() === String(value).toLowerCase());
      return hit === undefined ? undefined : hit;
    }
    default:
      return typeof value === 'object' ? undefined : String(value);
  }
};

/**
 * Client mirror of prefillFromSnapshot: values the snapshot fills, and the keys it locks
 * (catalogue-owned fields with a usable value). Store fields with a path are only defaults.
 */
export const prefillFromSnapshot = (fields, snapshot) => {
  const values = {};
  const lockedKeys = [];
  (Array.isArray(fields) ? fields : []).forEach((field) => {
    if (!field?.key || !field.catalog_path) return;
    const value = coerceForField(field, readSnapshotPath(snapshot, field.catalog_path));
    if (value === undefined) return;
    values[field.key] = value;
    if (fieldSource(field) === 'catalog') lockedKeys.push(field.key);
  });
  return { values, lockedKeys };
};

/**
 * Splits a resolved form for an add/edit sheet:
 *   locked:   catalogue facts shown read-only (only when lockedKeys names them)
 *   required: inputs the store must fill
 *   optional: inputs under "More details"
 */
export const splitFields = (fields, lockedKeys = []) => {
  const locked = [];
  const required = [];
  const optional = [];
  const lockedSet = new Set(lockedKeys || []);
  (Array.isArray(fields) ? fields : []).forEach((field) => {
    if (!field?.key) return;
    if (lockedSet.has(field.key)) locked.push(field);
    else if (field.required) required.push(field);
    else optional.push(field);
  });
  return { locked, required, optional };
};

/** A field value as text for read-only chips and spec rows. */
export const formatFieldValue = (field, value) => {
  if (isEmptyValue(value)) return '';
  if (field?.type === 'boolean' || typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
};

/**
 * The form a shop's listings follow, most specific first: the shop's own form, its
 * sub-category's, then its category's. Mirrors resolveSchema on the server.
 */
export const resolveShopSchema = (shop, category, subCategory) => {
  if (hasFields(shop?.form_schema)) return shop.form_schema;
  const subSchema = subCategory?.form_schema || shop?.shopSubCategory?.form_schema;
  if (hasFields(subSchema)) return subSchema;
  const categorySchema = category?.form_schema || shop?.shopCategory?.form_schema;
  return Array.isArray(categorySchema) ? categorySchema : [];
};

/**
 * The kind of store a shop is, from its sub-category (listing type and form template), for
 * screens that adapt labels and presets: 'medical' | 'food' | 'wellness' | 'service' |
 * 'rental' | 'grocery' | 'product'. Returns null when the shop has no sub-category, so
 * callers can fall back to guessing from the shop type text.
 *   grocery:  return 'grocery' for grocery / produce / meat shops (else 'product')
 *   wellness: return 'wellness' for salons and gyms (else 'service')
 */
export const subCategoryArchetype = (shop, { grocery = false, wellness = true } = {}) => {
  const sub = shop?.shopSubCategory;
  if (!sub || !sub.listing_type) return null;
  const template = sub.template_key || '';
  if (template === 'pharmacy') return 'medical';
  if (sub.listing_type === 'food') return 'food';
  if (['salon', 'fitness'].includes(template)) return wellness ? 'wellness' : 'service';
  if (sub.listing_type === 'service') return 'service';
  if (sub.listing_type === 'rental') return 'rental';
  if (grocery && ['grocery', 'produce', 'meat_fish'].includes(template)) return 'grocery';
  return 'product';
};

export const getFilterableFields = (schema) =>
  (Array.isArray(schema) ? schema : []).filter(
    (field) => field?.key && field.filterable && FILTERABLE_FIELD_TYPES.includes(field.type)
  );

/**
 * Problems the admin should fix before saving a form.
 * Returns a list of { index, message }; the server runs the full check on save.
 */
export const getSchemaIssues = (fields) => {
  const issues = [];
  const seen = new Map();
  (Array.isArray(fields) ? fields : []).forEach((field, index) => {
    const name = field?.label?.trim() || `Field ${index + 1}`;
    if (!field?.label?.trim()) {
      issues.push({ index, message: `Field ${index + 1} needs a label` });
    }
    const key = (field?.key || '').trim();
    if (!key) {
      issues.push({ index, message: `${name}: key is missing` });
    } else if (seen.has(key)) {
      issues.push({ index, message: `${name}: key "${key}" is already used by field ${seen.get(key) + 1}` });
    } else {
      seen.set(key, index);
    }
    if (CHOICE_FIELD_TYPES.includes(field?.type) && (field.options || []).length < 2) {
      issues.push({ index, message: `${name}: add at least 2 options` });
    }
    if (field?.source !== undefined && field.source !== null && !FIELD_SOURCES.includes(field.source)) {
      issues.push({ index, message: `${name}: owner must be Store or Catalogue` });
    }
    const path = typeof field?.catalog_path === 'string' ? field.catalog_path.trim() : '';
    if (path && !CATALOG_PATH_RE.test(path)) {
      issues.push({ index, message: `${name}: "${path}" is not a catalogue path (e.g. brand or attributes.dosage_form)` });
    }
  });
  return issues;
};

/**
 * True when a listing matches every active filter.
 * filters is { fieldKey: value }; empty values mean "any".
 */
export const matchesSchemaFilters = (item, filters) =>
  Object.entries(filters || {}).every(([key, wanted]) => {
    if (wanted === undefined || wanted === null || wanted === '') return true;
    const actual = item?.metadata?.[key];
    if (typeof wanted === 'boolean') return Boolean(actual) === wanted;
    return String(actual ?? '').toLowerCase() === String(wanted).toLowerCase();
  });

/**
 * The filters worth showing for a set of listings: filterable fields that at
 * least one listing has a value for, each with the values actually in use.
 */
export const getAvailableFilters = (schema, listings) =>
  getFilterableFields(schema)
    .map((field) => {
      const used = (listings || [])
        .map((item) => item?.metadata?.[field.key])
        .filter((value) => value !== undefined && value !== null && value !== '');
      if (field.type === 'boolean') {
        return used.some(Boolean) ? { ...field, values: [true] } : null;
      }
      const values = (field.options || []).filter((opt) =>
        used.some((value) => String(value).toLowerCase() === String(opt).toLowerCase())
      );
      return values.length > 0 ? { ...field, values } : null;
    })
    .filter(Boolean);
