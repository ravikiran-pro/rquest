/**
 * Building and updating listing rows: one set of rules for POST /listings, PUT /listings/:id,
 * POST /listings/bulk (CSV) and the catalogue imports (routes/catalog/owner.js).
 *
 *   sub-category   one of the shop's (400 sub_category_not_in_shop), default the primary
 *   price / MRP    price required, 0..1e9; price above MRP → 400 price_above_mrp
 *   stock          services/stock.js (stock_qty_required, invalid_stock_mode, is_available_derived)
 *   form fields    the resolved form (services/listingForm + formOverrides), catalogue-locked
 *                  keys restored from the snapshot
 *   section        the requested one (400 section_not_in_shop), else the auto section
 *
 * Errors are { status, code, error, errors?: [{ key, message }] }.
 */
const { shop_listings } = require('../models');
const { stockState, defaultStockMode, normaliseStockInput, applyStockFields } = require('./stock');
const { validateListingFields, applyOwnerStatutory, needsDetails, lockedKeysFor, keysLeavingSchema } = require('./formOverrides');
const { listingTypeFor, categoryMetadata, pickShopSubCategory, subCategoryIdFor } = require('./listingForm');

const LISTING_TYPES = ['product', 'food', 'service', 'rental'];
const MAX_PRICE = 1e9;
const MAX_NAME = 255;
// metadata keys only the server writes; a client's values are dropped
const SERVER_KEYS = ['category_name', 'category_id', 'sub_category_id', 'sub_category_name', 'catalog_item_id', 'section'];
// legacy keys kept on existing rows for rollback (never written anew)
const LEGACY_KEYS = ['section', 'category', 'catalog_item_id', 'imported_from_master', 'stock_quantity'];
const STOCK_KEYS = ['stock_mode', 'stock_qty', 'stock', 'stock_quantity', 'low_stock_threshold', 'is_available'];

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const fail = (code, error, errors, status = 400) => ({ status, code, error, ...(errors ? { errors } : {}) });

/** A money field: { value } (null when blank) or { error }. */
const moneyField = (raw, label) => {
  if (isBlank(raw)) return { value: null };
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (typeof raw === 'boolean' || !Number.isFinite(n) || n < 0 || n > MAX_PRICE) {
    return { error: `${label} must be a number of 0 or more` };
  }
  return { value: n };
};

/** Price and MRP after a write. Returns { price, mrp } or an error. */
function checkPrice(priceRaw, mrpRaw, { required = true } = {}) {
  const price = moneyField(priceRaw, 'Price');
  if (price.error) return fail('invalid_price', price.error, [{ key: 'price', message: price.error }]);
  if (price.value === null && required) {
    return fail('invalid_price', 'Price is required', [{ key: 'price', message: 'Price is required' }]);
  }
  const mrp = moneyField(mrpRaw, 'MRP');
  if (mrp.error) return fail('invalid_mrp', mrp.error, [{ key: 'mrp', message: mrp.error }]);
  if (price.value !== null && mrp.value !== null && mrp.value > 0 && price.value > mrp.value) {
    const message = 'Price cannot be more than the MRP';
    return fail('price_above_mrp', message, [{ key: 'price', message }]);
  }
  return { price: price.value, mrp: mrp.value };
}

const stockError = (result) =>
  fail(result.code, result.error, [{ key: result.key || 'stock_qty', message: result.error }]);

/** Client metadata without the keys only the server writes. */
function clientMetadata(raw) {
  const meta = isPlainObject(raw) ? { ...raw } : {};
  for (const key of SERVER_KEYS) delete meta[key];
  return meta;
}

/** Listing JSON (§E1): the row plus stock_state; owner endpoints add needs_details and locked_keys. */
function serializeListing(listing, { owner = false, schema = null } = {}) {
  if (!listing) return listing;
  const plain = typeof listing.get === 'function' ? listing.get({ plain: true }) : { ...listing };
  delete plain.rn;
  plain.stock_state = stockState(plain);
  if (owner) {
    plain.needs_details = schema ? needsDetails(schema, plain.metadata) : false;
    plain.locked_keys = schema ? lockedKeysFor(schema, plain) : [];
  }
  return plain;
}

