/**
 * Category taxonomy helpers: build sub-category forms, validate the taxonomy data file,
 * sync it into the categories / sub_categories tables, and match free text (a shop's
 * type, Google category or name) to a sub-category.
 *
 * Works on a plain Sequelize instance with raw SQL, so migrations, seeders and scripts
 * can use it without loading the app's models.
 */
const { CATEGORIES, SUB_CATEGORIES } = require('../data/taxonomy');
const { FORM_TEMPLATES, normalizeSchema, annotateFieldSources } = require('./formSchema');
const attributeSets = require('./attributeSets');

const LISTING_TYPES = ['product', 'food', 'service', 'rental'];
const KEY_PATTERN = /^[a-z][a-z0-9_]{1,49}$/;

const normalizeName = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * The listing form of a sub-category. With attribute research (data/attributeSets.json) it
 * is the researched basic form; otherwise its template's fields, minus omitted ones, plus
 * extras. Everything else in the research can be switched on per store.
 */
const buildSubCategoryForm = (sub) => {
  const template = FORM_TEMPLATES.find((t) => t.key === sub.template);
  if (!template) throw new Error(`${sub.key}: unknown form template "${sub.template}"`);
  const omit = new Set(sub.omit_fields || []);
  const legacy = [
    ...template.fields.filter((f) => !omit.has(f.key)),
    ...(sub.extra_fields || []),
  ];
  const fields = attributeSets.basicFormFields(sub, legacy) || legacy;
  // Extra fields carry no ownership props; known catalogue keys (brand, ...) get them here
  const { schema, errors } = normalizeSchema(annotateFieldSources(fields));
  if (errors.length) {
    throw new Error(`${sub.key}: ${errors.map((e) => e.message).join('; ')}`);
  }
  return schema;
};

/** Every problem in the taxonomy data file, as messages. Empty means valid. */
const validateTaxonomy = () => {
  const problems = [];
  const categoryKeys = new Set();
  CATEGORIES.forEach((c) => {
    if (!KEY_PATTERN.test(c.key)) problems.push(`category ${c.key}: bad key`);
    if (categoryKeys.has(c.key)) problems.push(`category ${c.key}: duplicate key`);
    categoryKeys.add(c.key);
  });

  const subKeys = new Set();
  const aliasOwner = new Map();
  const fallbacks = new Map();
  SUB_CATEGORIES.forEach((s) => {
    if (!KEY_PATTERN.test(s.key)) problems.push(`${s.key}: bad key`);
    if (subKeys.has(s.key)) problems.push(`${s.key}: duplicate key`);
    subKeys.add(s.key);
    if (!categoryKeys.has(s.category)) problems.push(`${s.key}: unknown category ${s.category}`);
    if (!LISTING_TYPES.includes(s.listing_type)) problems.push(`${s.key}: bad listing_type ${s.listing_type}`);
    if (!s.name || !String(s.name).trim()) problems.push(`${s.key}: missing name`);
    const template = FORM_TEMPLATES.find((t) => t.key === s.template);
    (s.omit_fields || []).forEach((k) => {
      if (template && !template.fields.some((f) => f.key === k)) {
        problems.push(`${s.key}: omit_fields "${k}" is not in template ${s.template}`);
      }
    });
    try {
      // A researched basic form may be empty (every basic field is a variant axis)
      if (buildSubCategoryForm(s).length === 0 && !attributeSets.hasSet(s.key)) problems.push(`${s.key}: form has no fields`);
    } catch (err) {
      problems.push(err.message);
    }
    (s.catalog_nodes || []).forEach((n) => {
      if (!/^(ondc|shopify|service|shop_type):\S+$/.test(n)) problems.push(`${s.key}: bad catalog node ${n}`);
    });
    (s.aliases || []).forEach((a) => {
      const k = normalizeName(a);
      if (aliasOwner.has(k) && aliasOwner.get(k) !== s.key) {
        problems.push(`alias "${a}" is used by both ${aliasOwner.get(k)} and ${s.key}`);
      }
      aliasOwner.set(k, s.key);
    });
    if (s.is_fallback) {
      if (fallbacks.has(s.category)) problems.push(`${s.category}: more than one fallback sub-category`);
      fallbacks.set(s.category, s.key);
    }
  });
  categoryKeys.forEach((c) => {
    if (!fallbacks.has(c)) problems.push(`${c}: needs one sub-category with is_fallback`);
  });
  return problems;
};

const assertValidTaxonomy = () => {
  const problems = validateTaxonomy();
  if (problems.length) {
    throw new Error(`Taxonomy data is invalid:\n  - ${problems.join('\n  - ')}`);
  }
};

// ── Matching free text to a sub-category ────────────────────────────────────────────────

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Whole-word match, allowing a plural ending ("restaurant" matches "Restaurants").
const MATCHERS = SUB_CATEGORIES.flatMap((s) =>
  (s.keywords || []).map((kw) => ({
    key: s.key,
    length: kw.length,
    pattern: new RegExp(`(^|[^a-z0-9])${escapeRegex(kw.toLowerCase())}(s|es)?([^a-z0-9]|$)`),
  }))
);
const ALIASES = new Map();
SUB_CATEGORIES.forEach((s) => {
  ALIASES.set(normalizeName(s.name), s.key);
  ALIASES.set(normalizeName(s.key.replace(/_/g, ' ')), s.key);
  (s.aliases || []).forEach((a) => ALIASES.set(normalizeName(a), s.key));
});

/** Sub-category key for one piece of text: an exact name/alias first, else the longest keyword. */
const matchText = (text) => {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const exact = ALIASES.get(normalizeName(raw));
  if (exact) return exact;
  const lower = raw.toLowerCase();
  let best = null;
  MATCHERS.forEach((m) => {
    if ((!best || m.length > best.length) && m.pattern.test(lower)) best = m;
  });
  return best ? best.key : null;
};

