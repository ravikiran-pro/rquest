const { Op } = require('sequelize');
const { sub_categories, categories, products, shops } = require('../../models');
const { normalizeSchema, getTemplate, suggestTemplate } = require('../../services/formSchema');
const { subCategoryByKey, buildSubCategoryForm, LISTING_TYPES } = require('../../services/taxonomy');

const LIST_ATTRS = [
  'id',
  'key',
  'name',
  'description',
  'img_url',
  'is_active',
  'category_id',
  'listing_type',
  'template_key',
  'keywords',
  'catalog_nodes',
  'form_schema',
  'form_customized',
  'sort_order',
  'createdAt',
  'updatedAt',
];

const schemaErrorResponse = (res, errors) =>
  res.status(400).json({
    success: false,
    error: errors[0].message,
    message: 'The form has fields that need fixing',
    errors,
  });

const slugify = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

/** A key not used by any sub-category yet, from the name. */
const uniqueKey = async (name) => {
  let base = slugify(name) || 'sub_category';
  if (!/^[a-z]/.test(base)) base = `sub_${base}`;
  let key = base;
  for (let n = 2; await sub_categories.count({ where: { key } }); n += 1) key = `${base}_${n}`;
  return key;
};

const stringList = (value, { max = 60, pattern } = {}) => {
  if (!Array.isArray(value)) return null;
  const out = [];
  value.forEach((v) => {
    const text = String(v === undefined || v === null ? '' : v).trim();
    if (text && text.length <= max && (!pattern || pattern.test(text)) && !out.includes(text)) out.push(text);
  });
  return out;
};

