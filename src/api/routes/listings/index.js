const express = require('express');
const { shop_listings, shops, products, categories, sub_categories } = require('../../models');
const { Op, literal } = require('sequelize');
const { authMiddleware, isAdminReq } = require('../../auth');
const {
  validateMetadata,
  mergeFilterFields,
  buildMetadataFilter,
} = require('../../services/formSchema');
const {
  loadListingContext,
  listingTypeFor,
  categoryMetadata,
  subCategoryIdFor,
  categoryIdFor,
} = require('../../services/listingForm');

const router = express.Router();

const hasFields = (schema) => Array.isArray(schema) && schema.length > 0;

// The custom-field filters that apply to a set of search results: the
// filterable fields of every form those listings follow, merged by key.
const loadFilterFields = async (items) => {
  const shopIds = [...new Set(items.map((item) => item.shop_id).filter(Boolean))];
  if (shopIds.length === 0) return [];

  const shopRows = await shops.findAll({
    attributes: ['id', 'category_id', 'sub_category_id', 'form_schema'],
    where: { id: shopIds },
  });
  const shopById = new Map(shopRows.map((shop) => [shop.id, shop]));

  // Each listing follows its shop's own form, else its sub-category's, else its category's
  const shopSchemas = [];
  const subIds = new Set();
  const categoryIds = new Set();
  const seenShops = new Set();
  items.forEach((item) => {
    const shop = shopById.get(item.shop_id);
    if (!shop) return;
    if (hasFields(shop.form_schema)) {
      if (!seenShops.has(shop.id)) {
        seenShops.add(shop.id);
        shopSchemas.push(shop.form_schema);
      }
      return;
    }
    const subId = subCategoryIdFor(shop, item.metadata);
    if (subId !== null) subIds.add(subId);
    else if (categoryIdFor(shop, item.metadata) !== null) categoryIds.add(categoryIdFor(shop, item.metadata));
  });

  const subRows = subIds.size
    ? await sub_categories.findAll({
        attributes: ['id', 'category_id', 'form_schema'],
        where: { id: [...subIds] },
        order: [['sort_order', 'ASC'], ['id', 'ASC']],
      })
    : [];
  // A sub-category without fields falls back to its category's form
  subRows.filter((sub) => !hasFields(sub.form_schema)).forEach((sub) => categoryIds.add(sub.category_id));
  const categoryRows = categoryIds.size
    ? await categories.findAll({
        attributes: ['id', 'form_schema'],
        where: { id: [...categoryIds] },
        order: [['id', 'ASC']],
      })
    : [];

  return mergeFilterFields([
    ...subRows.filter((sub) => hasFields(sub.form_schema)).map((sub) => sub.form_schema),
    ...categoryRows.map((c) => c.form_schema),
    ...shopSchemas,
  ]);
};

/**
 * Check a listing's sub-category / category choice (multi-category shops pick one per
 * listing) and record its ids and name the way the server knows them.
 * Returns { metadata } or { error }.
 */
const normalizeCategoryChoice = async (metadata) => {
  const meta = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? { ...metadata } : {};
  delete meta.category_name;
  if (meta.sub_category_id === undefined || meta.sub_category_id === null || meta.sub_category_id === '') {
    delete meta.sub_category_id;
    delete meta.sub_category_name;
    if (meta.category_id === undefined || meta.category_id === null || meta.category_id === '') {
      delete meta.category_id;
      return { metadata: meta };
    }
    const category = await categories.findByPk(Number.parseInt(meta.category_id, 10) || -1, { attributes: ['id'] });
    if (!category) return { error: 'Category not found' };
    return { metadata: { ...meta, category_id: category.id } };
  }
  const sub = await sub_categories.findByPk(Number.parseInt(meta.sub_category_id, 10) || -1, {
    attributes: ['id', 'name', 'category_id'],
  });
  if (!sub) return { error: 'Sub-category not found' };
  return { metadata: { ...meta, ...categoryMetadata(sub, null) } };
};

const fieldErrorResponse = (res, errors) =>
  res.status(400).json({
    success: false,
    error: errors.map((e) => e.message).join('. '),
    errors,
  });

// Only the shop's owner or a platform admin may change its listings
const canManageShop = (req, shop) =>
  Boolean(shop) &&
  (isAdminReq(req) || (Boolean(shop.owner_id) && shop.owner_id === req.headers.user_id));

const assertShopOwner = async (req, res, shopId) => {
  const shop = await shops.findByPk(shopId, { attributes: ['id', 'owner_id'] });
  if (!shop) {
    res.status(404).json({ success: false, error: 'Shop not found' });
    return false;
  }
  if (!canManageShop(req, shop)) {
    res.status(403).json({ success: false, error: 'Only the shop owner can manage this shop\'s listings' });
    return false;
  }
  return true;
};

