const express = require('express');
const { QueryTypes, Op, literal } = require('sequelize');
const { sequelize, shop_listings, shops, products, categories, sub_categories, shop_sections } = require('../../models');
const { authMiddleware, isAdminReq } = require('../../auth');
const { mergeFilterFields, buildMetadataFilter } = require('../../services/formSchema');
const {
  createContextLoader,
  shopSubCategoryIds,
  subCategoryIdFor,
  categoryIdFor,
} = require('../../services/listingForm');
const { layerSchema } = require('../../services/formOverrides');
const { normaliseStockInput, applyStockFields } = require('../../services/stock');
const { ensureAutoSections, listSections, createSectionResolver } = require('../../services/sections');
const { subCategoriesForShop } = require('../../services/shopSubCategories');
const {
  parseListingQuery,
  buildListingWhere,
  listingOrder,
  needsDetailsCondition,
  SUMMARY_SELECT,
} = require('../../services/listingQuery');
const {
  serializeListing,
  buildNewListing,
  buildListingUpdate,
  catalogCopyId,
  loadCatalogCopies,
  isUniqueViolation,
} = require('../../services/listingWrite');

const router = express.Router();

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BULK_ROW_LIMIT = 500;
const INVENTORY_LIMIT = 200;
const ASSIGN_LIMIT = 500;
const STOREFRONT_PER_SECTION = { fallback: 10, max: 20 };
const STOREFRONT_PREFETCH = { fallback: 3, max: 10 };

const hasFields = (schema) => Array.isArray(schema) && schema.length > 0;
const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

const select = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const selectListings = (sql, replacements) =>
  sequelize.query(sql, { replacements, model: shop_listings, mapToModel: true });

const errorBody = ({ error, code, errors, ...rest }) => ({
  success: false,
  error,
  ...(code ? { code } : {}),
  ...(errors ? { errors } : {}),
  ...rest,
});
const sendFail = (res, result) => res.status(result.status || 400).json(errorBody(result));

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
    const subId = subCategoryIdFor(shop, item.metadata, item.sub_category_id);
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

const FORBIDDEN_SHOP_BODY = {
  success: false,
  error: 'Only the shop owner can manage this shop\'s listings',
};

/** The shop (with what the form resolution needs) or null for a bad / unknown id. */
const findShop = (shopId) =>
  UUID_PATTERN.test(String(shopId || ''))
    ? shops.findByPk(shopId, { include: [{ model: categories, as: 'shopCategory', attributes: ['name'] }] })
    : Promise.resolve(null);

/** Loads the shop and checks the caller manages it; sends 404 / 403 and returns null otherwise. */
const shopForOwner = async (req, res, shopId) => {
  const shop = await findShop(shopId);
  if (!shop) {
    res.status(404).json({ success: false, error: 'Shop not found' });
    return null;
  }
  if (!canManageShop(req, shop)) {
    res.status(403).json(FORBIDDEN_SHOP_BODY);
    return null;
  }
  return shop;
};

/** Everything a listing write needs for one shop. */
const writeContext = async (shop) => ({
  ownIds: await shopSubCategoryIds(shop),
  loadContext: createContextLoader(shop),
  sections: await createSectionResolver(shop.id),
});

/** Listings JSON for owners: each with needs_details / locked_keys from its own form. */
const serializeForOwner = async (rows, loadContext, shop) =>
  Promise.all(
    rows.map(async (row) => {
      const ctx = await loadContext(subCategoryIdFor(shop, row.metadata, row.sub_category_id));
      return serializeListing(row, { owner: true, schema: ctx.schema });
    })
  );

/** The resolved forms a shop's listings follow, keyed by sub-category id, with UI flags. */
const resolvedForms = async (shop, loadContext, subIds) => {
  const forms = {};
  for (const subId of subIds) {
    const ctx = await loadContext(subId);
    if (!ctx.subCategoryId) continue;
    forms[String(ctx.subCategoryId)] = ctx.schemaSource === 'override' ? ctx.schema : layerSchema(ctx.schema, null);
  }
  return forms;
};

