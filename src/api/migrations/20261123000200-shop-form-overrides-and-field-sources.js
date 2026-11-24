'use strict';

/**
 * Store form overrides and field ownership (docs/catalogue/03-spec.md §C2, §C5, §D3).
 *
 *  1. shop_form_overrides (shop_id, sub_category_id, overrides, version, updated_by): a shop's
 *     changes to one sub-category's listing form. Unique per (shop, sub-category).
 *  2. Annotates the existing sub-category and category forms with source / catalog_path /
 *     statutory, using the frozen key map below (customised forms too: the key means the
 *     same). Only fields without a source are touched, so a re-run is a no-op. Pharmacy
 *     expiry_date becomes optional.
 *
 * After deploying, run `npm run taxonomy:sync` so non-customised forms pick up the new
 * template fields (pharmacy manufacturer and pack_size) and the template field order.
 *
 * down() drops the table and strips source / catalog_path / statutory from the forms.
 */

// Frozen copy of the key map at the time of this migration (do not import app code here)
const FIELD_MAP = {
  brand: { source: 'catalog', catalog_path: 'brand' },
  pack_size: { source: 'catalog', catalog_path: 'quantity_text' },
  composition: { source: 'catalog', catalog_path: 'attributes.generic' },
  dosage_form: { source: 'catalog', catalog_path: 'attributes.dosage_form' },
  manufacturer: { source: 'catalog', catalog_path: 'manufacturer' },
  model_number: { source: 'catalog', catalog_path: 'attributes.model_number' },
  author_brand: { source: 'catalog', catalog_path: 'brand' },
  net_weight: { source: 'catalog', catalog_path: 'quantity_text' },
  prescription_required: { source: 'catalog', catalog_path: 'attributes.prescription_required', statutory: true },
  schedule_drug: { source: 'catalog', catalog_path: 'attributes.schedule_drug', statutory: true },
};

/** The props to merge into one field of a form, or null to leave it. */
function annotation(field, templateKey) {
  if (!field || typeof field !== 'object' || !field.key) return null;
  if (field.source !== undefined && field.source !== null && field.source !== '') return null;
  if (field.key === 'food_type') {
    return templateKey === 'grocery'
      ? { source: 'catalog', catalog_path: 'attributes.food_type', statutory: true }
      : { source: 'store', statutory: true };
  }
  if (field.key === 'expiry_date' && templateKey === 'pharmacy') return { source: 'store', required: false };
  return FIELD_MAP[field.key] || null;
}

/** The annotated form, or null when nothing changes. */
function annotateForm(form, templateKey) {
  if (!Array.isArray(form)) return null;
  let changed = false;
  const next = form.map((field) => {
    const props = annotation(field, templateKey);
    if (!props) return field;
    changed = true;
    return { ...field, ...props };
  });
  return changed ? next : null;
}

const strip = (form) =>
  Array.isArray(form)
    ? form.map((field) => {
        if (!field || typeof field !== 'object') return field;
        const { source, catalog_path, statutory, ...rest } = field; // eslint-disable-line no-unused-vars
        return rest;
      })
    : form;

module.exports = {
  annotateForm,

  up: async (queryInterface) => {
    const { sequelize } = queryInterface;
    const t = await sequelize.transaction();
    const exec = (sql, replacements) => sequelize.query(sql, { replacements, transaction: t });
    const select = (sql) => sequelize.query(sql, { transaction: t, type: sequelize.QueryTypes.SELECT });
    try {
      await exec(`CREATE TABLE IF NOT EXISTS shop_form_overrides (
        id SERIAL PRIMARY KEY,
        shop_id UUID NOT NULL REFERENCES shops(id) ON UPDATE CASCADE ON DELETE CASCADE,
        sub_category_id INTEGER NOT NULL REFERENCES sub_categories(id) ON UPDATE CASCADE ON DELETE CASCADE,
        overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
        version INTEGER NOT NULL DEFAULT 1,
        updated_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT shop_form_overrides_shop_sub_unique UNIQUE (shop_id, sub_category_id)
      )`);

      let subs = 0;
      for (const row of await select('SELECT id, template_key, form_schema FROM sub_categories')) {
        const next = annotateForm(row.form_schema, row.template_key);
        if (!next) continue;
        await exec('UPDATE sub_categories SET form_schema = CAST(:form AS jsonb) WHERE id = :id', {
          id: row.id,
          form: JSON.stringify(next),
        });
        subs += 1;
      }
      let cats = 0;
      for (const row of await select('SELECT id, form_schema FROM categories')) {
        const next = annotateForm(row.form_schema, null);
        if (!next) continue;
        await exec('UPDATE categories SET form_schema = CAST(:form AS jsonb) WHERE id = :id', {
          id: row.id,
          form: JSON.stringify(next),
        });
        cats += 1;
      }
      console.log(`form field sources: ${subs} sub-category forms, ${cats} category forms annotated`);
      console.log('Next: run `npm run taxonomy:sync` to pick up the new template fields.');

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  down: async (queryInterface) => {
    const { sequelize } = queryInterface;
    const t = await sequelize.transaction();
    const exec = (sql, replacements) => sequelize.query(sql, { replacements, transaction: t });
    const select = (sql) => sequelize.query(sql, { transaction: t, type: sequelize.QueryTypes.SELECT });
    try {
      await exec('DROP TABLE IF EXISTS shop_form_overrides');
      for (const table of ['sub_categories', 'categories']) {
        for (const row of await select(`SELECT id, form_schema FROM ${table}`)) {
          if (!Array.isArray(row.form_schema)) continue;
          await exec(`UPDATE ${table} SET form_schema = CAST(:form AS jsonb) WHERE id = :id`, {
            id: row.id,
            form: JSON.stringify(strip(row.form_schema)),
          });
        }
      }
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },
};
