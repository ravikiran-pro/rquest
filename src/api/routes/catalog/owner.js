/**
 * Owner endpoints for the master catalog: search it, browse a sub-category, and add items to
 * one of your shops.
 *
 * Mounted behind authMiddleware only (see ./index.js). Import creates a listing the same
 * way POST /api/v1/listings does. The copy is a plain listing: it records the catalog item id
 * (metadata.catalog_item_id, reference only, never synchronised afterwards), the sub-category
 * it was added under (metadata.sub_category_id) and the form fields.
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
const { shops, sub_categories, shop_listings } = require('../../models');
const { validateMetadata } = require('../../services/formSchema');
const { loadListingContext, listingTypeFor, categoryMetadata } = require('../../services/listingForm');
const { subCategoryIdsByShop } = require('../../services/shopSubCategories');
const { isAdminReq } = require('../../auth');

const router = express.Router();

const IMPORT_BULK_LIMIT = 200;

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
// Shop access and the import itself (shared by POST /import and POST /import-bulk)
// ---------------------------------------------------------------------------------------

/** Whole number 0..1e9 or null; anything else is an error. */
const stockField = (raw) => {
  if (raw === undefined || raw === null || raw === '') return { value: null };
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isInteger(n) || n < 0 || n > 1e9) return { error: true };
  return { value: n };
};

/**
 * Price (required), stock and MRP (optional) of a copy. Returns { price, stock, mrp } or
 * { error } with the reason ('invalid_price' | 'invalid_stock' | 'invalid_mrp').
 */
function copyFields(body) {
  if (body.price === undefined || body.price === null || body.price === '') {
    return { error: 'invalid_price', message: 'price is required' };
  }
  const price = numberField(body.price);
  if (price.error || price.value === null || price.value < 0 || price.value > 1e9) {
    return { error: 'invalid_price', message: 'price must be a number of 0 or more' };
  }
  const stock = stockField(body.stock_quantity ?? body.stock);
  if (stock.error) return { error: 'invalid_stock', message: 'stock_quantity must be a whole number of 0 or more' };
  const mrp = numberField(body.mrp);
  if (mrp.error || (mrp.value !== null && (mrp.value < 0 || mrp.value > 1e9))) {
    return { error: 'invalid_mrp', message: 'mrp must be a number of 0 or more' };
  }
  return { price: price.value, stock: stock.value, mrp: mrp.value };
}

/**
 * The shop a caller may import into (owner only), or the error to send. Browsing also
 * accepts a platform admin (allowAdmin).
 */
async function shopForCaller(req, shopId, { allowAdmin = false } = {}) {
  if (!UUID_PATTERN.test(shopId)) return { status: 404, message: 'Shop not found' };
  const shop = await shops.findByPk(shopId);
  if (!shop) return { status: 404, message: 'Shop not found' };
  const userId = req.user?.user_id || req.user?.id;
  const isOwner = Boolean(userId) && String(shop.owner_id) === String(userId);
  if (!isOwner && !(allowAdmin && isAdminReq(req))) {
    return { status: 403, message: 'You can only add items to your own shop' };
  }
  return { shop };
}

/**
 * The sub-category a copy is filed under: one of the shop's own, or the primary when none is
 * given. Returns { id } (null = no sub-category) or { error }.
 */
async function subCategoryForCopy(shop, requested) {
  if (requested === undefined || requested === null || requested === '') {
    return { id: shop.sub_category_id ?? null };
  }
  const id = Number.parseInt(requested, 10);
  if (!Number.isInteger(id) || id < 0) return { error: 'sub_category_id must be a sub-category id' };
  const ownIds = (await subCategoryIdsByShop([shop.id])).get(String(shop.id)) || [];
  if (!ownIds.includes(id)) {
    return { error: "sub_category_id must be one of your shop's sub-categories" };
  }
  return { id };
}

/**
 * Creates one listing from a catalogue item. Returns { listing } or { status, message, reason }.
 * Reasons: not_found, already_added, invalid (form fields), plus the copyFields reasons.
 */
async function addCatalogItem(shop, itemId, fields, { description = '', subCategoryId = null } = {}) {
  const [item] = await enrichedByIds([itemId]);
  if (!item || !item.is_active || item.status === 'rejected') {
    return { status: 404, reason: 'not_found', message: 'Catalog item not found' };
  }

  const table = shop_listings.getTableName();
  const [existing] = await select(
    `SELECT id FROM ${quoteTable(table)} WHERE shop_id = :shop_id AND metadata->>'catalog_item_id' = :item_id LIMIT 1`,
    { shop_id: shop.id, item_id: item.id }
  );
  if (existing) return { status: 409, reason: 'already_added', message: 'This item is already in your shop' };

  // Same form and listing type as a manual listing (services/listingForm)
  const { schema, subCategory, category } = await loadListingContext(shop, { sub_category_id: subCategoryId ?? undefined });
  const { metadata: cleanMetadata, errors } = validateMetadata(schema, {}, { enforceRequired: false });
  if (errors.length) return { status: 400, reason: 'invalid', message: errors.map((e) => e.message).join('. ') };

  // A catalog service item is a service, whatever the shop mostly sells
  const listingType = item.kind === 'service' ? 'service' : listingTypeFor(shop, subCategory);

  const listing = await shop_listings.create({
    shop_id: shop.id,
    master_product_id: null,
    listing_type: listingType,
    name: item.name,
    description,
    price: fields.price,
    mrp: fields.mrp,
    unit: 'piece',
    is_available: true,
    metadata: {
      ...cleanMetadata,
      ...categoryMetadata(subCategory, category),
      catalog_item_id: item.id,
      ...(fields.stock !== null ? { stock_quantity: fields.stock } : {}),
    },
    img_url: item.image_url || null,
  });
  return { listing };
}

