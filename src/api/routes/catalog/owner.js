/**
 * Owner endpoints for the master catalog: search it, browse a sub-category, and add items to
 * one of your shops.
 *
 * Mounted behind authMiddleware only (see ./index.js). Import creates a listing with the same
 * rules as POST /api/v1/listings (services/listingWrite.js). The copy records the catalogue item
 * id (shop_listings.catalog_item_id), a snapshot of the item's facts (catalog_snapshot), the
 * sub-category it is filed under (sub_category_id: the requested one, else the first shop
 * sub-category the item is linked to, else the primary), its section and its stock. Form
 * fields with a catalog_path are filled from the snapshot.
 *
 * Owners only ever see their shop's sub-categories: browse refuses all=1 and foreign
 * sub-categories for non-admins.
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
const { UUID_PATTERN, displayGtin, intParam, quantityLabel } = require('./validate');
const { shops, sub_categories, shop_listings } = require('../../models');
const { createContextLoader, shopSubCategoryIds, listingTypeFor } = require('../../services/listingForm');
const { prefillFromSnapshot } = require('../../services/formOverrides');
const { defaultStockMode } = require('../../services/stock');
const { createSectionResolver } = require('../../services/sections');
const {
  serializeListing,
  buildNewListing,
  loadCatalogCopies,
  isUniqueViolation,
} = require('../../services/listingWrite');
const { snapshotFromEnriched, mrpHint, statutoryFrom } = require('./items');
const { isAdminReq } = require('../../auth');

const router = express.Router();

const IMPORT_BULK_LIMIT = 200;

const fail = (res, status, error, code, extra = {}) =>
  res.status(status).json({ success: false, error, ...(code ? { code } : {}), ...extra });

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
  statutory: statutoryFrom(row.attributes),
  ...(inScope === undefined ? {} : { for_your_shop: Boolean(inScope) }),
});

const SUB_ATTRS = ['id', 'key', 'name', 'catalog_nodes'];

/**
 * The sub-categories a search is about: ?sub_category_id=, else every sub-category of the
 * shop (?shop_id=), primary first. [] when neither is given.
 */
