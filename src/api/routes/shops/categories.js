const { categories, sub_categories } = require('../../models');

/**
 * GET /shops/my_categories
 * The active category tree: 8 categories, each with its active sub-categories in display
 * order. A sub-category carries the form its listings follow (form_schema) and the default
 * listing type; a category's form_schema is only a fallback.
 * ?include_inactive=1 (used by the admin screens) also returns inactive rows.
 */
const getAllCategories = async (req, res) => {
  try {
    const includeInactive = ['1', 'true'].includes(String(req.query?.include_inactive || ''));
    const activeOnly = includeInactive ? {} : { is_active: true };

    const results = await categories.findAll({
      attributes: ['id', 'key', 'name', 'description', 'icon', 'img_url', 'is_active', 'sort_order', 'form_schema'],
      where: activeOnly,
      include: [
        {
          model: sub_categories,
          as: 'sub_categories',
          attributes: [
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
            'form_schema',
            'sort_order',
          ],
          where: activeOnly,
          required: false,
        },
      ],
      order: [
        ['sort_order', 'ASC'],
        ['id', 'ASC'],
        [{ model: sub_categories, as: 'sub_categories' }, 'sort_order', 'ASC'],
        [{ model: sub_categories, as: 'sub_categories' }, 'id', 'ASC'],
      ],
    });

    res.status(200).json({
      data: results,
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { getAllCategories };
