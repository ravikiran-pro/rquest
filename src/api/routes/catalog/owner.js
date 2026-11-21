/**
 * Owner endpoints for the master catalog: search it and add an item to one of your shops.
 *
 * Mounted behind authMiddleware only (see ./index.js). Import creates a listing the same
 * way POST /api/v1/listings does, and records the catalog item id in the listing's
 * metadata (metadata.catalog_item_id) so the same item cannot be added twice to one shop.
 */
const express = require('express');
const { handle, requireCatalog, select } = require('./db');
const {
  enrichedByIds,
  searchConditions,
  searchOrder,
  categoryCondition,
  subCategoryCondition,
} = require('./items');
const { UUID_PATTERN, displayGtin, intParam, numberField, quantityLabel } = require('./validate');
const { shops, categories, sub_categories, shop_listings } = require('../../models');
const { validateMetadata } = require('../../services/formSchema');
const { loadListingContext, listingTypeFor } = require('../../services/listingForm');

const router = express.Router();

const fail = (res, status, error) => res.status(status).json({ success: false, error });

const textParam = (value, max = 200) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/** The shape merchants see. Enriched fields only; no internal ids beyond the item id. */
const searchResult = (row, inScope) => ({
  id: row.id,
  name: row.name,
  brand: row.brand_name || null,
  category: row.category_name || null,
  category_path: row.category_path || null,
  image_url: row.image_url || null,
  quantity_label: quantityLabel(row) || null,
  hsn_code: row.effective_hsn || null,
  gst_rate: row.gst_rate,
  gtin: displayGtin(row.gtin),
  ...(inScope === undefined ? {} : { for_your_shop: Boolean(inScope) }),
});

const SUB_ATTRS = ['id', 'key', 'name', 'catalog_nodes'];

/** The sub-category a search is about: ?sub_category_id=, else the shop's (?shop_id=). */
async function scopeSubCategory(query) {
  const subId = Number.parseInt(query.sub_category_id, 10);
  if (Number.isInteger(subId) && subId >= 0) {
    return sub_categories.findByPk(subId, { attributes: SUB_ATTRS });
  }
  const shopId = textParam(query.shop_id, 64);
  if (shopId && UUID_PATTERN.test(shopId)) {
    const shop = await shops.findByPk(shopId, { attributes: ['id', 'sub_category_id'] });
    if (shop && shop.sub_category_id !== null) {
      return sub_categories.findByPk(shop.sub_category_id, { attributes: SUB_ATTRS });
    }
  }
  return null;
}

// ---------------------------------------------------------------------------------------
// GET /catalog/search?q=&category=&shop_id=&sub_category_id=&only_linked=&limit=
//   (max 50, default 20). Active, not rejected items.
// With a shop or sub-category, items linked to that sub-category rank first and each row
// says whether it is `for_your_shop`; only_linked=1 returns linked items only, and then an
// empty q browses them. Otherwise empty q and category return no rows (no catalog dump).
// ---------------------------------------------------------------------------------------
router.get(
  '/search',
  requireCatalog,
  handle('catalog search', async (req, res) => {
    const limit = intParam(req.query.limit, { name: 'limit', fallback: 20, min: 1, max: 50, clamp: true });
    if (limit.error) return fail(res, 400, limit.error);
    const q = textParam(req.query.q, 200);
    const category = textParam(req.query.category, 200);
    const onlyLinked = ['1', 'true'].includes(String(req.query.only_linked || ''));
    const scope = await scopeSubCategory(req.query);
    if (!q && !category && !(scope && onlyLinked)) return res.json({ success: true, data: [] });

    const replacements = { limit: limit.value };
    const where = ['i.is_active', "i.status <> 'rejected'"];
    const linked = scope ? subCategoryCondition(scope, replacements) : null;
    if (linked && onlyLinked) where.push(linked);
    if (q) {
      const condition = searchConditions(q, replacements, { matchId: true });
      if (condition) where.push(condition);
    }
    if (category) {
      const condition = categoryCondition(category, replacements);
      if (condition) where.push(condition);
    }
    const order = [
      ...(linked && !onlyLinked ? ['linked DESC'] : []),
      ...(q ? searchOrder(req.catalog.trgmSchema) : []),
      'i.name',
      'i.id',
    ];

    const page = await select(
      `SELECT i.id, ${linked || 'NULL'} AS linked
         FROM catalog.items i LEFT JOIN catalog.brands b ON b.brand_key = i.brand_key
        WHERE ${where.join(' AND ')}
        ORDER BY ${order.join(', ')}
        LIMIT :limit`,
      replacements
    );
    const linkedById = new Map(page.map((r) => [r.id, r.linked]));
    const rows = await enrichedByIds(page.map((r) => r.id));
    res.json({
      success: true,
      data: rows.map((row) => searchResult(row, scope ? linkedById.get(row.id) : undefined)),
      ...(scope ? { sub_category: { id: scope.id, key: scope.key, name: scope.name } } : {}),
    });
  })
);