// ---------------------------------------------------------------------------------------
// GET /catalog/browse?shop_id=&sub_category_id=&all=1&kind=&status=&q=&limit=&offset=
//   Catalogue items linked (catalog_item_sub_categories) to the sub-category, ordered by name
//   or, with q, by relevance. shop_id must be yours (or an admin's) and is required.
//   Scope: all=1 ignores sub-categories; else sub_category_id; else the shop's own
//   sub-categories (shop_sub_categories). kind = product|service; status = added|not_added
//   (whether this shop already has a copy). Limit max 100, default 20.
//   200 { success, data: [{ id, name, brand, unit, size, image_url, kind, category_path,
//         price_hint, already_added }], count, sub_category: { id, key, name } | null }
//   sub_category is null when the scope is several sub-categories or all.
// ---------------------------------------------------------------------------------------
router.get(
  '/browse',
  requireCatalog,
  handle('catalog browse', async (req, res) => {
    const limit = intParam(req.query.limit, { name: 'limit', fallback: 20, min: 1, max: 100, clamp: true });
    if (limit.error) return fail(res, 400, limit.error);
    const offset = intParam(req.query.offset, { name: 'offset', fallback: 0, min: 0, max: 1e7, clamp: true });
    if (offset.error) return fail(res, 400, offset.error);

    const shopId = textParam(req.query.shop_id, 64);
    if (!shopId) return fail(res, 400, 'shop_id is required');
    const access = await shopForCaller(req, shopId, { allowAdmin: true });
    if (access.message) return fail(res, access.status, access.message);
    const { shop } = access;

    const kind = textParam(req.query.kind, 20);
    if (kind && !['product', 'service'].includes(kind)) return fail(res, 400, 'kind must be product or service');
    const status = textParam(req.query.status, 20);
    if (status && !['added', 'not_added'].includes(status)) {
      return fail(res, 400, 'status must be added or not_added');
    }
    const all = ['1', 'true'].includes(String(req.query.all || ''));

    // Scope: all categories, one sub-category, or the shop's own sub-categories
    let subIds = null;
    let sub = null;
    if (!all) {
      const requestedSub = textParam(req.query.sub_category_id, 12);
      if (requestedSub) {
        const subId = Number.parseInt(requestedSub, 10);
        if (!Number.isInteger(subId) || subId < 0) return fail(res, 400, 'sub_category_id must be a sub-category id');
        sub = await sub_categories.findByPk(subId, { attributes: ['id', 'key', 'name'] });
        if (!sub) return fail(res, 404, 'Sub-category not found');
        subIds = [sub.id];
      } else {
        subIds = (await subCategoryIdsByShop([shop.id])).get(String(shop.id)) || [];
        if (subIds.length === 1) {
          sub = await sub_categories.findByPk(subIds[0], { attributes: ['id', 'key', 'name'] });
        }
      }
    }

    const q = textParam(req.query.q, 200);
    const replacements = { shop_id: shop.id, limit: limit.value, offset: offset.value };
    const where = ['i.is_active', "i.status <> 'rejected'"];
    if (subIds) {
      // No own sub-categories → nothing to show
      if (!subIds.length) return res.json({ success: true, data: [], count: 0, sub_category: null });
      replacements.sub_ids = subIds;
      where.push(
        "EXISTS (SELECT 1 FROM catalog_item_sub_categories l WHERE l.catalog_item_id = i.id AND l.sub_category_id IN (:sub_ids) AND l.source <> 'excluded')"
      );
    }
    if (kind) {
      replacements.kind = kind;
      where.push('i.kind = :kind');
    }
    if (status) {
      const copied =
        'EXISTS (SELECT 1 FROM shop_listings sl WHERE sl.shop_id = :shop_id AND sl.metadata->>\'catalog_item_id\' = i.id)';
      where.push(status === 'added' ? copied : `NOT ${copied}`);
    }
    if (q) {
      const condition = searchConditions(q, replacements, { matchId: true });
      if (condition) where.push(condition);
    }
    const order = [...(q ? searchOrder(req.catalog.trgmSchema) : []), 'i.name', 'i.id'];
    const from = 'FROM catalog.items i LEFT JOIN catalog.brands b ON b.brand_key = i.brand_key';
    const whereSql = where.join(' AND ');

    const [{ n: count }] = await select(`SELECT count(*)::int AS n ${from} WHERE ${whereSql}`, replacements);
    const page = await select(
      `SELECT i.id ${from} WHERE ${whereSql} ORDER BY ${order.join(', ')} LIMIT :limit OFFSET :offset`,
      replacements
    );
    const rows = await enrichedByIds(page.map((r) => r.id));

    // Copies this shop already has (metadata.catalog_item_id) → the listing id
    const ids = rows.map((r) => r.id);
    const copies = ids.length
      ? await select(
          `SELECT id, metadata->>'catalog_item_id' AS catalog_item_id
             FROM ${quoteTable(shop_listings.getTableName())}
            WHERE shop_id = :shop_id AND metadata->>'catalog_item_id' IN (:ids)`,
          { shop_id: shop.id, ids }
        )
      : [];
    const addedBy = new Map(copies.map((c) => [c.catalog_item_id, c.id]));

    res.json({
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        name: row.name,
        brand: row.brand_name || null,
        unit: row.unit || null,
        size: quantityLabel(row) || null,
        image_url: row.image_url || null,
        kind: row.kind,
        category_path: row.category_path || null,
        price_hint: priceHint(row),
        already_added: addedBy.get(row.id) || null,
      })),
      count,
      sub_category: sub ? { id: sub.id, key: sub.key, name: sub.name } : null,
    });
  })
);

