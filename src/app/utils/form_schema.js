/**
 * Client helpers for category form schemas (the custom fields a category or a
 * shop asks for on each listing). The server owns the rules and the templates
 * (src/api/services/formSchema.js); these helpers only read schemas.
 */

export const CHOICE_FIELD_TYPES = ['select', 'radio'];
// Only fields with a fixed set of values can be offered as search filters.
export const FILTERABLE_FIELD_TYPES = ['select', 'radio', 'boolean'];

/** The form a shop's listings follow: the shop's own, otherwise its category's. */
export const resolveShopSchema = (shop, category) => {
  if (Array.isArray(shop?.form_schema) && shop.form_schema.length > 0) {
    return shop.form_schema;
  }
  const categorySchema = category?.form_schema || shop?.shopCategory?.form_schema;
  return Array.isArray(categorySchema) ? categorySchema : [];
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