/**
 * Sub-category key for a list of texts in priority order (most trustworthy first).
 * Returns { key, matchedOn } or null.
 */
const matchSubCategory = (texts) => {
  for (const [index, text] of (texts || []).entries()) {
    const key = matchText(text);
    if (key) return { key, matchedOn: index, text };
  }
  return null;
};

const subCategoryByKey = (key) => SUB_CATEGORIES.find((s) => s.key === key) || null;
const fallbackFor = (categoryKey) =>
  SUB_CATEGORIES.find((s) => s.category === categoryKey && s.is_fallback) || null;

// ── Sync into the database ──────────────────────────────────────────────────────────────

const json = (value) => JSON.stringify(value === undefined ? null : value);

/**
 * Upsert every category and sub-category from the data file, matched by key.
 * Names, descriptions, keywords and catalog links always follow the file. A sub-category
 * form follows the file unless an admin has customised it (form_customized = true).
 * Rows missing from the file are left alone. Returns { categories, subCategories } maps
 * of key → id.
 */
const syncTaxonomy = async (sequelize, { transaction, log = () => {} } = {}) => {
  assertValidTaxonomy();
  const q = (sql, replacements) =>
    sequelize.query(sql, { replacements, transaction, logging: false, type: sequelize.QueryTypes.SELECT });
  const exec = (sql, replacements) => sequelize.query(sql, { replacements, transaction, logging: false });

  const categoryIds = {};
  for (const [index, c] of CATEGORIES.entries()) {
    const [existing] = await q('SELECT id FROM categories WHERE key = :key', { key: c.key });
    const values = {
      key: c.key,
      name: c.name,
      description: c.description || '',
      icon: c.icon || null,
      sort_order: index + 1,
      meta: json({ coicop: c.coicop || [], ondc: c.ondc || [] }),
      form: json(buildSubCategoryForm({ key: c.key, template: 'general' })),
    };
    if (existing) {
      await exec(
        `UPDATE categories SET name = :name, description = :description, icon = :icon,
                sort_order = :sort_order, meta = CAST(:meta AS jsonb), "updatedAt" = now()
          WHERE id = :id`,
        { ...values, id: existing.id }
      );
      categoryIds[c.key] = existing.id;
    } else {
      const [row] = await q(
        `INSERT INTO categories (key, name, description, icon, sort_order, meta, form_schema,
                                 img_url, is_active, "createdAt", "updatedAt")
         VALUES (:key, :name, :description, :icon, :sort_order, CAST(:meta AS jsonb),
                 CAST(:form AS jsonb), '', true, now(), now())
         RETURNING id`,
        values
      );
      categoryIds[c.key] = row.id;
      log(`  + category ${c.key}`);
    }
  }

  const [axesColumn] = await q(
    `SELECT 1 AS ok FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'sub_categories' AND column_name = 'variant_axes'`
  );
  const subIds = {};
  for (const [index, s] of SUB_CATEGORIES.entries()) {
    const [existing] = await q(
      'SELECT id, form_customized FROM sub_categories WHERE key = :key',
      { key: s.key }
    );
    const values = {
      key: s.key,
      category_id: categoryIds[s.category],
      name: s.name,
      description: s.description || '',
      template_key: s.template,
      listing_type: s.listing_type,
      keywords: json(s.keywords || []),
      catalog_nodes: json(s.catalog_nodes || []),
      meta: json({
        ondc: s.ondc || [],
        osm: s.osm || [],
        aliases: s.aliases || [],
        is_fallback: Boolean(s.is_fallback),
      }),
      sort_order: index + 1,
      form: json(buildSubCategoryForm(s)),
    };
    if (existing) {
      await exec(
        `UPDATE sub_categories
            SET category_id = :category_id, name = :name, description = :description,
                template_key = :template_key, listing_type = :listing_type,
                keywords = CAST(:keywords AS jsonb), catalog_nodes = CAST(:catalog_nodes AS jsonb),
                meta = CAST(:meta AS jsonb), sort_order = :sort_order,
                form_schema = CASE WHEN form_customized THEN form_schema ELSE CAST(:form AS jsonb) END,
                "updatedAt" = now()
          WHERE id = :id`,
        { ...values, id: existing.id }
      );
      subIds[s.key] = existing.id;
    } else {
      const [row] = await q(
        `INSERT INTO sub_categories (key, category_id, name, description, template_key, listing_type,
                                     keywords, catalog_nodes, meta, sort_order, form_schema,
                                     form_customized, img_url, is_active, "createdAt", "updatedAt")
         VALUES (:key, :category_id, :name, :description, :template_key, :listing_type,
                 CAST(:keywords AS jsonb), CAST(:catalog_nodes AS jsonb), CAST(:meta AS jsonb),
                 :sort_order, CAST(:form AS jsonb), false, '', true, now(), now())
         RETURNING id`,
        values
      );
      subIds[s.key] = row.id;
      log(`  + sub-category ${s.key}`);
    }
    if (axesColumn) {
      await exec('UPDATE sub_categories SET variant_axes = CAST(:axes AS jsonb) WHERE key = :key', {
        key: s.key,
        axes: json(attributeSets.variantAxes(s.key)),
      });
    }
  }

  return { categories: categoryIds, subCategories: subIds };
};

module.exports = {
  CATEGORIES,
  SUB_CATEGORIES,
  LISTING_TYPES,
  normalizeName,
  buildSubCategoryForm,
  validateTaxonomy,
  assertValidTaxonomy,
  matchText,
  matchSubCategory,
  subCategoryByKey,
  fallbackFor,
  syncTaxonomy,
};