/** The catalogue carries no prices today; a number in attributes.price_hint is passed through. */
function priceHint(row) {
  const value = row.attributes && typeof row.attributes === 'object' ? row.attributes.price_hint : undefined;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

// ---------------------------------------------------------------------------------------
// POST /catalog/import  { shop_id, item_id, price, stock_quantity?, mrp?, description?,
//                         sub_category_id? }
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

    const fields = copyFields(body);
    if (fields.error) return fail(res, 400, fields.message);
    const description = typeof body.description === 'string' ? body.description.trim() : '';

    const access = await shopForCaller(req, shopId);
    if (access.message) return fail(res, access.status, access.message);
    const sub = await subCategoryForCopy(access.shop, body.sub_category_id);
    if (sub.error) return fail(res, 400, sub.error);

    const result = await addCatalogItem(access.shop, itemId, fields, { description, subCategoryId: sub.id });
    if (result.message) return fail(res, result.status, result.message);
    return res.status(201).json({ success: true, message: 'Item added to your shop', data: result.listing });
  })
);

// ---------------------------------------------------------------------------------------
// POST /catalog/import-bulk  { shop_id, items: [{ item_id, price, mrp?, stock? }], sub_category_id? }
//   Up to 200 items. Each item is imported as POST /import does; a failing item is reported,
//   not the whole batch. 200 { success, created: [listingId], skipped: [{ item_id, reason }] }
//   reason: already_added · not_found · invalid_price · invalid_stock · invalid_mrp · invalid
// ---------------------------------------------------------------------------------------
router.post(
  '/import-bulk',
  requireCatalog,
  handle('catalog import bulk', async (req, res) => {
    const body = req.body || {};
    const shopId = typeof body.shop_id === 'string' ? body.shop_id.trim() : '';
    if (!shopId) return fail(res, 400, 'shop_id is required');
    if (!Array.isArray(body.items) || body.items.length === 0) return fail(res, 400, 'items must be a non-empty list');
    if (body.items.length > IMPORT_BULK_LIMIT) {
      return fail(res, 400, `at most ${IMPORT_BULK_LIMIT} items per import`);
    }

    const access = await shopForCaller(req, shopId);
    if (access.message) return fail(res, access.status, access.message);
    const sub = await subCategoryForCopy(access.shop, body.sub_category_id);
    if (sub.error) return fail(res, 400, sub.error);

    const created = [];
    const skipped = [];
    for (const entry of body.items) {
      const itemId = entry && typeof entry.item_id === 'string' ? entry.item_id.trim() : '';
      if (!itemId) {
        skipped.push({ item_id: entry?.item_id ?? null, reason: 'invalid' });
        continue;
      }
      const fields = copyFields(entry);
      if (fields.error) {
        skipped.push({ item_id: itemId, reason: fields.error });
        continue;
      }
      const result = await addCatalogItem(access.shop, itemId, fields, { subCategoryId: sub.id });
      if (result.listing) created.push(result.listing.id);
      else skipped.push({ item_id: itemId, reason: result.reason || 'invalid' });
    }

    return res.status(200).json({ success: true, created, skipped });
  })
);

/** Table name from the model (e.g. "shop_listings"), double-quoted for raw SQL. */
function quoteTable(name) {
  const value = typeof name === 'object' && name !== null ? name.tableName : name;
  return `"${String(value).replace(/"/g, '""')}"`;
}

module.exports = router;