/**
 * Column values for a new listing, or an error.
 *   shop          the shop record (with form_schema, sub_category_id, shop_type)
 *   ownIds        the shop's sub-category ids (listingForm.shopSubCategoryIds)
 *   loadContext   listingForm.createContextLoader(shop)
 *   sections      sections.createSectionResolver(shop.id)
 *   body          the request fields (see POST /listings)
 *   catalog       { id, snapshot } for a catalogue copy (snapshot may be null when the
 *                 catalogue is not available)
 *   fallbackSubId the sub-category to use when the body names none (catalogue item links)
 *   sectionText   CSV section name (resolved / created by name)
 *   schemaKeys    take form values from these top-level fields too, and keep only form keys
 *   enforceRequired, prefill  see formOverrides.validateListingFields
 * Returns { values, schema, warnings } or { status, code, error, errors? }.
 */
async function buildNewListing({
  shop,
  ownIds,
  loadContext,
  sections,
  body = {},
  catalog = null,
  fallbackSubId = null,
  sectionText = null,
  schemaKeys = null,
  enforceRequired = true,
  prefill = false,
}) {
  const warnings = [];
  const snapshot = catalog && isPlainObject(catalog.snapshot) ? catalog.snapshot : null;

  const requestedSub = !isBlank(body.sub_category_id)
    ? body.sub_category_id
    : isPlainObject(body.metadata) && !isBlank(body.metadata.sub_category_id)
      ? body.metadata.sub_category_id
      : undefined;
  const sub = pickShopSubCategory(requestedSub, ownIds, fallbackSubId ?? shop.sub_category_id);
  if (sub.code) return fail(sub.code, sub.error, [{ key: 'sub_category_id', message: sub.error }]);
  const ctx = await loadContext(sub.id);

  const name = String(isBlank(body.name) ? snapshot?.name || '' : body.name).trim();
  if (!name) return fail('invalid', 'Item name is required', [{ key: 'name', message: 'Item name is required' }]);
  if (name.length > MAX_NAME) {
    return fail('invalid', `Item name can be at most ${MAX_NAME} characters`, [{ key: 'name', message: 'Name is too long' }]);
  }

  const money = checkPrice(body.price, isBlank(body.mrp) ? catalog?.mrpHint ?? null : body.mrp);
  if (money.code) return money;

  const listingType = LISTING_TYPES.includes(body.listing_type)
    ? body.listing_type
    : snapshot?.kind === 'service'
      ? 'service'
      : listingTypeFor(shop, ctx.subCategory) || 'product';

  const stockInput = normaliseStockInput(body);
  if (stockInput.code) return stockError(stockInput);
  const stock = applyStockFields(null, stockInput.input, {
    defaultMode: defaultStockMode({ listingType, templateKey: ctx.subCategory?.template_key, snapshot }),
  });
  if (stock.code) return stockError(stock);

  let meta = clientMetadata(body.metadata);
  if (Array.isArray(schemaKeys) || schemaKeys === true) {
    const keys = new Set(ctx.schema.map((f) => f.key));
    for (const key of keys) {
      if (isBlank(meta[key]) && body[key] !== undefined) meta[key] = body[key];
    }
    // CSV: unknown columns are not stored
    meta = Object.fromEntries(Object.entries(meta).filter(([key]) => keys.has(key)));
  }
  // The owner's answers to a copy's statutory fields count before the copy rules check them
  if (catalog) meta = applyOwnerStatutory(ctx.schema, meta, body.statutory);
  const fields = validateListingFields({
    schema: ctx.schema,
    metadata: meta,
    snapshot,
    catalogItemId: catalog?.id || null,
    prefill,
    enforceRequired,
  });
  if (fields.errors.length) {
    return fail('invalid', fields.errors.map((e) => e.message).join('. '), fields.errors);
  }

  // Section last, so a failing row never creates a section
  let section;
  if (!isBlank(body.section_id)) section = sections.forListing(body.section_id, sub.id);
  else if (!isBlank(sectionText)) section = await sections.byName(sectionText, sub.id);
  else section = sections.forListing(null, sub.id);
  if (section.code) return fail(section.code, section.error, [{ key: 'section_id', message: section.error }]);
  if (section.warning) warnings.push(section.warning);

  const values = {
    shop_id: shop.id,
    master_product_id: body.master_product_id || null,
    listing_type: listingType,
    name,
    description: isBlank(body.description) ? '' : String(body.description).trim(),
    price: money.price,
    mrp: money.mrp,
    unit: isBlank(body.unit) ? (snapshot ? catalog.unit || 'piece' : 'piece') : String(body.unit).trim(),
    img_url: isBlank(body.img_url) ? snapshot?.image_url || null : String(body.img_url).trim(),
    metadata: { ...fields.metadata, ...categoryMetadata(ctx.subCategory, ctx.category) },
    sub_category_id: sub.id,
    section_id: section.section_id ?? null,
    catalog_item_id: catalog?.id || null,
    catalog_snapshot: snapshot,
    catalog_synced_at: snapshot ? new Date() : null,
    ...stock.values,
  };
  return { values, schema: ctx.schema, warnings };
}

