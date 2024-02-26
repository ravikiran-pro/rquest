const { sub_categories, products } = require('../../models');

const getAllSubCategories = async (req, res) => {
  try {
    const { category_id, limit, offset } = req.body;

    let filters = {}

    if (category_id) {
      filters['category_id'] = category_id;
    }

    const results = await sub_categories.findAndCountAll({
      attributes: ['id', 'name', 'img_url', 'is_active', 'createdAt', 'updatedAt'],
      where: filters,
      limit: parseInt(limit) || 10,
      offset: parseInt(offset) || 0,
      order: [['updatedAt', 'DESC']],
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
    const { category_id, subcategory_id, name, img_url, count } = req.body;

    if (subcategory_id !== null && subcategory_id >= 0) {
      const subcategory = await sub_categories.findByPk(subcategory_id);

      if (!subcategory) {
        return res.status(404).json({ error: 'Subcategory not found' });
      }

      subcategory.name = name;
      subcategory.img_url = img_url;
      await subcategory.save();

      res.status(200).json({ success: true, message: 'Subcategory edited successfully', data: subcategory });
    } else {
      let count = await sub_categories.count();
      debugger
      if (category_id !== null && category_id >= 0) {
        const newSubCategory = await sub_categories.create({
          name: name,
          img_url: img_url,
          id: count,
          category_id: category_id
        });

        return res.status(201).json({ success: true, message: 'Subcategory created successfully', data: newSubCategory });
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const deleteSubCategory = async (req, res) => {
  try {
    const { sub_category_id } = req.body;


    const res_prod = await products.destroy({
      where:{
        sub_category_id: sub_category_id 
      }
    })

    const res_sub = await sub_categories.destroy({
      where:{
       id: sub_category_id 
      }
    })
    
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
  deleteSubCategory
};