async function scopeSubCategories(query) {
  const subId = Number.parseInt(query.sub_category_id, 10);
  if (Number.isInteger(subId) && subId >= 0) {
    const sub = await sub_categories.findByPk(subId, { attributes: SUB_ATTRS });
    return sub ? [sub] : [];
  }
  const shopId = textParam(query.shop_id, 64);
  if (shopId && UUID_PATTERN.test(shopId)) {
    const shop = await shops.findByPk(shopId, { attributes: ['id', 'sub_category_id'] });
    if (shop) {
      const ids = await shopSubCategoryIds(shop);
      if (ids.length) {
        const rows = await sub_categories.findAll({ where: { id: ids }, attributes: SUB_ATTRS });
        const byId = new Map(rows.map((r) => [r.id, r]));
        return ids.map((id) => byId.get(id)).filter(Boolean);
      }
    }
  }
  return [];
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
    const scopes = await scopeSubCategories(req.query);
    const scope = scopes[0] || null;
    if (!q && !category && !(scope && onlyLinked)) return res.json({ success: true, data: [] });

    const replacements = { limit: limit.value };
    const where = ['i.is_active', "i.status <> 'rejected'"];
    // Linked to any of the shop's sub-categories ranks first
    const linked = scopes.length
      ? `(${scopes.map((sub, i) => subCategoryCondition(sub, replacements, `sc${i}`)).join(' OR ')})`
      : null;
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

/** The first of the shop's sub-categories (position order) a catalogue row is linked to. */
const linkedShopSub = (row, ownIds) => {
  const linked = new Set((row.sub_categories || []).map((s) => s.id));
  return ownIds.find((id) => linked.has(id)) ?? null;
};

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const pick = (...values) => values.find((v) => !isBlank(v));

// listingWrite codes → import-bulk skip reasons
const REASONS = {
  invalid_price: 'invalid_price',
  invalid_mrp: 'invalid_mrp',
  price_above_mrp: 'price_above_mrp',
  stock_qty_required: 'stock_qty_required',
  sub_category_not_in_shop: 'sub_category_not_in_shop',
  section_not_in_shop: 'section_not_in_shop',
};
const reasonFor = (built) => {
  if (REASONS[built.code]) return REASONS[built.code];
  if ((built.errors || []).some((e) => e.key === 'stock_qty')) return 'invalid_stock';
  return 'invalid';
};

/**
 * Imports catalogue items into a shop. Each entry:
 *   { item_id, price, mrp?, sub_category_id?, section_id?, stock_mode?, stock_qty?,
 *     low_stock_threshold?, metadata?, statutory?, description? }   (stock / stock_quantity = stock_qty)
 * statutory: the owner's answers to a catalogue item's statutory fields ({ prescription_required, schedule_drug }).
 * `defaults` fill missing stock_mode / section_id / sub_category_id / low_stock_threshold.
 * Returns { created: [{ item_id, listing_id, listing, schema }], skipped: [{ item_id, reason, message?, errors? }] }.
 */
async function importItems(shop, entries, defaults = {}) {
  const ownIds = await shopSubCategoryIds(shop);
  const loadContext = createContextLoader(shop);
  const sections = await createSectionResolver(shop.id);
  const ids = entries.map((e) => (e && typeof e.item_id === 'string' ? e.item_id.trim() : '')).filter(Boolean);
  const copies = await loadCatalogCopies(ids);
  const existing = ids.length
    ? await shop_listings.findAll({
        where: { shop_id: shop.id, catalog_item_id: [...new Set(ids)] },
        attributes: ['catalog_item_id'],
        raw: true,
      })
    : [];
  const added = new Set(existing.map((r) => r.catalog_item_id));

  const created = [];
  const skipped = [];
  for (const entry of entries) {
    const itemId = entry && typeof entry.item_id === 'string' ? entry.item_id.trim() : '';
    if (!itemId) {
      skipped.push({ item_id: entry?.item_id ?? null, reason: 'invalid', message: 'item_id is required' });
      continue;
    }
    const copy = copies.get(itemId);
    if (!copy || !copy.row.is_active || copy.row.status === 'rejected') {
      skipped.push({ item_id: itemId, reason: 'not_found', message: 'Catalog item not found' });
      continue;
    }
    if (added.has(itemId)) {
      skipped.push({ item_id: itemId, reason: 'already_added', message: 'This item is already in your shop' });
      continue;
    }
    const built = await buildNewListing({
      shop,
      ownIds,
      loadContext,
      sections,
      body: {
        price: entry.price,
        mrp: entry.mrp,
        description: entry.description,
        sub_category_id: pick(entry.sub_category_id, defaults.sub_category_id),
        section_id: pick(entry.section_id, defaults.section_id),
        stock_mode: pick(entry.stock_mode, defaults.stock_mode),
        stock_qty: pick(entry.stock_qty, entry.stock_quantity, entry.stock),
        low_stock_threshold: pick(entry.low_stock_threshold, defaults.low_stock_threshold),
        metadata: entry.metadata,
        statutory: entry.statutory,
      },
      catalog: { id: itemId, snapshot: copy.snapshot, unit: copy.unit, mrpHint: copy.mrpHint },
      fallbackSubId: linkedShopSub(copy.row, ownIds),
      prefill: true,
    });
    if (built.code) {
      skipped.push({
        item_id: itemId,
        reason: reasonFor(built),
        message: built.error,
        ...(built.errors ? { errors: built.errors } : {}),
      });
      continue;
    }
    try {
      const listing = await shop_listings.create(built.values);
      added.add(itemId);
      created.push({ item_id: itemId, listing_id: listing.id, listing, schema: built.schema });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      added.add(itemId);
      skipped.push({ item_id: itemId, reason: 'already_added', message: 'This item is already in your shop' });
    }
  }
  return { created, skipped };
}

/** Up to 4 catalogue facts of a row for the picker card, from the target form's catalogue fields. */
function factsFor(schema, snapshot) {
  const { values } = prefillFromSnapshot(schema, snapshot);
  const facts = [];
  for (const field of schema) {
    if (facts.length >= 4) break;
    if (field.source !== 'catalog' || values[field.key] === undefined) continue;
    const value = values[field.key];
    facts.push({ label: field.label || field.key, value: typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value) });
  }
  return facts;
}