/** One page of a shop's listings for parsed params. Returns { rows, total }. */
const pageOfListings = async (shopId, params, { scope, needsDetails } = {}) => {
  const { sql, replacements } = buildListingWhere(params, { shopId, scope, needsDetails });
  const [{ n }] = await select(`SELECT count(*)::int AS n FROM shop_listings l WHERE ${sql}`, replacements);
  const rows = await selectListings(
    `SELECT l.* FROM shop_listings l WHERE ${sql} ORDER BY ${listingOrder(params.sort)} LIMIT :limit OFFSET :offset`,
    { ...replacements, limit: params.limit, offset: params.offset }
  );
  return { rows, total: n };
};

const intQuery = (raw, { fallback, max }) => {
  if (isBlank(raw)) return { value: fallback };
  if (!/^\d+$/.test(String(raw).trim())) return { error: true };
  return { value: Math.min(Math.max(Number(raw), 0), max) };
};

// 1a. Storefront: section headers with the first items of the first few sections (Public)
//   GET /listings/shop/:shop_id/storefront?per_section=10&prefetch=3
router.get('/shop/:shop_id/storefront', async (req, res) => {
  try {
    const shop = await findShop(req.params.shop_id);
    if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

    const perSection = intQuery(req.query.per_section, STOREFRONT_PER_SECTION);
    const prefetch = intQuery(req.query.prefetch, STOREFRONT_PREFETCH);
    if (perSection.error || prefetch.error) {
      return res.status(400).json({ success: false, code: 'bad_param', error: 'per_section and prefetch must be whole numbers' });
    }

    try {
      await ensureAutoSections(shop.id);
    } catch (err) {
      console.warn('storefront: could not ensure auto sections:', err.message);
    }

    const sections = await listSections(shop.id, { publicOnly: true });
    const [{ n: unsectioned }] = await select(
      'SELECT count(*)::int AS n FROM shop_listings WHERE shop_id = :shopId AND section_id IS NULL',
      { shopId: shop.id }
    );

    const prefetchIds = sections.slice(0, prefetch.value).map((s) => s.id);
    const itemsBySection = new Map(prefetchIds.map((id) => [id, []]));
    if (prefetchIds.length && perSection.value > 0) {
      const rows = await selectListings(
        `SELECT * FROM (
           SELECT l.*, row_number() OVER (PARTITION BY l.section_id ORDER BY ${listingOrder('default')}) AS rn
             FROM shop_listings l
            WHERE l.shop_id = :shopId AND l.section_id IN (:ids)
         ) x WHERE x.rn <= :per ORDER BY x.section_id, x.rn`,
        { shopId: shop.id, ids: prefetchIds, per: perSection.value }
      );
      rows.forEach((row) => itemsBySection.get(row.section_id)?.push(serializeListing(row)));
    }

    // Forms of the shop's sub-categories and of any other sub-category its listings follow
    const loadContext = createContextLoader(shop);
    const ownIds = await shopSubCategoryIds(shop);
    const listedSubs = await select(
      'SELECT DISTINCT sub_category_id FROM shop_listings WHERE shop_id = :shopId AND sub_category_id IS NOT NULL',
      { shopId: shop.id }
    );
    const subIds = [...new Set([...ownIds, ...listedSubs.map((r) => r.sub_category_id)])];
    const forms = await resolvedForms(shop, loadContext, subIds);

    res.status(200).json({
      success: true,
      sections: sections.map((s) => ({
        id: s.id,
        name: s.name,
        sub_category_id: s.sub_category_id ?? null,
        is_auto: Boolean(s.is_auto),
        count: s.count,
        in_stock_count: s.in_stock_count,
        items: itemsBySection.get(s.id) || [],
      })),
      unsectioned_count: unsectioned,
      total: sections.reduce((sum, s) => sum + s.count, 0) + unsectioned,
      filter_fields: mergeFilterFields(Object.values(forms)),
      forms,
    });
  } catch (err) {
    console.error('Error in storefront listings:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// 1b. Get listings by shop ID (Public)
//   No paging/filter params: every listing (legacy array). With any of limit / offset / q /
//   section_id (an id, or "none") / sub_category_id / stock (in | out): one page.
//   Listings in hidden sections are left out either way.
router.get('/shop/:shop_id', async (req, res) => {
  try {
    const { shop_id } = req.params;
    if (!UUID_PATTERN.test(String(shop_id))) {
      return res.status(404).json({ success: false, error: 'Shop not found' });
    }
    const parsed = parseListingQuery(req.query, { scope: 'public' });
    if (parsed.error) return res.status(400).json(errorBody(parsed));
    const { params } = parsed;

    if (params.legacy) {
      const { sql, replacements } = buildListingWhere({ type: params.type }, { shopId: shop_id, scope: 'public' });
      const items = await selectListings(
        `SELECT l.* FROM shop_listings l WHERE ${sql} ORDER BY l.is_available DESC, l."createdAt" DESC`,
        replacements
      );
      return res.status(200).json({ success: true, data: items.map((item) => serializeListing(item)) });
    }

    const { rows, total } = await pageOfListings(shop_id, params, { scope: 'public' });
    res.status(200).json({
      success: true,
      data: rows.map((row) => serializeListing(row)),
      total,
      limit: params.limit,
      offset: params.offset,
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
          { sub_category_id: subCategoryId },
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
      data: items.map((item) => serializeListing(item)),
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

// 3. Owner list: one page with filters, plus whole-shop counts
//   GET /listings/manage/:shop_id?q=&section_id=&sub_category_id=&stock=&sort=&limit=&offset=
//       &needs_details=1&include_hidden=1
router.get('/manage/:shop_id', async (req, res) => {
  try {
    const shop = await shopForOwner(req, res, req.params.shop_id);
    if (!shop) return;
    const parsed = parseListingQuery(req.query, { scope: 'owner' });
    if (parsed.error) return res.status(400).json(errorBody(parsed));
    const { params } = parsed;

    // "Needs details": a required field of the listing's own form is empty
    const loadContext = createContextLoader(shop);
    const listedSubs = await select('SELECT DISTINCT sub_category_id FROM shop_listings WHERE shop_id = :shopId', {
      shopId: shop.id,
    });
    const requiredBySub = new Map();
    for (const { sub_category_id: subId } of listedSubs) {
      const ctx = await loadContext(subCategoryIdFor(shop, {}, subId));
      requiredBySub.set(subId, ctx.schema.filter((f) => f.required).map((f) => f.key));
    }
    const needsDetails = needsDetailsCondition(requiredBySub);

    const { rows, total } = await pageOfListings(shop.id, params, { scope: 'owner', needsDetails });
    const [summary] = await select(`SELECT ${SUMMARY_SELECT} FROM shop_listings l WHERE l.shop_id = :shopId`, {
      shopId: shop.id,
      ...needsDetails.replacements,
    });
    const [{ n: needsDetailsCount }] = await select(
      `SELECT count(*)::int AS n FROM shop_listings l WHERE l.shop_id = :shopId AND (${needsDetails.sql})`,
      { shopId: shop.id, ...needsDetails.replacements }
    );

    res.status(200).json({
      success: true,
      data: await serializeForOwner(rows, loadContext, shop),
      total,
      limit: params.limit,
      offset: params.offset,
      summary: {
        total: summary.total,
        in_stock: summary.in_stock,
        low: summary.low,
        out: summary.out,
        needs_details: needsDetailsCount,
      },
    });
  } catch (err) {
    console.error('Error in manage listings:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// 4. Inventory: stock changes for many listings
//   PATCH /listings/inventory { shop_id, updates: [{ id, stock_mode?, stock_qty?, delta?,
//                                low_stock_threshold?, is_available? }] }  (1–200)
//   200 { success, updated: [Listing], skipped: [{ id, reason }] }
//   reasons: not_found · stock_qty_required · is_available_derived · negative_stock · invalid
const INVENTORY_REASONS = new Set(['stock_qty_required', 'is_available_derived']);
router.patch('/inventory', async (req, res) => {
  try {
    const { shop_id, updates } = req.body || {};
    if (!Array.isArray(updates) || updates.length === 0 || updates.length > INVENTORY_LIMIT) {
      return res.status(400).json({
        success: false,
        code: 'invalid',
        error: `updates must be a list of 1 to ${INVENTORY_LIMIT} changes`,
      });
    }
    const shop = await shopForOwner(req, res, shop_id);
    if (!shop) return;

    const ids = [...new Set(updates.map((u) => u && u.id).filter((id) => UUID_PATTERN.test(String(id || ''))))];
    const found = ids.length ? await shop_listings.findAll({ where: { id: ids, shop_id: shop.id } }) : [];
    const byId = new Map(found.map((l) => [l.id, l]));
    const touched = new Map();
    const skipped = [];

    for (const update of updates) {
      const id = update && typeof update.id === 'string' ? update.id : null;
      const listing = id ? byId.get(id) : null;
      if (!listing) {
        skipped.push({ id: id ?? null, reason: 'not_found' });
        continue;
      }
      const parsed = normaliseStockInput(update);
      if (parsed.code) {
        skipped.push({ id, reason: 'invalid' });
        continue;
      }
      const input = parsed.input;

      if (input.delta !== undefined) {
        // ±delta on a counted item, applied atomically (orders may change it meanwhile)
        if (input.stock_qty !== undefined || input.stock_mode !== undefined || input.is_available !== undefined) {
          skipped.push({ id, reason: 'invalid' });
          continue;
        }
        const [rows] = await sequelize.query(
          `UPDATE shop_listings
              SET stock_qty = stock_qty + :delta,
                  is_available = (stock_qty + :delta) > 0,
                  low_stock_threshold = COALESCE(CAST(:threshold AS integer), low_stock_threshold),
                  "updatedAt" = now()
            WHERE id = :id AND shop_id = :shopId AND stock_mode = 'tracked' AND stock_qty + :delta >= 0
            RETURNING id`,
          {
            replacements: {
              id,
              shopId: shop.id,
              delta: input.delta,
              threshold: input.low_stock_threshold === undefined ? null : input.low_stock_threshold,
            },
          }
        );
        if (!rows.length) {
          await listing.reload();
          skipped.push({ id, reason: listing.stock_mode === 'tracked' ? 'negative_stock' : 'invalid' });
          continue;
        }
        await listing.reload();
        touched.set(id, listing);
        continue;
      }

      const result = applyStockFields(listing, input);
      if (result.code) {
        skipped.push({ id, reason: INVENTORY_REASONS.has(result.code) ? result.code : 'invalid' });
        continue;
      }
      await listing.update(result.values);
      touched.set(id, listing);
    }

    const loadContext = createContextLoader(shop);
    res.status(200).json({
      success: true,
      updated: await serializeForOwner([...touched.values()], loadContext, shop),
      skipped,
    });
  } catch (err) {
    console.error('Error updating inventory:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// 5. Move listings to a section
//   PATCH /listings/section { shop_id, listing_ids: [uuid] (≤500), section_id }
//   200 { success, updated: <n> } · 400 section_not_in_shop
router.patch('/section', async (req, res) => {
  try {
    const { shop_id, listing_ids, section_id } = req.body || {};
    if (!Array.isArray(listing_ids) || listing_ids.length === 0 || listing_ids.length > ASSIGN_LIMIT) {
      return res.status(400).json({
        success: false,
        code: 'invalid',
        error: `listing_ids must be a list of 1 to ${ASSIGN_LIMIT} listings`,
      });
    }
    const shop = await shopForOwner(req, res, shop_id);
    if (!shop) return;

    const sectionId = Number.parseInt(section_id, 10);
    const section =
      Number.isInteger(sectionId) && String(sectionId) === String(section_id).trim()
        ? await shop_sections.findOne({ where: { id: sectionId, shop_id: shop.id }, attributes: ['id'] })
        : null;
    if (!section) {
      return res.status(400).json({ success: false, code: 'section_not_in_shop', error: 'That section does not belong to this shop' });
    }
    const ids = [...new Set(listing_ids.filter((id) => UUID_PATTERN.test(String(id || ''))))];
    const [updated] = ids.length
      ? await shop_listings.update({ section_id: section.id }, { where: { shop_id: shop.id, id: ids } })
      : [0];
    res.status(200).json({ success: true, updated });
  } catch (err) {
    console.error('Error assigning section:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/** { id, snapshot, unit, mrpHint } for a catalogue id sent on a manual listing. */
const catalogForBody = async (catalogItemId) => {
  const id = String(catalogItemId).trim();
  const copies = await loadCatalogCopies([id]);
  const copy = copies.get(id);
  return copy ? { id, ...copy } : { id, snapshot: null };
};

// 6. Create a listing for a shop
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.shop_id) {
      return res.status(400).json({ success: false, error: 'Shop ID, item name, and price are required' });
    }
    const shop = await shopForOwner(req, res, body.shop_id);
    if (!shop) return;

    let catalog = null;
    if (!isBlank(body.catalog_item_id)) {
      if (await catalogCopyId(shop.id, String(body.catalog_item_id).trim())) {
        return res.status(409).json({ success: false, code: 'already_added', error: 'This item is already in your shop' });
      }
      catalog = await catalogForBody(body.catalog_item_id);
    }

    const ctx = await writeContext(shop);
    const legacySection = body.metadata && typeof body.metadata === 'object' ? body.metadata.section : undefined;
    // Starter items seeded at shop sign-up may leave required fields for the owner to complete
    const built = await buildNewListing({
      shop,
      ...ctx,
      body,
      catalog,
      sectionText: isBlank(body.section) ? legacySection : body.section,
      enforceRequired: !body.is_starter,
      prefill: Boolean(catalog),
    });
    if (built.code) return sendFail(res, built);

    const newListing = await shop_listings.create(built.values);
    res.status(201).json({
      success: true,
      message: 'Listing created successfully',
      data: serializeListing(newListing, { owner: true, schema: built.schema }),
      ...(built.warnings.length ? { warnings: built.warnings } : {}),
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ success: false, code: 'already_added', error: 'This item is already in your shop' });
    }
    console.error('Error creating listing:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 6b. Bulk Create Listings (CSV Import)
//   { shop_id, items: [{ name, price, mrp?, unit?, description?, img_url?, sub_category? |
//     sub_category_id?, section?, stock_mode?, stock_qty?, low_stock_threshold?, <form keys>… }] }
//   At most 500 rows. Only keys of each row's form are stored.
//   201 { success, count, skipped: [{ row, name, errors }], warnings: [{ row, message }], data }
router.post('/bulk', async (req, res) => {
  try {
    const { shop_id, items } = req.body || {};

    if (!shop_id) {
      return res.status(400).json({ error: 'Shop ID is required', success: false });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array cannot be empty', success: false });
    }
    if (items.length > BULK_ROW_LIMIT) {
      return res.status(400).json({
        success: false,
        code: 'too_many_rows',
        error: `A CSV import can have at most ${BULK_ROW_LIMIT} rows (${items.length} sent)`,
      });
    }

    const shop = await shopForOwner(req, res, shop_id);
    if (!shop) return;

    const ctx = await writeContext(shop);
    // sub_category: a name or key (any case) of one of the shop's sub-categories
    const shopSubs = await subCategoriesForShop(shop);
    const subByText = new Map();
    shopSubs.forEach((s) => {
      subByText.set(String(s.id), s.id);
      if (s.key) subByText.set(String(s.key).toLowerCase(), s.id);
      if (s.name) subByText.set(String(s.name).trim().toLowerCase(), s.id);
    });

    const skipped = [];
    const warnings = [];
    const validItems = [];
    for (const [rowIndex, item] of items.entries()) {
      const row = rowIndex + 1;
      const name = item && item.name !== undefined && item.name !== null ? String(item.name).trim() : '';
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        skipped.push({ row, name, errors: [{ key: 'row', message: 'Row is not valid' }] });
        continue;
      }
      let subCategoryId = item.sub_category_id;
      if (isBlank(subCategoryId) && !isBlank(item.sub_category)) {
        subCategoryId = subByText.get(String(item.sub_category).trim().toLowerCase());
        if (subCategoryId === undefined) {
          skipped.push({
            row,
            name,
            errors: [{ key: 'sub_category', message: `"${item.sub_category}" is not one of your shop's sub-categories` }],
          });
          continue;
        }
      }
      const legacySection = item.metadata && typeof item.metadata === 'object' ? item.metadata.section : undefined;
      const built = await buildNewListing({
        shop,
        ...ctx,
        body: { ...item, sub_category_id: subCategoryId },
        sectionText: isBlank(item.section) ? legacySection : item.section,
        schemaKeys: true,
      });
      if (built.code) {
        skipped.push({ row, name, errors: built.errors || [{ key: 'row', message: built.error }] });
        continue;
      }
      built.warnings.forEach((message) => warnings.push({ row, message }));
      validItems.push(built.values);
    }

    if (validItems.length === 0) {
      return res.status(400).json({
        error: skipped.length
          ? `No items imported. Row ${skipped[0].row} (${skipped[0].name}): ${skipped[0].errors[0].message}`
          : 'No valid items found to import. Each item requires a name and a valid non-negative price.',
        success: false,
        skipped,
        warnings,
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
      warnings,
      data: createdListings.map((l) => serializeListing(l)),
    });
  } catch (err) {
    console.error('Error in bulk listings import:', err);
    res.status(500).json({ error: 'Internal Server Error', success: false });
  }
});

// 7. Update a listing
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!UUID_PATTERN.test(String(id))) return res.status(404).json({ error: 'Listing not found' });
    const listing = await shop_listings.findByPk(id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    const shop = await shopForOwner(req, res, listing.shop_id);
    if (!shop) return;
    const body = req.body || {};

    let catalog;
    if (body.catalog_item_id !== undefined) {
      if (isBlank(body.catalog_item_id)) catalog = null;
      else {
        const itemId = String(body.catalog_item_id).trim();
        const other = await catalogCopyId(shop.id, itemId);
        if (other && other !== listing.id) {
          return res.status(409).json({ success: false, code: 'already_added', error: 'This item is already in your shop' });
        }
        catalog = itemId === listing.catalog_item_id ? undefined : await catalogForBody(itemId);
      }
    }

    const ctx = await writeContext(shop);
    const built = await buildListingUpdate({ listing, shop, ...ctx, body, catalog });
    if (built.code) return sendFail(res, built);
    await listing.update(built.changes);

    res.status(200).json({
      success: true,
      message: 'Listing updated successfully',
      data: serializeListing(listing, { owner: true, schema: built.schema }),
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ success: false, code: 'already_added', error: 'This item is already in your shop' });
    }
    console.error('Error updating listing:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 8. Delete a listing
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!UUID_PATTERN.test(String(id))) return res.status(404).json({ error: 'Listing not found' });
    const listing = await shop_listings.findByPk(id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (!(await shopForOwner(req, res, listing.shop_id))) return;

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

// 9. Import from Master Products Library (legacy)
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

    const shop = await shopForOwner(req, res, shop_id);
    if (!shop) return;

    // Fill the form's default values; the owner completes required fields on edit
    const ctx = await writeContext(shop);
    const built = await buildNewListing({
      shop,
      ...ctx,
      body: {
        master_product_id: master.id,
        name: master.name,
        description: master.description,
        price: parseFloat(price) || 0,
        mrp: mrp ? parseFloat(mrp) : null,
        unit: unit || 'piece',
        img_url: master.img_url,
        metadata: { imported_from_master: true },
      },
      enforceRequired: false,
    });
    if (built.code) return sendFail(res, built);

    const newListing = await shop_listings.create(built.values);

    res.status(201).json({
      success: true,
      message: 'Master product imported to shop catalog',
      data: serializeListing(newListing, { owner: true, schema: built.schema }),
    });
  } catch (err) {
    console.error('Error importing master product:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
