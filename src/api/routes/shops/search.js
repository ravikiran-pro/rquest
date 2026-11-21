const { shops, categories, sub_categories } = require('../../models');
const { Op, literal } = require('sequelize');

// Category and sub-category as shops carry them. The sub-category form is what the
// shop's listings follow (unless the shop has its own form).
const CATEGORY_ATTRS = ['id', 'key', 'name', 'icon', 'form_schema'];
const SUB_CATEGORY_ATTRS = ['id', 'key', 'name', 'category_id', 'listing_type', 'template_key', 'form_schema'];
const categoryIncludes = () => [
  { model: categories, as: 'shopCategory', attributes: CATEGORY_ATTRS },
  { model: sub_categories, as: 'shopSubCategory', attributes: SUB_CATEGORY_ATTRS },
];

const getShopsFilter = async (req, res) => {
  const { lat, lon, search, category_id, sub_category_id } = req.body;
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
      include: categoryIncludes(),
      where: {
        ...(Number.parseInt(category_id, 10) ? { category_id: Number.parseInt(category_id, 10) } : {}),
        ...(Number.parseInt(sub_category_id, 10)
          ? { sub_category_id: Number.parseInt(sub_category_id, 10) }
          : {}),
        [Op.or]: [
          { '$shopSubCategory.name$': { [Op.iLike]: `%${queryText}%` } },
          { '$shopCategory.name$': { [Op.iLike]: `%${queryText}%` } },
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
        'allow_multi_category',
        'createdAt',
        'updatedAt',
        'id',
        'owner_id',
        'form_schema',
      ],
      include: categoryIncludes(),
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

const getShopDetails = async (req, res) => {
  try {
    const { shop_id } = req.params;
    const shop = await shops.findByPk(shop_id, {
      include: categoryIncludes(),
    });

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found', success: false });
    }

    res.status(200).json({
      data: shop,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching shop details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { getShopsFilter, getMyShops, getShopDetails };