// ---------------------------------------------------------------------------------------
// Import helpers (mirror POST /api/v1/listings in src/api/routes/listings/index.js)
// ---------------------------------------------------------------------------------------


/** Whole number 0..1e9 or null; anything else is an error. */
const stockField = (raw) => {
  if (raw === undefined || raw === null || raw === '') return { value: null };
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isInteger(n) || n < 0 || n > 1e9) return { error: true };
  return { value: n };
};

// ---------------------------------------------------------------------------------------
// POST /catalog/import  { shop_id, item_id, price, stock_quantity?, description? }
// 201 { success, message, data: listing }
// 400 bad input · 403 not your shop · 404 shop or item not found · 409 already in this shop
// ---------------------------------------------------------------------------------------
router.post(
  '/import',
  requireCatalog,
  handle('catalog import', async (req, res) => {
    const body = req.body || {};
    const shopId = typeof body.shop_id === 'string' ? body.shop_id.trim() : '';
    const itemId = typeof body.item_id === 'string' ? body.item_id.trim() : '';
    if (!shopId || !itemId) return fail(res, 400, 'shop_id and item_id are required');

    const price = numberField(body.price);
    if (body.price === undefined || body.price === null || body.price === '') {
      return fail(res, 400, 'price is required');
    }
    if (price.error || price.value === null || price.value < 0 || price.value > 1e9) {
      return fail(res, 400, 'price must be a number of 0 or more');
    }
    const stock = stockField(body.stock_quantity);
    if (stock.error) return fail(res, 400, 'stock_quantity must be a whole number of 0 or more');
    const description = typeof body.description === 'string' ? body.description.trim() : '';

    if (!UUID_PATTERN.test(shopId)) return fail(res, 404, 'Shop not found');
    const shop = await shops.findByPk(shopId, {
      include: [{ model: categories, as: 'shopCategory', attributes: ['name'] }],
    });
    if (!shop) return fail(res, 404, 'Shop not found');

    const userId = req.user?.user_id || req.user?.id;
    if (!userId || String(shop.owner_id) !== String(userId)) {
      return fail(res, 403, 'You can only add items to your own shop');
    }

    const [item] = await enrichedByIds([itemId]);
    if (!item || !item.is_active || item.status === 'rejected') {
      return fail(res, 404, 'Catalog item not found');
    }

    const table = shop_listings.getTableName();
    const [existing] = await select(
      `SELECT id FROM ${quoteTable(table)} WHERE shop_id = :shop_id AND metadata->>'catalog_item_id' = :item_id LIMIT 1`,
      { shop_id: shop.id, item_id: item.id }
    );
    if (existing) return fail(res, 409, 'This item is already in your shop');

    // Same form and listing type as a manual listing (services/listingForm)
    const { schema, subCategory } = await loadListingContext(shop, {});
    const { metadata: cleanMetadata, errors } = validateMetadata(schema, {}, { enforceRequired: false });
    if (errors.length) return fail(res, 400, errors.map((e) => e.message).join('. '));

    // A catalog service item is a service, whatever the shop mostly sells
    const listingType = item.kind === 'service' ? 'service' : listingTypeFor(shop, subCategory);

    const listing = await shop_listings.create({
      shop_id: shop.id,
      master_product_id: null,
      listing_type: listingType,
      name: item.name,
      description,
      price: price.value,
      mrp: null,
      unit: 'piece',
      is_available: true,
      metadata: {
        ...cleanMetadata,
        catalog_item_id: item.id,
        ...(stock.value !== null ? { stock_quantity: stock.value } : {}),
      },
      img_url: item.image_url || null,
    });

    return res.status(201).json({ success: true, message: 'Item added to your shop', data: listing });
  })
);

/** Table name from the model (e.g. "shop_listings"), double-quoted for raw SQL. */
function quoteTable(name) {
  const value = typeof name === 'object' && name !== null ? name.tableName : name;
  return `"${String(value).replace(/"/g, '""')}"`;
}

module.exports = router;
