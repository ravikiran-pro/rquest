const { products, sub_categories } = require('../../models');

const getAllProducts = async (req, res) => {
  try {
    const { category_id, sub_category_id, limit, offset } = req.body;

    let filters = {}

    if (category_id !== null && category_id >= 0) {
      filters['category_id'] = category_id;
    }

    if (sub_category_id !== null && sub_category_id >= 0) {
      filters['sub_category_id'] = sub_category_id;
    }

    const results = await products.findAndCountAll({
      attributes: ['id', 'name', 'img_url', 'description', 'category_id', 'sub_category_id', 'is_active', 'createdAt', 'updatedAt'],
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

const updateProductsStatus = async (req, res) => {
  try {
    const { product_id, is_active } = req.body;

    const productRes = await products.findByPk(product_id);

    if (!productRes) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Update the is_active status
    productRes.is_active = is_active;
    await productRes.save();

    res.status(200).json({ success: true, message: 'Product status updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const editProducts = async (req, res) => {
  try {
    const { sub_category_id, product_id, name, img_url, description } = req.body;
    let { category_id } = req.body;

    if (sub_category_id !== null && sub_category_id >= 0 && !category_id) {
      const subCategory = await sub_categories.findByPk(sub_category_id);
      if (subCategory) {
        category_id = subCategory.category_id;
      }
    }

    if (product_id !== null && product_id >= 0) {
      const productRes = await products.findByPk(product_id);

      if (!productRes) {
        return res.status(404).json({ error: 'Product not found' });
      }

      productRes.name = name;
      productRes.img_url = img_url;
      productRes.description = description;
      await productRes.save();

      res.status(200).json({ success: true, message: 'Product edited successfully', data: productRes });
    } else {
      let count = await products.count();
      if (sub_category_id !== null && sub_category_id >= 0) {
        const newProduct = await products.create({
          name: name,
          img_url: img_url,
          description: description,
          id: count,
          category_id: category_id,
          sub_category_id: sub_category_id
        });

        return res.status(201).json({ success: true, message: 'Product created successfully', data: newProduct });
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const deleteProducts = async (req, res) => {
  try {
    const { product_id } = req.body;


    const res_sub = await products.destroy({
      where: {
        id: product_id
      }
    })

    return res.status(201).json({ success: true, message: 'Sub Category Deleted Successfully', data: res_sub });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getAllProducts,
  updateProductsStatus,
  editProducts,
  deleteProducts
};