// ---------------------------------------------------------------------------------------
// GET /catalog/browse?shop_id=&sub_category_id=&all=1&kind=&status=&q=&limit=&offset=
//   Catalogue items linked (catalog_item_sub_categories) to the sub-category, ordered by name
//   or, with q, by relevance. shop_id must be yours (or an admin's) and is required.
//   Scope: the shop's own sub-categories (shop_sub_categories), or one of them with
//   sub_category_id. Admins may also pass any sub_category_id or all=1; for owners these are
//   400 sub_category_not_in_shop / scope_not_allowed. kind = product|service;
//   status = added|not_added (whether this shop already has a copy). Limit max 100, default 20.
//   200 { success, data: [{ id, name, brand, unit, size, image_url, kind, category_path,
//         price_hint, mrp_hint, facts: [{ label, value }], sub_category_id,
//         default_stock_mode, already_added, statutory: { prescription_required, schedule_drug } }],
//         count, sub_category: { id, key, name } | null }
//   statutory values are true / false, or null when the catalogue does not know.
//   sub_category is null when the scope is several sub-categories or all. Each row's
//   sub_category_id is the shop sub-category an import would file it under.
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
    const admin = isAdminReq(req);
    if (all && !admin) {
      return fail(res, 400, "The catalogue is limited to your shop's sub-categories", 'scope_not_allowed');
    }
    const ownIds = await shopSubCategoryIds(shop);

    // Scope: all categories (admin), one sub-category, or the shop's own sub-categories
    let subIds = null;
    let sub = null;
    if (!all) {
      const requestedSub = textParam(req.query.sub_category_id, 12);
      if (requestedSub) {
        const subId = Number.parseInt(requestedSub, 10);
        if (!Number.isInteger(subId) || subId < 0) return fail(res, 400, 'sub_category_id must be a sub-category id');
        if (!admin && !ownIds.includes(subId)) {
          return fail(res, 400, "That sub-category is not one of your shop's", 'sub_category_not_in_shop');
        }
        sub = await sub_categories.findByPk(subId, { attributes: ['id', 'key', 'name'] });
        if (!sub) return fail(res, 404, 'Sub-category not found');
        subIds = [sub.id];
      } else {
        subIds = ownIds;
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
      const copied = 'EXISTS (SELECT 1 FROM shop_listings sl WHERE sl.shop_id = :shop_id AND sl.catalog_item_id = i.id)';
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

    // Copies this shop already has (catalog_item_id) → the listing id
    const ids = rows.map((r) => r.id);
    const copies = ids.length
      ? await shop_listings.findAll({
          where: { shop_id: shop.id, catalog_item_id: ids },
          attributes: ['id', 'catalog_item_id'],
          raw: true,
        })
      : [];
    const addedBy = new Map(copies.map((c) => [c.catalog_item_id, c.id]));

    // Where an import would land, and what the picker card shows from that form
    const loadContext = createContextLoader(shop);
    const data = [];
    for (const row of rows) {
      const landing = sub && ownIds.includes(sub.id) ? sub.id : linkedShopSub(row, ownIds) ?? ownIds[0] ?? null;
      const ctx = await loadContext(landing);
      const snapshot = snapshotFromEnriched(row);
      const listingType = row.kind === 'service' ? 'service' : listingTypeFor(shop, ctx.subCategory);
      data.push({
        id: row.id,
        name: row.name,
        brand: row.brand_name || null,
        unit: row.unit || null,
        size: quantityLabel(row) || null,
        image_url: row.image_url || null,
        kind: row.kind,
        category_path: row.category_path || null,
        price_hint: priceHint(row),
        mrp_hint: mrpHint(row.attributes),
        facts: factsFor(ctx.schema, snapshot),
        statutory: statutoryFrom(row.attributes),
        sub_category_id: ctx.subCategoryId,
        default_stock_mode: defaultStockMode({ listingType, templateKey: ctx.subCategory?.template_key, snapshot }),
        already_added: addedBy.get(row.id) || null,
      });
    }

    res.json({
      success: true,
      data,
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
// POST /catalog/import  { shop_id, item_id, price, mrp?, sub_category_id?, section_id?,
//                         stock_mode?, stock_qty?, low_stock_threshold?, metadata?, description? }
//   (stock_quantity / stock are read as stock_qty)
// 201 { success, message, data: Listing }
// 400 bad input (code: invalid_price | price_above_mrp | stock_qty_required |
//     sub_category_not_in_shop | section_not_in_shop | invalid, with errors) · 403 not your
//     shop · 404 shop or item not found · 409 already_added
// ---------------------------------------------------------------------------------------
router.post(
  '/import',
  requireCatalog,
  handle('catalog import', async (req, res) => {
    const body = req.body || {};
    const shopId = typeof body.shop_id === 'string' ? body.shop_id.trim() : '';
    const itemId = typeof body.item_id === 'string' ? body.item_id.trim() : '';
    if (!shopId || !itemId) return fail(res, 400, 'shop_id and item_id are required');

    const access = await shopForCaller(req, shopId);
    if (access.message) return fail(res, access.status, access.message);

    const { created, skipped } = await importItems(access.shop, [{ ...body, item_id: itemId }]);
    if (created.length) {
      const { listing, schema } = created[0];
      return res
        .status(201)
        .json({ success: true, message: 'Item added to your shop', data: serializeListing(listing, { owner: true, schema }) });
    }
    const skip = skipped[0];
    const status = skip.reason === 'not_found' ? 404 : skip.reason === 'already_added' ? 409 : 400;
    return fail(res, status, skip.message || 'Item could not be added', skip.reason, skip.errors ? { errors: skip.errors } : {});
  })
);

// ---------------------------------------------------------------------------------------
// POST /catalog/import-bulk  { shop_id, defaults?: { stock_mode?, section_id?, sub_category_id?,
//                              low_stock_threshold? }, items: [<POST /import item>] }
//   Up to 200 items. Each item is imported as POST /import does; a failing item is reported,
//   not the whole batch. (A top-level sub_category_id is still read as a default.)
//   200 { success, created: [{ item_id, listing_id }], skipped: [{ item_id, reason, message?, errors? }] }
//   reason: already_added · not_found · invalid_price · invalid_stock · invalid_mrp ·
//           price_above_mrp · stock_qty_required · sub_category_not_in_shop ·
//           section_not_in_shop · invalid
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

    const defaults = body.defaults && typeof body.defaults === 'object' && !Array.isArray(body.defaults) ? body.defaults : {};
    const { created, skipped } = await importItems(access.shop, body.items, {
      ...defaults,
      sub_category_id: pick(defaults.sub_category_id, body.sub_category_id),
    });

    return res.status(200).json({
      success: true,
      created: created.map(({ item_id, listing_id }) => ({ item_id, listing_id })),
      skipped,
    });
  })
);

module.exports = router;