const FORBIDDEN_SHOP_BODY = {
  success: false,
  error: 'Only the shop owner can manage this shop\'s listings',
};

// 1. Get listings by shop ID (Public)
router.get('/shop/:shop_id', async (req, res) => {
  try {
    const { shop_id } = req.params;
    const { type } = req.query;

    const where = { shop_id };
    if (type && type !== 'all') {
      where.listing_type = type;
    }

    const items = await shop_listings.findAll({
      where,
      order: [['is_available', 'DESC'], ['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (err) {
    console.error('Error in getShopListings:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Search listings by item name or category near coordinates (Public)
router.post('/search', async (req, res) => {
  try {
    const { search, lat, lon, listing_type, category_id, sub_category_id, filters, limit = 200 } = req.body;
    const searchLat = parseFloat(lat) || 12.9631025;
    const searchLon = parseFloat(lon) || 80.25476;
    const queryText = typeof search === 'string' ? search.trim() : '';

    const listingWhere = { is_available: true };
    if (listing_type && listing_type !== 'all') {
      listingWhere.listing_type = listing_type;
    }

    const conditions = [];
    if (queryText) {
      conditions.push({
        [Op.or]: [
          { name: { [Op.iLike]: `%${queryText}%` } },
          { description: { [Op.iLike]: `%${queryText}%` } },
        ],
      });
    }

    // Narrow to one sub-category or category: the listing's own choice, or its shop's
    let filterSchema = null;
    const subCategoryId = Number.parseInt(sub_category_id, 10);
    const categoryId = Number.parseInt(category_id, 10);
    if (!Number.isNaN(subCategoryId)) {
      const sub = await sub_categories.findByPk(subCategoryId, { attributes: ['id', 'category_id', 'form_schema'] });
      if (!sub) {
        return res.status(404).json({ success: false, error: 'Sub-category not found' });
      }
      conditions.push({
        [Op.or]: [
          { metadata: { [Op.contains]: { sub_category_id: subCategoryId } } },
          { '$shop.sub_category_id$': subCategoryId },
        ],
      });
      filterSchema = sub.form_schema;
    } else if (!Number.isNaN(categoryId)) {
      const category = await categories.findByPk(categoryId, { attributes: ['id', 'form_schema'] });
      if (!category) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }
      conditions.push({
        [Op.or]: [
          { metadata: { [Op.contains]: { category_id: categoryId } } },
          { '$shop.category_id$': categoryId },
        ],
      });
      // Any filterable field of the category's sub-category forms can be used
      const subs = await sub_categories.findAll({ attributes: ['form_schema'], where: { category_id: categoryId } });
      filterSchema = mergeFilterFields([category.form_schema, ...subs.map((sub) => sub.form_schema)]);
    }

    // Filter on the form's custom fields, e.g. { food_type: 'veg' }
    const { filter: metadataFilter, errors: filterErrors } = buildMetadataFilter(filters, filterSchema);
    if (filterErrors.length) return fieldErrorResponse(res, filterErrors);
    if (Object.keys(metadataFilter).length) {
      conditions.push({ metadata: { [Op.contains]: metadataFilter } });
    }

    if (conditions.length) listingWhere[Op.and] = conditions;

    const items = await shop_listings.findAll({
      where: listingWhere,
      limit: parseInt(limit),
      include: [
        {
          model: shops,
          as: 'shop',
          attributes: [
            'id',
            'shop_name',
            'address',
            'area',
            'mobile_number',
            'rating',
            'img_url',
            'shop_type',
            'category_id',
            'sub_category_id',
            'latitude',
            'longitude',
            'owner_id',
            [
              literal(
                'earth_distance(ll_to_earth(:search_lat, :search_lon), ll_to_earth("shop"."latitude", "shop"."longitude"))'
              ),
              'distance',
            ],
          ],
          include: [
            {
              model: categories,
              as: 'shopCategory',
              attributes: ['id', 'key', 'name'],
            },
            {
              model: sub_categories,
              as: 'shopSubCategory',
              attributes: ['id', 'key', 'name'],
            },
          ],
        },
      ],
      order: [[literal('"shop.distance"'), 'ASC']],
      replacements: {
        search_lat: searchLat,
        search_lon: searchLon,
      },
    });

    res.status(200).json({
      success: true,
      data: items,
      // Custom-field filters the client can offer for these results
      filter_fields: await loadFilterFields(items),
    });
  } catch (err) {
    console.error('Error in searchListings:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Protected routes below
router.use(authMiddleware);

// 3. Create a listing for a shop
router.post('/', async (req, res) => {
  try {
    const {
      shop_id,
      master_product_id,
      listing_type,
      name,
      description,
      price,
      mrp,
      unit,
      is_available,
      metadata,
      img_url,
      is_starter,
    } = req.body;

    if (!shop_id || !name || price === undefined) {
      return res.status(400).json({ error: 'Shop ID, item name, and price are required' });
    }

    const shopRecord = await shops.findByPk(shop_id, {
      include: [{ model: categories, as: 'shopCategory', attributes: ['name'] }],
    });
    if (!shopRecord) {
      return res.status(404).json({ success: false, error: 'Shop not found' });
    }
    if (!canManageShop(req, shopRecord)) {
      return res.status(403).json(FORBIDDEN_SHOP_BODY);
    }

    const choice = await normalizeCategoryChoice(metadata);
    if (choice.error) return res.status(400).json({ success: false, error: choice.error });

    // Check the sub-category form's fields. Starter items seeded at shop sign-up
    // may leave required fields empty for the owner to complete later.
    const { schema, subCategory } = await loadListingContext(shopRecord, choice.metadata);
    const { metadata: cleanMetadata, errors: fieldErrors } = validateMetadata(schema, choice.metadata, {
      enforceRequired: !is_starter,
    });
    if (fieldErrors.length) return fieldErrorResponse(res, fieldErrors);

    const resolvedType = listing_type || listingTypeFor(shopRecord, subCategory);

    const newListing = await shop_listings.create({
      shop_id,
      master_product_id: master_product_id || null,
      listing_type: resolvedType || 'product',
      name,
      description: description || '',
      price: parseFloat(price) || 0,
      mrp: mrp ? parseFloat(mrp) : null,
      unit: unit || 'piece',
      is_available: is_available !== undefined ? is_available : true,
      metadata: cleanMetadata,
      img_url: img_url || null,
    });

    res.status(201).json({
      success: true,
      message: 'Listing created successfully',
      data: newListing,
    });
  } catch (err) {
    console.error('Error creating listing:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3b. Bulk Create Listings (CSV Import)
router.post('/bulk', async (req, res) => {
  try {
    const { shop_id, items } = req.body;

    if (!shop_id) {
      return res.status(400).json({ error: 'Shop ID is required', success: false });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array cannot be empty', success: false });
    }

    const shopRecord = await shops.findByPk(shop_id, {
      include: [{ model: categories, as: 'shopCategory', attributes: ['name'] }],
    });

    if (!shopRecord) {
      return res.status(404).json({ error: 'Shop not found', success: false });
    }
    if (!canManageShop(req, shopRecord)) {
      return res.status(403).json(FORBIDDEN_SHOP_BODY);
    }

    // Rows that break their form are skipped and reported back. One lookup per
    // sub-category / category choice.
    const contextCache = new Map();
    const contextFor = async (meta) => {
      const cacheKey = `${meta?.sub_category_id ?? ''}:${meta?.category_id ?? ''}`;
      if (!contextCache.has(cacheKey)) {
        contextCache.set(cacheKey, await loadListingContext(shopRecord, meta));
      }
      return contextCache.get(cacheKey);
    };
    const skipped = [];

    const validItems = [];
    for (const [rowIndex, item] of items.entries()) {
      if (!item || !item.name || item.name.toString().trim() === '') {
        continue;
      }
      const priceVal = parseFloat(item.price);
      if (isNaN(priceVal) || priceVal < 0) {
        continue;
      }

      const meta = typeof item.metadata === 'object' && item.metadata !== null ? { ...item.metadata } : {};
      if (item.section && !meta.section) {
        meta.section = item.section.toString().trim();
      }

      // Also copy any custom CSV attributes directly into metadata
      const standardKeys = [
        'shop_id',
        'master_product_id',
        'listing_type',
        'name',
        'description',
        'price',
        'mrp',
        'unit',
        'is_available',
        'img_url',
        'metadata',
      ];
      for (const k of Object.keys(item)) {
        if (!standardKeys.includes(k) && meta[k] === undefined) {
          meta[k] = item[k];
        }
      }

      const choice = await normalizeCategoryChoice(meta);
      if (choice.error) {
        skipped.push({ row: rowIndex + 1, name: item.name.toString().trim(), errors: [{ key: 'sub_category_id', message: choice.error }] });
        continue;
      }
      const context = await contextFor(choice.metadata);
      const { metadata: cleanMeta, errors: fieldErrors } = validateMetadata(context.schema, choice.metadata);
      if (fieldErrors.length) {
        skipped.push({
          row: rowIndex + 1,
          name: item.name.toString().trim(),
          errors: fieldErrors,
        });
        continue;
      }

      validItems.push({
        shop_id,
        master_product_id: item.master_product_id || null,
        listing_type: item.listing_type || listingTypeFor(shopRecord, context.subCategory),
        name: item.name.toString().trim(),
        description: item.description ? item.description.toString().trim() : '',
        price: priceVal,
        mrp: item.mrp && !isNaN(parseFloat(item.mrp)) ? parseFloat(item.mrp) : null,
        unit: item.unit ? item.unit.toString().trim() : 'piece',
        is_available: item.is_available !== undefined ? Boolean(item.is_available) : true,
        metadata: cleanMeta,
        img_url: item.img_url ? item.img_url.toString().trim() : null,
      });
    }

    if (validItems.length === 0) {
      return res.status(400).json({
        error: skipped.length
          ? `No items imported. Row ${skipped[0].row} (${skipped[0].name}): ${skipped[0].errors[0].message}`
          : 'No valid items found to import. Each item requires a name and a valid non-negative price.',
        success: false,
        skipped,
      });
    }

    const createdListings = await shop_listings.bulkCreate(validItems);

    res.status(201).json({
      success: true,
      message: skipped.length
        ? `Imported ${createdListings.length} products. ${skipped.length} skipped because of invalid field values`
        : `Successfully imported ${createdListings.length} products to store catalog`,
      count: createdListings.length,
      skipped,
      data: createdListings,
    });
  } catch (err) {
    console.error('Error in bulk listings import:', err);
    res.status(500).json({ error: 'Internal Server Error', success: false });
  }
});

// 4. Update a listing
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await shop_listings.findByPk(id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (!(await assertShopOwner(req, res, listing.shop_id))) return;

    const {
      name,
      description,
      price,
      mrp,
      unit,
      is_available,
      metadata,
      img_url,
      listing_type,
    } = req.body;

    if (name !== undefined) listing.name = name;
    if (description !== undefined) listing.description = description;
    if (price !== undefined) listing.price = parseFloat(price);
    if (mrp !== undefined) listing.mrp = mrp ? parseFloat(mrp) : null;
    if (unit !== undefined) listing.unit = unit;
    if (is_available !== undefined) listing.is_available = is_available;
    if (metadata !== undefined) {
      const choice = await normalizeCategoryChoice(metadata);
      if (choice.error) return res.status(400).json({ success: false, error: choice.error });
      const shopRecord = await shops.findByPk(listing.shop_id);
      const schema = shopRecord ? (await loadListingContext(shopRecord, choice.metadata)).schema : [];
      const { metadata: cleanMetadata, errors: fieldErrors } = validateMetadata(schema, choice.metadata);
      if (fieldErrors.length) return fieldErrorResponse(res, fieldErrors);
      listing.metadata = cleanMetadata;
    }
    if (img_url !== undefined) listing.img_url = img_url;
    if (listing_type !== undefined) listing.listing_type = listing_type;

    await listing.save();

    res.status(200).json({
      success: true,
      message: 'Listing updated successfully',
      data: listing,
    });
  } catch (err) {
    console.error('Error updating listing:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 5. Delete a listing
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await shop_listings.findByPk(id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (!(await assertShopOwner(req, res, listing.shop_id))) return;

    await listing.destroy();

    res.status(200).json({
      success: true,
      message: 'Listing deleted successfully',
    });
  } catch (err) {
    console.error('Error deleting listing:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 6. Import from Master Products Library
router.post('/import-master', async (req, res) => {
  try {
    const { shop_id, master_product_id, price, mrp, unit } = req.body;
    if (!shop_id || !master_product_id) {
      return res.status(400).json({ error: 'shop_id and master_product_id are required' });
    }

    const master = await products.findByPk(master_product_id);
    if (!master) {
      return res.status(404).json({ error: 'Master product not found' });
    }

    const shopRecord = await shops.findByPk(shop_id);
    if (!shopRecord) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    if (!canManageShop(req, shopRecord)) {
      return res.status(403).json(FORBIDDEN_SHOP_BODY);
    }
    // Fill the form's default values; the owner completes required fields on edit
    const { schema, subCategory } = await loadListingContext(shopRecord, {});
    const { metadata: importedMetadata } = validateMetadata(
      schema,
      { imported_from_master: true },
      { enforceRequired: false }
    );

    const newListing = await shop_listings.create({
      shop_id,
      master_product_id: master.id,
      listing_type: listingTypeFor(shopRecord, subCategory),
      name: master.name,
      description: master.description,
      price: parseFloat(price) || 0,
      mrp: mrp ? parseFloat(mrp) : null,
      unit: unit || 'piece',
      img_url: master.img_url,
      is_available: true,
      metadata: importedMetadata,
    });

    res.status(201).json({
      success: true,
      message: 'Master product imported to shop catalog',
      data: newListing,
    });
  } catch (err) {
    console.error('Error importing master product:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

