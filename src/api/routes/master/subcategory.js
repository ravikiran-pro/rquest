const { sub_categories } = require('../../models');

const getAllSubCategories = async (req, res) => {
  try {
    const { limit, offset } = req.body;

    const results = await sub_categories.findAndCountAll({
      attributes: ['id', 'name', 'img_url', 'is_active', 'createdAt', 'updatedAt'],
      limit: parseInt(limit) || 10,
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

const updateSubCategoryStatus = async (req, res) => {
  try {
    const { subcategory_id, is_active } = req.body;

    const subcategory = await sub_categories.findByPk(subcategory_id);

    if (!subcategory) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    // Update the is_active status
    subcategory.is_active = is_active;
    await subcategory.save();

    res.status(200).json({ success: true, message: 'Subcategory status updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const editSubCategory = async (req, res) => {
  try {
    const { subcategory_id, name, img_url, count } = req.body;

    if (subcategory_id === undefined) {
      const newSubCategory = await sub_categories.create({
        name: name,
        img_url: img_url,
        id: count
      });

      return res.status(201).json({ success: true, message: 'Subcategory created successfully', data: newSubCategory });
    }

    const subcategory = await sub_categories.findByPk(subcategory_id);

    if (!subcategory) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    subcategory.name = name;
    subcategory.img_url = img_url;
    await subcategory.save();

    res.status(200).json({ success: true, message: 'Subcategory edited successfully', data: subcategory });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getAllSubCategories,
  updateSubCategoryStatus,
  editSubCategory,
};
