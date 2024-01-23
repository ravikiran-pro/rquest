const { categories, sub_categories } = require('../../models');

const getAllCategories = async (req, res) => {
  try {
    const results = await categories.findAll({
      attributes: ['id', 'name', 'img_url'],
      include: [
        {
          model: sub_categories,
          as: 'sub_categories',
          attributes: ['id', 'name', 'img_url'],
        },
      ],
      order: [['id', 'DESC']],
    });

    res.send(200, {
      data: results,
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { getAllCategories };