const getAllSubCategories = async (req, res) => {
  try {
    const { category_id, limit, offset, search } = req.body;

    const filters = {};
    if (category_id !== undefined && category_id !== null && category_id !== '') {
      filters.category_id = category_id;
    }
    if (typeof search === 'string' && search.trim()) {
      filters.name = { [Op.iLike]: `%${search.trim()}%` };
    }

    const results = await sub_categories.findAndCountAll({
      attributes: LIST_ATTRS,
      where: filters,
      limit: parseInt(limit) || 10,
      offset: parseInt(offset) || 0,
      order: [['sort_order', 'ASC'], ['id', 'ASC']],
    });

    // How many shops use each one, so admins can see what a change affects
    const ids = results.rows.map((r) => r.id);
    const counts = ids.length
      ? await shops.count({ where: { sub_category_id: ids }, group: ['sub_category_id'] })
      : [];
    const shopCount = new Map(counts.map((c) => [c.sub_category_id, Number(c.count)]));

    res.status(200).json({
      data: results.rows.map((row) => ({ ...row.toJSON(), shop_count: shopCount.get(row.id) || 0 })),
      count: results.count || 0,
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const updateSubCategoryStatus = async (req, res) => {
  try {
    const subcategory_id = req.body.subcategory_id || req.body.category_id;
    const { is_active } = req.body;

    const subcategory = await sub_categories.findByPk(subcategory_id);

    if (!subcategory) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    subcategory.is_active = is_active;
    await subcategory.save();

    res.status(200).json({ success: true, message: 'Subcategory status updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Create (no subcategory_id) or edit a sub-category.
 * Body: { subcategory_id?, category_id, name, img_url?, description?, listing_type?,
 *         template_key?, keywords?, catalog_nodes? }
 * A new sub-category always starts with a form: the template asked for, or the one that
 * best fits its name.
 */
const editSubCategory = async (req, res) => {
  try {
    const { category_id, subcategory_id, name, img_url, description, listing_type, template_key } = req.body;

    if (listing_type !== undefined && listing_type !== null && !LISTING_TYPES.includes(listing_type)) {
      return res.status(400).json({ success: false, error: `listing_type must be one of ${LISTING_TYPES.join(', ')}` });
    }
    if (template_key && !getTemplate(template_key)) {
      return res.status(400).json({ success: false, error: `Unknown form template "${template_key}"` });
    }
    const keywords = req.body.keywords !== undefined ? stringList(req.body.keywords) : undefined;
    const catalogNodes =
      req.body.catalog_nodes !== undefined
        ? stringList(req.body.catalog_nodes, { max: 120, pattern: /^(ondc|shopify|service|shop_type):\S+$/ })
        : undefined;
    if (keywords === null || catalogNodes === null) {
      return res.status(400).json({ success: false, error: 'keywords and catalog_nodes must be lists' });
    }

    if (subcategory_id !== null && subcategory_id !== undefined && subcategory_id !== '') {
      const subcategory = await sub_categories.findByPk(subcategory_id);
      if (!subcategory) {
        return res.status(404).json({ error: 'Subcategory not found' });
      }
      if (category_id !== undefined && category_id !== null && category_id !== '') {
        if (!(await categories.findByPk(category_id, { attributes: ['id'] }))) {
          return res.status(400).json({ success: false, error: 'Category not found' });
        }
        subcategory.category_id = category_id;
      }
      if (name !== undefined) subcategory.name = String(name).trim() || subcategory.name;
      if (img_url !== undefined) subcategory.img_url = img_url || '';
      if (description !== undefined) subcategory.description = description || '';
      if (listing_type !== undefined && listing_type !== null) subcategory.listing_type = listing_type;
      if (keywords !== undefined) subcategory.keywords = keywords;
      if (catalogNodes !== undefined) subcategory.catalog_nodes = catalogNodes;
      if (template_key && template_key !== subcategory.template_key) {
        subcategory.template_key = template_key;
        subcategory.form_schema = normalizeSchema(getTemplate(template_key).fields).schema;
        subcategory.form_customized = true;
      }
      await subcategory.save();
      return res.status(200).json({ success: true, message: 'Subcategory edited successfully', data: subcategory });
    }

    if (category_id === undefined || category_id === null || category_id === '') {
      return res.status(400).json({ success: false, error: 'category_id is required' });
    }
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'Sub-category name is required' });
    }
    if (!(await categories.findByPk(category_id, { attributes: ['id'] }))) {
      return res.status(400).json({ success: false, error: 'Category not found' });
    }
    const template = getTemplate(template_key) || suggestTemplate(name);
    const maxOrder = (await sub_categories.max('sort_order')) || 0;
    const newSubCategory = await sub_categories.create({
      key: await uniqueKey(name),
      name: String(name).trim(),
      description: description || '',
      img_url: img_url || '',
      category_id,
      is_active: true,
      listing_type: listing_type || 'product',
      template_key: template.key,
      form_schema: normalizeSchema(template.fields).schema,
      // Not in the taxonomy file, so sync never touches it; mark it as admin-owned
      form_customized: true,
      keywords: keywords || [],
      catalog_nodes: catalogNodes || [],
      sort_order: maxOrder + 1,
    });

    return res.status(201).json({
      success: true,
      message: `Subcategory created with the ${template.label} form`,
      data: newSubCategory,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PUT /master/sub_categories/form_schema { subcategory_id, form_schema }
 *   saves an admin-edited form; taxonomy sync will no longer overwrite it.
 * PUT /master/sub_categories/form_schema { subcategory_id, reset: true }
 *   goes back to the standard form from the taxonomy (or its template).
 */
const updateSubCategoryFormSchema = async (req, res) => {
  try {
    const { subcategory_id, form_schema, reset } = req.body;
    const subcategory = await sub_categories.findByPk(subcategory_id);
    if (!subcategory) return res.status(404).json({ success: false, error: 'Subcategory not found' });

    if (reset) {
      const fromTaxonomy = subcategory.key ? subCategoryByKey(subcategory.key) : null;
      const template = getTemplate(subcategory.template_key) || suggestTemplate(subcategory.name);
      subcategory.form_schema = fromTaxonomy
        ? buildSubCategoryForm(fromTaxonomy)
        : normalizeSchema(template.fields).schema;
      subcategory.form_customized = !fromTaxonomy;
      await subcategory.save();
      return res.status(200).json({ success: true, message: 'Form reset to the standard fields', data: subcategory });
    }

    const { schema, errors } = normalizeSchema(form_schema);
    if (errors.length) return schemaErrorResponse(res, errors);
    subcategory.form_schema = schema;
    subcategory.form_customized = true;
    await subcategory.save();
    return res.status(200).json({ success: true, message: 'Sub-category form saved', data: subcategory });
  } catch (error) {
    console.error('Error updating sub-category form schema:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const deleteSubCategory = async (req, res) => {
  try {
    const { sub_category_id } = req.body;

    const shopCount = await shops.count({ where: { sub_category_id } });
    if (shopCount > 0) {
      return res.status(409).json({
        success: false,
        error: `Sub-category is used by ${shopCount} shop(s) and cannot be deleted. Deactivate it instead.`,
        count: shopCount,
      });
    }

    await products.destroy({ where: { sub_category_id } });
    const res_sub = await sub_categories.destroy({ where: { id: sub_category_id } });

    return res.status(201).json({ success: true, message: 'Sub Category Deleted Successfully', data: res_sub });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getAllSubCategories,
  updateSubCategoryStatus,
  editSubCategory,
  updateSubCategoryFormSchema,
  deleteSubCategory,
};