/**
 * Changes for PUT /listings/:id, or an error. Same rules as create; every field optional.
 *   catalog  { id, snapshot } when the body sets catalog_item_id (id null clears it)
 * Returns { changes, schema } or { status, code, error, errors? }.
 */
async function buildListingUpdate({ listing, shop, ownIds, loadContext, sections, body = {}, catalog = undefined }) {
  const changes = {};
  const stored = isPlainObject(listing.metadata) ? listing.metadata : {};
  const currentSub = subCategoryIdFor(shop, stored, listing.sub_category_id);

  const requestedSub = body.sub_category_id !== undefined
    ? body.sub_category_id
    : isPlainObject(body.metadata) && !isBlank(body.metadata.sub_category_id)
      ? body.metadata.sub_category_id
      : undefined;
  let newSub = currentSub;
  if (!isBlank(requestedSub) && Number.parseInt(requestedSub, 10) !== currentSub) {
    const picked = pickShopSubCategory(requestedSub, ownIds, null);
    if (picked.code) return fail(picked.code, picked.error, [{ key: 'sub_category_id', message: picked.error }]);
    newSub = picked.id;
  }
  const subChanged = newSub !== currentSub;
  const oldCtx = await loadContext(currentSub);
  const ctx = subChanged ? await loadContext(newSub) : oldCtx;
  if (subChanged || listing.sub_category_id === null || listing.sub_category_id === undefined) {
    changes.sub_category_id = newSub;
  }

  if (body.name !== undefined) {
    const name = String(body.name ?? '').trim();
    if (!name || name.length > MAX_NAME) {
      return fail('invalid', 'Item name is required', [{ key: 'name', message: 'Item name is required' }]);
    }
    changes.name = name;
  }
  if (body.description !== undefined) changes.description = isBlank(body.description) ? '' : String(body.description);
  if (body.unit !== undefined) changes.unit = isBlank(body.unit) ? 'piece' : String(body.unit).trim();
  if (body.img_url !== undefined) changes.img_url = isBlank(body.img_url) ? null : String(body.img_url).trim();
  if (body.listing_type !== undefined) {
    if (!LISTING_TYPES.includes(body.listing_type)) {
      return fail('invalid', 'Unknown listing type', [{ key: 'listing_type', message: 'Unknown listing type' }]);
    }
    changes.listing_type = body.listing_type;
  }

  if (body.price !== undefined || body.mrp !== undefined) {
    const money = checkPrice(
      body.price !== undefined ? body.price : listing.price,
      body.mrp !== undefined ? body.mrp : listing.mrp
    );
    if (money.code) return money;
    if (body.price !== undefined) changes.price = money.price;
    if (body.mrp !== undefined) changes.mrp = money.mrp;
  }

  if (STOCK_KEYS.some((k) => body[k] !== undefined)) {
    const stockInput = normaliseStockInput(body);
    if (stockInput.code) return stockError(stockInput);
    const stock = applyStockFields(listing, stockInput.input);
    if (stock.code) return stockError(stock);
    Object.assign(changes, stock.values);
  }

  // Catalogue reference
  let catalogId = listing.catalog_item_id || null;
  let snapshot = listing.catalog_snapshot || null;
  const catalogChanged = catalog !== undefined && (catalog?.id || null) !== catalogId;
  if (catalogChanged) {
    catalogId = catalog?.id || null;
    snapshot = catalogId ? catalog.snapshot || null : null;
    changes.catalog_item_id = catalogId;
    changes.catalog_snapshot = snapshot;
    changes.catalog_synced_at = snapshot ? new Date() : null;
  }

  // Form values: re-checked when sent, when the form changes, or when the copy changes
  if (body.metadata !== undefined || subChanged || catalogChanged) {
    let meta = body.metadata !== undefined ? clientMetadata(body.metadata) : clientMetadata(stored);
    if (subChanged) {
      for (const key of keysLeavingSchema(oldCtx.schema, ctx.schema)) delete meta[key];
    }
    const fields = validateListingFields({
      schema: ctx.schema,
      metadata: meta,
      snapshot,
      catalogItemId: catalogId,
      prefill: catalogChanged,
    });
    if (fields.errors.length) return fail('invalid', fields.errors.map((e) => e.message).join('. '), fields.errors);
    meta = fields.metadata;
    // Keep legacy keys already on the row (rollback safety); never write new ones
    for (const key of LEGACY_KEYS) {
      if (stored[key] !== undefined && !(key === 'catalog_item_id' && catalogChanged)) meta[key] = stored[key];
    }
    changes.metadata = { ...meta, ...categoryMetadata(ctx.subCategory, ctx.category) };
  }

  if (body.section_id !== undefined) {
    const section = sections.forListing(body.section_id, newSub);
    if (section.code) return fail(section.code, section.error, [{ key: 'section_id', message: section.error }]);
    changes.section_id = section.section_id ?? null;
  } else if (subChanged) {
    // Follow the sub-category only from its auto section (a manual choice stays)
    const oldAuto = sections.autoFor(currentSub);
    if (listing.section_id === null || listing.section_id === undefined || listing.section_id === oldAuto) {
      changes.section_id = sections.autoFor(newSub);
    }
  }

  return { changes, schema: ctx.schema };
}

