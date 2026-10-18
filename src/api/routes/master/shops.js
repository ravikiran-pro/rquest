const { Op } = require('sequelize');
const { shops, categories, users, shop_listings } = require('../../models');

const getAllMasterShops = async (req, res) => {
  try {
    const { limit = 10, offset = 0, search = '', category_id } = req.body;

    const where = {};
    if (search && search.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      where[Op.or] = [
        { shop_name: { [Op.iLike]: searchTerm } },
        { area: { [Op.iLike]: searchTerm } },
        { shop_type: { [Op.iLike]: searchTerm } },
        { mobile_number: { [Op.iLike]: searchTerm } },
      ];
    }

    if (category_id !== undefined && category_id !== null && category_id !== 'all') {
      where.category_id = parseInt(category_id);
    }

    const { count, rows } = await shops.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: categories,
          as: 'shopCategory',
          attributes: ['id', 'name', 'form_schema'],
          required: false,
        },
        {
          model: users,
          as: 'owner',
          attributes: ['id', 'username', 'mobile'],
          required: false,
        },
      ],
    });

    return res.status(200).json({
      success: true,
      count,
      data: rows,
    });
  } catch (error) {
    console.error('Error fetching master shops:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch shops',
      message: error.message,
    });
  }
};

const updateShopFormSchema = async (req, res) => {
  try {
    const { shop_id, form_schema } = req.body;

    if (!shop_id) {
      return res.status(400).json({
        success: false,
        error: 'Shop ID required',
        message: 'shop_id is required',
      });
    }

    const shop = await shops.findByPk(shop_id);
    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found',
        message: `No shop found with id ${shop_id}`,
      });
    }

    const schemaToSave = Array.isArray(form_schema) ? form_schema : [];

    await shops.update(
      { form_schema: schemaToSave },
      { where: { id: shop_id } }
    );

    const updatedShop = await shops.findByPk(shop_id, {
      include: [
        {
          model: categories,
          as: 'shopCategory',
          attributes: ['id', 'name', 'form_schema'],
        },
        {
          model: users,
          as: 'owner',
          attributes: ['id', 'username', 'mobile'],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: 'Shop specific form schema updated successfully',
      data: updatedShop,
    });
  } catch (error) {
    console.error('Error updating shop form schema:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update shop form schema',
      message: error.message,
    });
  }
};

module.exports = {
  getAllMasterShops,
  updateShopFormSchema,
};

