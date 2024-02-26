const { categories, sub_categories, products } = require('../../models');

const getAllCategories = async (req, res) => {
  try {
    const { limit, offset } = req.body;

    const results = await categories.findAndCountAll({
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
    const { category_id, name, img_url, count } = req.body;

    if (category_id === undefined ) {
      const newCategory = await categories.create({
        name: name,
        img_url: img_url,
        id: count
      });

      return res.status(201).json({ success: true, message: 'Category created successfully', data: newCategory });
    }

    const category = await categories.findByPk(category_id);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    category.name = name;
    category.img_url = img_url;
    await category.save();

    res.status(200).json({ success: true, message: 'Category edited successfully', data: category });
  } catch (error) {
    console.error(error);
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
  getAllCategories,
  updateCategoryStatus,
  editCategory,
  deleteCategory
};