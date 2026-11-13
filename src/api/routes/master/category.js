const { categories, sub_categories, products } = require('../../models');
const {
  normalizeSchema,
  suggestTemplate,
  getTemplate,
  listTemplates,
} = require('../../services/formSchema');

const schemaErrorResponse = (res, errors) =>
  res.status(400).json({
    success: false,
    error: errors[0].message,
    message: 'The form has fields that need fixing',
    errors,
  });

// Ready-made form templates, plus the one that best fits a category name
const getFormTemplates = async (req, res) => {
  try {
    const { category_name } = req.query;
    res.status(200).json({
      success: true,
      data: listTemplates(),
      suggested: category_name ? suggestTemplate(category_name).key : null,
    });
  } catch (error) {
    console.error('Error fetching form templates:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getAllCategories = async (req, res) => {
  try {
    const { limit, offset } = req.body;

    const results = await categories.findAndCountAll({
      attributes: ['id', 'name', 'img_url', 'is_active', 'form_schema', 'createdAt', 'updatedAt'],
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
      order: [['updatedAt', 'DESC']]
    });

    res.status(200).json({
      data: results?.rows || [],
      count: results.count || 0,
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const updateCategoryStatus = async (req, res) => {
  try {
    const { category_id, is_active } = req.body;

    const category = await categories.findByPk(category_id);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Update the is_active status
    category.is_active = is_active;
    await category.save();

    res.status(200).json({ success: true, message: 'Category status updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const editCategory = async (req, res) => {
  try {
    const { category_id, name, img_url, form_schema, template_key } = req.body;

    let cleanSchema;
    if (form_schema !== undefined) {
      const { schema, errors } = normalizeSchema(form_schema);
      if (errors.length) return schemaErrorResponse(res, errors);
      cleanSchema = schema;
    }

    if (category_id === undefined || category_id === null || category_id === '') {
      if (!name || !String(name).trim()) {
        return res.status(400).json({ success: false, error: 'Category name is required' });
      }

      // A new category always starts with a form: the one sent, the template
      // asked for, or the template that best fits the category name.
      let appliedTemplate = null;
      if (!cleanSchema || cleanSchema.length === 0) {
        appliedTemplate = getTemplate(template_key) || suggestTemplate(name);
        cleanSchema = normalizeSchema(appliedTemplate.fields).schema;
      }

      const newCategory = await categories.create({
        name: String(name).trim(),
        img_url: img_url || '',
        is_active: true,
        form_schema: cleanSchema,
      });

      return res.status(201).json({
        success: true,
        message: appliedTemplate
          ? `Category created with the ${appliedTemplate.label} form (${cleanSchema.length} fields)`
          : 'Category created successfully',
        data: newCategory,
        applied_template: appliedTemplate
          ? { key: appliedTemplate.key, label: appliedTemplate.label }
          : null,
      });
    }

    const category = await categories.findByPk(category_id);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (name !== undefined) category.name = name;
    if (img_url !== undefined) category.img_url = img_url;
    if (cleanSchema !== undefined) category.form_schema = cleanSchema;
    await category.save();

    res.status(200).json({ success: true, message: 'Category edited successfully', data: category });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const updateCategoryFormSchema = async (req, res) => {
  try {
    const { category_id, form_schema } = req.body;

    if (category_id === undefined || category_id === null) {
      return res.status(400).json({ error: 'category_id is required' });
    }

    const category = await categories.findByPk(category_id);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const { schema, errors } = normalizeSchema(form_schema);
    if (errors.length) return schemaErrorResponse(res, errors);

    category.form_schema = schema;
    await category.save();

    res.status(200).json({
      success: true,
      message: 'Category form schema updated successfully',
      data: category,
    });
  } catch (error) {
    console.error('Error updating category form schema:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { category_id } = req.body;

    const res_sub = await sub_categories.destroy({
      where:{
        category_id: category_id 
      }
    })

    const res_prod = await products.destroy({
      where:{
        category_id: category_id 
      }
    })

    const res_cat = await categories.destroy({
      where:{
       id: category_id 
      }
    })
    
    return res.status(201).json({ success: true, message: 'Category Deleted Successfully', data: res_cat });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getFormTemplates,
  getAllCategories,
  updateCategoryStatus,
  editCategory,
  updateCategoryFormSchema,
  deleteCategory
};