/** The listing id of this shop's copy of a catalogue item, or null. */
async function catalogCopyId(shopId, catalogItemId, { transaction } = {}) {
  if (!catalogItemId) return null;
  const row = await shop_listings.findOne({
    where: { shop_id: shopId, catalog_item_id: catalogItemId },
    attributes: ['id'],
    transaction,
  });
  return row ? row.id : null;
}

/**
 * Catalogue facts for item ids: Map(id → { row, snapshot, unit, mrpHint }). Empty when the
 * catalogue schema is not set up (listings then keep the id only).
 */
async function loadCatalogCopies(itemIds) {
  const ids = [...new Set((itemIds || []).filter((id) => typeof id === 'string' && id))];
  const out = new Map();
  if (!ids.length) return out;
  // Lazy: the catalogue modules probe an optional schema
  const { catalogStatus } = require('../routes/catalog/db');
  const { enrichedByIds, snapshotFromEnriched, listingUnitFor, mrpHint } = require('../routes/catalog/items');
  let status;
  try {
    status = await catalogStatus();
  } catch (err) {
    return out;
  }
  if (!status.ready) return out;
  const rows = await enrichedByIds(ids);
  const now = new Date();
  for (const row of rows) {
    const snapshot = snapshotFromEnriched(row, now);
    out.set(row.id, { row, snapshot, unit: listingUnitFor(snapshot), mrpHint: mrpHint(row.attributes) });
  }
  return out;
}

/** True for a Postgres unique violation (e.g. the (shop_id, catalog_item_id) index). */
const isUniqueViolation = (err) =>
  Boolean(err) && (err.name === 'SequelizeUniqueConstraintError' || err.original?.code === '23505' || err.parent?.code === '23505');

module.exports = {
  LISTING_TYPES,
  checkPrice,
  clientMetadata,
  serializeListing,
  buildNewListing,
  buildListingUpdate,
  catalogCopyId,
  loadCatalogCopies,
  isUniqueViolation,
};
