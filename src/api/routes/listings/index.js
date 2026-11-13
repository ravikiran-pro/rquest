const express = require('express');
const { shop_listings, shops, products, categories, sub_categories } = require('../../models');
const { Op, literal } = require('sequelize');
const { authMiddleware } = require('../../auth');
const {
  validateMetadata,
  resolveSchema,
  mergeFilterFields,
  buildMetadataFilter,
} = require('../../services/formSchema');

const router = express.Router();

// The form a listing has to follow: the shop's own form if it has one, otherwise
// the form of the listing's category (multi-category shops), otherwise the form
// of the shop's category.
const loadListingSchema = async (shop, metadata) => {
  if (Array.isArray(shop.form_schema) && shop.form_schema.length > 0) {
    return shop.form_schema;
  }
  const categoryId = Number.parseInt(metadata?.category_id, 10) || shop.category_id;
  if (!categoryId) return [];
  const category = await categories.findByPk(categoryId, {
    attributes: ['id', 'form_schema'],
  });
  return resolveSchema(null, category);
};

// The custom-field filters that apply to a set of search results: the
// filterable fields of every form those listings follow, merged by key.
const loadFilterFields = async (items) => {
  const shopIds = [...new Set(items.map((item) => item.shop_id).filter(Boolean))];
  if (shopIds.length === 0) return [];

  const shopRows = await shops.findAll({
    attributes: ['id', 'category_id', 'form_schema'],
    where: { id: shopIds },
  });
  const shopById = new Map(shopRows.map((shop) => [shop.id, shop]));

  // Each listing follows its shop's own form, else its category's form
  const shopSchemas = [];
  const categoryIds = new Set();
  const seenShops = new Set();
  items.forEach((item) => {
    const shop = shopById.get(item.shop_id);
    if (!shop) return;
    if (Array.isArray(shop.form_schema) && shop.form_schema.length > 0) {
      if (!seenShops.has(shop.id)) {
        seenShops.add(shop.id);
        shopSchemas.push(shop.form_schema);
      }
      return;
    }
    const categoryId = Number.parseInt(item.metadata?.category_id, 10) || shop.category_id;
    if (categoryId) categoryIds.add(categoryId);
  });

  const categoryRows = categoryIds.size
    ? await categories.findAll({
        attributes: ['id', 'form_schema'],
        where: { id: [...categoryIds] },
        order: [['id', 'ASC']],
      })
    : [];

  return mergeFilterFields([...categoryRows.map((c) => c.form_schema), ...shopSchemas]);
};

const fieldErrorResponse = (res, errors) =>
  res.status(400).json({
    success: false,
    error: errors.map((e) => e.message).join('. '),
    errors,
  });

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
    const { search, lat, lon, listing_type, category_id, filters, limit = 50 } = req.body;
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

    // Narrow to one category: the listing's own category, or its shop's
    const categoryId = Number.parseInt(category_id, 10);
    let category = null;
    if (!Number.isNaN(categoryId)) {
      category = await categories.findByPk(categoryId, {
        attributes: ['id', 'form_schema'],
      });
      if (!category) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }
      conditions.push({
        [Op.or]: [
          { metadata: { [Op.contains]: { category_id: categoryId } } },
          { '$shop.category_id$': categoryId },
        ],
      });
    }

    // Filter on the category's custom fields, e.g. { food_type: 'veg' }
    const { filter: metadataFilter, errors: filterErrors } = buildMetadataFilter(
      filters,
      category ? category.form_schema : null
    );
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

    // Check the category's custom fields. Starter items seeded at shop sign-up
    // may leave required fields empty for the owner to complete later.
    const schema = await loadListingSchema(shopRecord, metadata);
    const { metadata: cleanMetadata, errors: fieldErrors } = validateMetadata(schema, metadata, {
      enforceRequired: !is_starter,
    });
    if (fieldErrors.length) return fieldErrorResponse(res, fieldErrors);

    let resolvedType = listing_type;
    if (!resolvedType) {
      const typeStr = (
        (shopRecord?.shop_type || '') +
        ' ' +
        (shopRecord?.shopCategory?.name || '')
      ).toLowerCase();
      if (
        typeStr.includes('restaurant') ||
        typeStr.includes('food') ||
        typeStr.includes('bakery') ||
        typeStr.includes('cafe') ||
        typeStr.includes('biri')
      ) {
        resolvedType = 'food';
      } else if (typeStr.includes('rental') || typeStr.includes('bike')) {
        resolvedType = 'rental';
      } else if (
        typeStr.includes('electric') ||
        typeStr.includes('plumb') ||
        typeStr.includes('service') ||
        typeStr.includes('salon') ||
        typeStr.includes('spa')
      ) {
        resolvedType = 'service';
      } else {
        resolvedType = 'product';
      }
    }

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

    const typeStr = (
      (shopRecord?.shop_type || '') +
      ' ' +
      (shopRecord?.shopCategory?.name || '')
    ).toLowerCase();

    let defaultType = 'product';
    if (
      typeStr.includes('restaurant') ||
      typeStr.includes('food') ||
      typeStr.includes('bakery') ||
      typeStr.includes('cafe') ||
      typeStr.includes('biri')
    ) {
      defaultType = 'food';
    } else if (typeStr.includes('rental') || typeStr.includes('bike')) {
      defaultType = 'rental';
    } else if (
      typeStr.includes('electric') ||
      typeStr.includes('plumb') ||
      typeStr.includes('service') ||
      typeStr.includes('salon') ||
      typeStr.includes('spa')
    ) {
      defaultType = 'service';
    }

    // Rows that break the category's form are skipped and reported back
    const schemaCache = new Map();
    const schemaFor = async (meta) => {
      const cacheKey = String(meta?.category_id ?? '');
      if (!schemaCache.has(cacheKey)) {
        schemaCache.set(cacheKey, await loadListingSchema(shopRecord, meta));
      }
      return schemaCache.get(cacheKey);
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

      const { metadata: cleanMeta, errors: fieldErrors } = validateMetadata(
        await schemaFor(meta),
        meta
      );
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
        listing_type: item.listing_type || defaultType,
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
      const shopRecord = await shops.findByPk(listing.shop_id);
      const schema = shopRecord ? await loadListingSchema(shopRecord, metadata) : [];
      const { metadata: cleanMetadata, errors: fieldErrors } = validateMetadata(schema, metadata);
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
    const deleted = await shop_listings.destroy({ where: { id } });

    if (!deleted) {
      return res.status(404).json({ error: 'Listing not found' });
    }

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
    // Fill the form's default values; the owner completes required fields on edit
    const schema = await loadListingSchema(shopRecord, {});
    const { metadata: importedMetadata } = validateMetadata(
      schema,
      { imported_from_master: true },
      { enforceRequired: false }
    );

    const newListing = await shop_listings.create({
      shop_id,
      master_product_id: master.id,
      listing_type: 'product',
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

