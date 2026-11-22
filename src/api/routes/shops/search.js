const { shops, categories, sub_categories } = require('../../models');
const { Op, literal } = require('sequelize');
const { serializeShops, subCategoryFilter, subCategoriesForShop } = require('../../services/shopSubCategories');

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
  // Several sub-categories match any of them (the frontend sends a list)
  const subCategoryIds = Array.isArray(req.body.sub_category_ids)
    ? req.body.sub_category_ids.map((id) => Number.parseInt(id, 10)).filter((id) => id > 0)
    : [];
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
        'max_sub_categories',
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
      // A sub-category filter matches the shop's primary and any of its other sub-categories
      where: {
        [Op.and]: [
          ...(Number.parseInt(category_id, 10) ? [{ category_id: Number.parseInt(category_id, 10) }] : []),
          ...(Number.parseInt(sub_category_id, 10) ? [subCategoryFilter(sub_category_id)] : []),
          ...(subCategoryIds.length ? [{ [Op.or]: subCategoryIds.map((id) => subCategoryFilter(id)) }] : []),
          {
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
        ],
      },
      order: [[literal('distance'), 'ASC']],
      replacements: {
        search_lat: searchLat,
        search_lon: searchLon,
      },
    });

    res.status(200).json({
      data: await serializeShops(results),
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
        'max_sub_categories',
      ],
      include: categoryIncludes(),
      where: {
        owner_id: user_id,
      },
      order: [['updatedAt', 'DESC']],
    });

    res.status(200).json({
      data: await serializeShops(results),
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

    const data = await serializeShops(shop);
    // Ordered sub-categories with their keys and listing types (storefront section chips, forms)
    if (!data.sub_categories) data.sub_categories = await subCategoriesForShop(shop);
    res.status(200).json({
      data,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching shop details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { getShopsFilter, getMyShops, getShopDetails };
