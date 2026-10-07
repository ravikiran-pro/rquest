const { shops, categories, sub_categories } = require('../../models');
const { Op, literal } = require('sequelize');

const getShopsFilter = async (req, res) => {
  const { lat, lon, search } = req.body;
  const searchLat = parseFloat(lat) || 12.9631025;
  const searchLon = parseFloat(lon) || 80.25476;
  const queryText = typeof search === 'string' ? search.trim() : '';

  try {
    const results = await shops.findAll({
      attributes: [
        'shop_name',
        'address',
        'area',
        'mobile_number',
        'website',
        'rating',
        'products_list',
        'img_url',
        'category_id',
        'sub_category_id',
        'shop_type',
        'latitude',
        'longitude',
        'directions',
        'id',
        'owner_id',
        [
          literal(
            'earth_distance(ll_to_earth(:search_lat, :search_lon), ll_to_earth(latitude, longitude))'
          ),
          'distance',
        ],
      ],
      include: [
        {
          model: categories,
          as: 'shopCategory',
          attributes: ['id', 'name'],
        },
        {
          model: sub_categories,
          as: 'shopSubCategory',
          attributes: ['id', 'name'],
        },
      ],
      where: {
        [Op.or]: [
          {
            shop_name: {
              [Op.iLike]: `%${queryText}%`,
            },
          },
          {
            address: {
              [Op.iLike]: `%${queryText}%`,
            },
          },
          {
            area: {
              [Op.iLike]: `%${queryText}%`,
            },
          },
          {
            shop_type: {
              [Op.iLike]: `%${queryText}%`,
            },
          },
        ],
      },
      order: [[literal('distance'), 'ASC']],
      replacements: {
        search_lat: searchLat,
        search_lon: searchLon,
      },
    });

    res.status(200).json({
      data: results,
      success: true,
    });
  } catch (error) {
    console.error('Error in getShopsFilter:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getMyShops = async (req, res) => {
  try {
    const { user_id } = req.headers;
    const results = await shops.findAll({
      attributes: [
        'shop_name',
        'address',
        'area',
        'mobile_number',
        'img_url',
        'category_id',
        'sub_category_id',
        'website',
        'rating',
        'products_list',
        'shop_type',
        'latitude',
        'longitude',
        'directions',
        'createdAt',
        'updatedAt',
        'id',
        'owner_id',
      ],
      include: [
        {
          model: categories,
          as: 'shopCategory',
          attributes: ['id', 'name'],
        },
        {
          model: sub_categories,
          as: 'shopSubCategory',
          attributes: ['id', 'name'],
        },
      ],
      where: {
        owner_id: user_id,
      },
      order: [['updatedAt', 'DESC']],
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

module.exports = { getShopsFilter, getMyShops };
