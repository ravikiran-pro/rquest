/**
 * Platform admin endpoints for the master catalog (src/screens/admin/catalog_items.jsx).
 *
 * Mounted behind authMiddleware + requireAdmin + requireCatalog (see ./index.js).
 * Items are never hard-deleted: DELETE sets is_active = false and POST .../restore sets it
 * back. Writes mirror the pipeline's identity rules (catalog/lib/product.js) so an admin
 * item gets the same id the pipeline would compute for the same brand, name and quantity.
 */
const express = require('express');
const { randomUUID } = require('crypto');
const { sequelize, select, handle } = require('./db');
const { enrichedByIds, searchConditions, searchOrder, subCategoryCondition } = require('./items');
const { categories, sub_categories } = require('../../models');
const {
  ITEM_STATUSES,
  EDITABLE_STATUSES,
  KINDS,
  UNITS,
  GTIN_ERRORS,
  cleanText,
  nameKey,
  normalizeGtin,
  sha256,
  contentHash,
  escapeLike,
  intParam,
  numberField,
} = require('./validate');

const router = express.Router();

const ITEM_ID_PATTERN = /^(gtin:[0-9]{14}|key:[0-9a-f]{20}|src:[a-z0-9-]+:.+)$/;
const HSN_PATTERN = /^\d{2}(\d{2}){0,3}$/;

const fail = (res, status, error) => res.status(status).json({ success: false, error });

/** Query/body text: trimmed, cut to `max` characters, '' when absent or not a string. */
const textParam = (value, max = 200) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

const nullableText = (value, max) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text ? text.slice(0, max) : null;
};

/** Same weights as catalog/lib/product.js qualityOf (completeness, 0-100). */
function qualityScore({ name, brand, quantity, category, gtin, image, diet }) {
  return (
    (name ? 25 : 0) +
    (brand ? 15 : 0) +
    (quantity ? 15 : 0) +
    (category ? 15 : 0) +
    (gtin ? 15 : 0) +
    (image ? 10 : 0) +
    (diet ? 5 : 0)
  );
}

/** Pipeline identity (catalog/lib/product.js identityOf) for an item written by an admin. */
function identityFor({ gtin, brandKey, nameKeyValue, netQuantity, unit }) {
  if (gtin) return { id: `gtin:${gtin}`, dedupeKey: null };
  if (brandKey && nameKeyValue && netQuantity !== null) {
    const dedupeKey = `${brandKey}|${nameKeyValue}|${netQuantity}|${unit}`;
    return { id: `key:${sha256(dedupeKey).slice(0, 20)}`, dedupeKey };
  }
  return { id: `src:admin:${randomUUID()}`, dedupeKey: null };
}

/**
 * Validates an item form. `existing` is the stored row on edit (its barcode and status
 * are kept). Returns { errors, value } with cleaned values ready for SQL.
 */
/**
 * sub_category_ids from the form: undefined means "not sent" (links unchanged), null or []
 * clears them, otherwise a list of distinct positive ids.
 */
function parseSubCategoryIds(raw) {
  if (raw === undefined) return { ids: null };
  if (raw === null) return { ids: [] };
  if (!Array.isArray(raw)) return { error: 'Sub-categories must be a list' };
  if (raw.length > 30) return { error: 'An item can be linked to at most 30 sub-categories' };
  const ids = [];
  for (const entry of raw) {
    const id = Number.parseInt(entry, 10);
    if (!Number.isInteger(id) || id <= 0) return { error: 'Invalid sub-category id' };
    if (!ids.includes(id)) ids.push(id);
  }
  return { ids };
}

/**
 * Makes the item's links match the admin's choice. Chosen ids become 'manual' links.
 * A deselected manual link is removed; a deselected rule link becomes 'excluded' so the
 * next rebuild does not bring it back.
 */
async function syncSubCategoryLinks(itemId, subIds, transaction) {
  const current = await select(
    'SELECT sub_category_id, source FROM catalog_item_sub_categories WHERE catalog_item_id = :itemId',
    { itemId },
    { transaction }
  );
  const keep = new Set(subIds);
  for (const row of current) {
    if (keep.has(row.sub_category_id)) continue;
    if (row.source === 'manual') {
      await select(
        'DELETE FROM catalog_item_sub_categories WHERE catalog_item_id = :itemId AND sub_category_id = :sub',
        { itemId, sub: row.sub_category_id },
        { transaction }
      );
    } else if (row.source === 'rule') {
      await select(
        "UPDATE catalog_item_sub_categories SET source = 'excluded', updated_at = now() WHERE catalog_item_id = :itemId AND sub_category_id = :sub",
        { itemId, sub: row.sub_category_id },
        { transaction }
      );
    }
  }
  for (const sub of subIds) {
    await select(
      `INSERT INTO catalog_item_sub_categories (catalog_item_id, sub_category_id, source)
       VALUES (:itemId, :sub, 'manual')
       ON CONFLICT (catalog_item_id, sub_category_id) DO UPDATE SET source = 'manual', updated_at = now()`,
      { itemId, sub },
      { transaction }
    );
  }
}

function parseItemForm(body, { creating, existing = null }) {
  const errors = [];
  const value = {};

  value.name = cleanText(body.name);
  value.nameKey = value.name ? nameKey(value.name) : null;
  if (!value.name) errors.push('Name is required');
  else if (value.name.length > 200) errors.push('Name must be at most 200 characters');
  else if (!value.nameKey) errors.push('Name needs at least one letter or number');

  const kindRaw = body.kind === undefined || body.kind === null || body.kind === '' ? null : body.kind;
  value.kind = kindRaw ?? (creating ? 'product' : existing.kind);
  if (!KINDS.includes(value.kind)) errors.push('Type must be product or service');

  value.brandName = cleanText(body.brand);
  value.brandKey = value.brandName ? nameKey(value.brandName) : null;
  if (value.brandName && !value.brandKey) errors.push('Brand needs at least one letter or number');

  if (creating) {
    value.gtin = null;
    const rawGtin = typeof body.gtin === 'string' ? body.gtin.trim() : body.gtin;
    if (rawGtin !== undefined && rawGtin !== null && rawGtin !== '') {
      const result = normalizeGtin(rawGtin);
      if (result.gtin) value.gtin = result.gtin;
      else errors.push(GTIN_ERRORS[result.reason] || 'Barcode is not valid');
    }
  } else {
    value.gtin = existing.gtin;
  }

  const quantity = numberField(body.net_quantity);
  value.netQuantity = null;
  if (quantity.error) {
    errors.push('Net quantity must be a number');
  } else if (quantity.value !== null) {
    const rounded = Math.round(quantity.value * 1000) / 1000;
    if (!(rounded > 0 && rounded < 1e9)) errors.push('Net quantity must be above 0');
    else value.netQuantity = rounded;
  }
  value.unit = null;
  if (value.netQuantity !== null) {
    if (UNITS.includes(body.unit)) value.unit = body.unit;
    else errors.push('Choose a unit: g, ml or pc');
  }

  value.quantityText = cleanText(body.quantity_text);
  if (value.quantityText && value.quantityText.length > 60) errors.push('Pack label must be at most 60 characters');

  value.taxonomyNodeId = nullableText(body.taxonomy_node_id, 200);

  const subIds = parseSubCategoryIds(body.sub_category_ids);
  if (subIds.error) errors.push(subIds.error);
  value.subCategoryIds = subIds.ids;

  value.hsnCode = nullableText(body.hsn_code, 8);
  if (value.hsnCode && !HSN_PATTERN.test(value.hsnCode)) errors.push('HSN code must be 2, 4, 6 or 8 digits');

  const country = nullableText(body.country_of_origin, 2);
  value.countryOfOrigin = country ? country.toUpperCase() : null;
  if (value.countryOfOrigin && !/^[A-Z]{2}$/.test(value.countryOfOrigin)) {
    errors.push('Country of origin must be a 2-letter code');
  }

  value.manufacturer = cleanText(body.manufacturer);

  value.imageUrl = nullableText(body.image_url, 2000);
  if (value.imageUrl && !/^https?:\/\/\S+$/i.test(value.imageUrl)) errors.push('Image must be a http or https link');

  const statusRaw = body.status === undefined || body.status === null || body.status === '' ? null : body.status;
  value.status = statusRaw ?? (creating ? 'verified' : existing.status);
  if (!EDITABLE_STATUSES.includes(value.status)) {
    errors.push(`Status must be one of: ${EDITABLE_STATUSES.join(', ')}`);
  }

  return { errors, value };
}

/** Category and HSN code must exist and be active (the foreign keys are not enough). */
async function checkReferences(value) {
  if (value.taxonomyNodeId) {
    const [node] = await select('SELECT id FROM catalog.taxonomy_nodes WHERE id = :id AND is_active', {
      id: value.taxonomyNodeId,
    });
    if (!node) return 'Category not found';
  }
  if (value.subCategoryIds && value.subCategoryIds.length) {
    const found = await select(
      'SELECT id FROM sub_categories WHERE id IN (:ids) AND is_active',
      { ids: value.subCategoryIds }
    );
    if (found.length !== value.subCategoryIds.length) return 'Sub-category not found';
  }
  if (value.hsnCode) {
    const [code] = await select('SELECT code FROM catalog.hsn_codes WHERE code = :code AND is_active', {
      code: value.hsnCode,
    });
    if (!code) return 'HSN code not found';
  }
  return null;
}

/** Brand row for a brand key: created on first use, never renamed here. */
async function ensureBrand(value, transaction) {
  if (!value.brandKey) return;
  await select(
    `INSERT INTO catalog.brands (brand_key, name, aliases, source, content_hash, is_active)
     VALUES (:brand_key, :name, '[]'::jsonb, 'admin', :hash, true)
     ON CONFLICT (brand_key) DO NOTHING`,
    {
      brand_key: value.brandKey,
      name: value.brandName,
      hash: contentHash({ brand_key: value.brandKey, name: value.brandName }),
    },
    { transaction }
  );
}

/** The unique index that rejected a write, or '' (used for the 409 message). */
const uniqueConstraint = (err) => {
  const code = err?.original?.code || err?.parent?.code;
  if (code !== '23505') return null;
  return err.original?.constraint || err.parent?.constraint || '';
};

const DUPLICATE_MESSAGES = [
  ['gtin', 'This barcode is already in the catalog'],
  ['dedupe', 'An item with the same brand, name and quantity is already in the catalog'],
];

const duplicateMessage = (constraint) =>
  (DUPLICATE_MESSAGES.find(([part]) => constraint.includes(part)) || [null, 'This item is already in the catalog'])[1];

// ---------------------------------------------------------------------------------------
// GET /catalog/meta: filter options with counts
// ---------------------------------------------------------------------------------------
router.get(
  '/meta',
  handle('meta', async (req, res) => {
    const [sources, statuses, kinds] = await Promise.all([
      select(
        `SELECT primary_source AS value, count(*)::int AS count
           FROM catalog.items GROUP BY 1 ORDER BY count DESC, value`
      ),
      select(`SELECT status AS value, count(*)::int AS count FROM catalog.items GROUP BY 1 ORDER BY 1`),
      select(`SELECT kind AS value, count(*)::int AS count FROM catalog.items GROUP BY 1 ORDER BY 1`),
    ]);
    res.json({ success: true, data: { sources, statuses, kinds } });
  })
);

// ---------------------------------------------------------------------------------------
// GET /catalog/items: a page of items with filters. Returns { data, count }.
// ---------------------------------------------------------------------------------------
router.get(
  '/items',
  handle('items', async (req, res) => {
    const limit = intParam(req.query.limit, { name: 'limit', fallback: 20, min: 1, max: 100, clamp: true });
    const offset = intParam(req.query.offset, { name: 'offset', fallback: 0, min: 0, max: 1e9 });
    if (limit.error || offset.error) return fail(res, 400, limit.error || offset.error);

    const search = textParam(req.query.search, 200);
    const source = textParam(req.query.source, 64);
    const status = textParam(req.query.status, 32);
    const kind = textParam(req.query.kind, 32);
    const active = textParam(req.query.active, 8) || 'true';
    const subCategoryId = textParam(req.query.sub_category_id, 12);
    if (status && !ITEM_STATUSES.includes(status)) return fail(res, 400, 'Unknown status');
    if (kind && !KINDS.includes(kind)) return fail(res, 400, 'Unknown type');
    if (!['true', 'false', 'all'].includes(active)) return fail(res, 400, 'active must be true, false or all');

    const replacements = {};
    const where = [];
    if (search) {
      const condition = searchConditions(search, replacements, { matchId: true });
      if (condition) where.push(condition);
    }
    if (source) {
      replacements.source = source;
      where.push('i.primary_source = :source');
    }
    if (status) {
      replacements.status = status;
      where.push('i.status = :status');
    }
    if (kind) {
      replacements.kind = kind;
      where.push('i.kind = :kind');
    }
    if (active === 'true') where.push('i.is_active');
    if (active === 'false') where.push('NOT i.is_active');
    if (subCategoryId) {
      const sub = await sub_categories.findByPk(Number.parseInt(subCategoryId, 10) || -1, {
        attributes: ['id', 'key', 'catalog_nodes'],
      });
      if (!sub) return fail(res, 400, 'Unknown sub-category');
      where.push(subCategoryCondition(sub, replacements));
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const from = 'FROM catalog.items i LEFT JOIN catalog.brands b ON b.brand_key = i.brand_key';
    const order = [...(search ? searchOrder(req.catalog.trgmSchema) : []), 'i.updated_at DESC', 'i.id'];

    const [page, [{ count }]] = await Promise.all([
      select(`SELECT i.id ${from} ${whereSql} ORDER BY ${order.join(', ')} LIMIT :limit OFFSET :offset`, {
        ...replacements,
        limit: limit.value,
        offset: offset.value,
      }),
      select(`SELECT count(*)::int AS count ${from} ${whereSql}`, replacements),
    ]);
    const data = await enrichedByIds(page.map((row) => row.id));
    res.json({ success: true, data, count, limit: limit.value, offset: offset.value });
  })
);

// ---------------------------------------------------------------------------------------
// GET /catalog/sub-category-coverage: how many active catalog items each sub-category is
// linked to (its catalog_nodes and their descendants, plus service items tagged with its
// key), and which linked nodes do not exist in the catalog. Sorted by category.
// ---------------------------------------------------------------------------------------
router.get(
  '/sub-category-coverage',
  handle('sub-category coverage', async (req, res) => {
    const subs = await sub_categories.findAll({
      attributes: ['id', 'key', 'name', 'category_id', 'catalog_nodes', 'is_active'],
      include: [{ model: categories, as: 'categories', attributes: ['id', 'name', 'sort_order'] }],
      order: [['sort_order', 'ASC'], ['id', 'ASC']],
    });
    const allNodes = [...new Set(subs.flatMap((s) => (Array.isArray(s.catalog_nodes) ? s.catalog_nodes : [])))];
    const known = allNodes.length
      ? new Set(
          (await select('SELECT id FROM catalog.taxonomy_nodes WHERE id IN (:ids) AND is_active', { ids: allNodes })).map(
            (r) => r.id
          )
        )
      : new Set();

    const data = [];
    for (const sub of subs) {
      const replacements = {};
      const condition = subCategoryCondition(sub, replacements);
      const [{ count }] = await select(
        `SELECT count(*)::int AS count FROM catalog.items i
          WHERE i.is_active AND i.status <> 'rejected' AND ${condition}`,
        replacements
      );
      const nodes = Array.isArray(sub.catalog_nodes) ? sub.catalog_nodes : [];
      data.push({
        id: sub.id,
        key: sub.key,
        name: sub.name,
        is_active: sub.is_active,
        category: sub.categories ? sub.categories.name : null,
        catalog_nodes: nodes,
        missing_nodes: nodes.filter((n) => !known.has(n)),
        item_count: count,
      });
    }
    res.json({
      success: true,
      data,
      summary: {
        sub_categories: data.length,
        with_items: data.filter((d) => d.item_count > 0).length,
        without_links: data.filter((d) => d.catalog_nodes.length === 0).length,
      },
    });
  })
);

// ---------------------------------------------------------------------------------------
// GET /catalog/items/:id: one item with its sources and open review entries
// ---------------------------------------------------------------------------------------
router.get(
  '/items/:id',
  handle('item', async (req, res) => {
    const { id } = req.params;
    if (!ITEM_ID_PATTERN.test(id)) return fail(res, 404, 'Item not found');
    const [item] = await enrichedByIds([id]);
    if (!item) return fail(res, 404, 'Item not found');

    const [sources, reviews] = await Promise.all([
      select(
        `SELECT source, source_id, license, source_url FROM catalog.item_sources
          WHERE item_id = :id AND is_active ORDER BY source, source_id`,
        { id }
      ),
      select(
        `SELECT id, kind FROM catalog.review_queue
          WHERE status = 'open' AND entity = 'item_pair'
            AND (entity_key LIKE :before OR entity_key LIKE :after)
          ORDER BY id`,
        { before: `${escapeLike(id)}|%`, after: `%|${escapeLike(id)}` }
      ),
    ]);
    res.json({ success: true, data: { ...item, sources, reviews } });
  })
);

// ---------------------------------------------------------------------------------------
// POST /catalog/items: a new item created by an admin (primary_source 'admin')
// ---------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------
// GET /catalog/sub-category-options: every active sub-category, for the item form's picker.
// ---------------------------------------------------------------------------------------
router.get(
  '/sub-category-options',
  handle('sub-category options', async (req, res) => {
    const subs = await sub_categories.findAll({
      attributes: ['id', 'key', 'name', 'category_id', 'sort_order'],
      where: { is_active: true },
      include: [{ model: categories, as: 'categories', attributes: ['id', 'name', 'sort_order'] }],
      order: [['sort_order', 'ASC'], ['id', 'ASC']],
    });
    const data = subs.map((s) => ({
      id: s.id,
      key: s.key,
      name: s.name,
      category_id: s.category_id,
      category_name: s.categories ? s.categories.name : '',
    }));
    res.json({ success: true, data });
  })
);

router.post(
  '/items',
  handle('create item', async (req, res) => {
    const { errors, value } = parseItemForm(req.body || {}, { creating: true });
    if (errors.length) return fail(res, 400, errors.join('. '));
    const refError = await checkReferences(value);
    if (refError) return fail(res, 400, refError);

    const { id, dedupeKey } = identityFor({
      gtin: value.gtin,
      brandKey: value.brandKey,
      nameKeyValue: value.nameKey,
      netQuantity: value.netQuantity,
      unit: value.unit,
    });
    const qualityInput = {
      name: value.name,
      brand: value.brandKey,
      quantity: value.netQuantity,
      category: value.taxonomyNodeId,
      gtin: value.gtin,
      image: value.imageUrl,
      diet: false,
    };
    const row = {
      id,
      gtin: value.gtin,
      kind: value.kind,
      name: value.name,
      name_key: value.nameKey,
      brand_key: value.brandKey,
      net_quantity: value.netQuantity,
      unit: value.unit,
      quantity_text: value.quantityText,
      taxonomy_node_id: value.taxonomyNodeId,
      classification_basis: value.taxonomyNodeId ? 'manual' : null,
      hsn_code: value.hsnCode,
      country_of_origin: value.countryOfOrigin,
      manufacturer: value.manufacturer,
      image_url: value.imageUrl,
      dedupe_key: dedupeKey,
      status: value.status,
      quality_score: qualityScore(qualityInput),
    };

    try {
      await sequelize.transaction(async (transaction) => {
        await ensureBrand(value, transaction);
        await select(
          `INSERT INTO catalog.items (
             id, gtin, kind, name, name_key, brand_key, net_quantity, unit, quantity_text,
             taxonomy_node_id, classification_basis, hsn_code, country_of_origin, manufacturer,
             image_url, attributes, dedupe_key, status, quality_score, primary_source, content_hash,
             is_active)
           VALUES (
             :id, :gtin, :kind, :name, :name_key, :brand_key, :net_quantity, :unit, :quantity_text,
             :taxonomy_node_id, :classification_basis, :hsn_code, :country_of_origin, :manufacturer,
             :image_url, '{}'::jsonb, :dedupe_key, :status, :quality_score, 'admin', :content_hash,
             true)`,
          { ...row, content_hash: contentHash(row) },
          { transaction }
        );
        await syncSubCategoryLinks(id, value.subCategoryIds || [], transaction);
      });
    } catch (err) {
      const constraint = uniqueConstraint(err);
      if (constraint !== null) return fail(res, 409, duplicateMessage(constraint));
      throw err;
    }

    const [data] = await enrichedByIds([id]);
    return res.status(201).json({ success: true, message: 'Item added to the catalog', data });
  })
);

// ---------------------------------------------------------------------------------------
// PUT /catalog/items/:id: edit an item. The barcode, id and dedupe key never change.
// Saving marks the item verified/rejected (protected from pipeline re-runs).
// ---------------------------------------------------------------------------------------
router.put(
  '/items/:id',
  handle('update item', async (req, res) => {
    const { id } = req.params;
    if (!ITEM_ID_PATTERN.test(id)) return fail(res, 404, 'Item not found');
    const [existing] = await select('SELECT * FROM catalog.items WHERE id = :id', { id });
    if (!existing) return fail(res, 404, 'Item not found');

    const { errors, value } = parseItemForm(req.body || {}, { creating: false, existing });
    if (errors.length) return fail(res, 400, errors.join('. '));
    const refError = await checkReferences(value);
    if (refError) return fail(res, 400, refError);

    const taxonomyChanged = value.taxonomyNodeId !== existing.taxonomy_node_id;
    const classificationBasis = value.taxonomyNodeId
      ? taxonomyChanged
        ? 'manual'
        : existing.classification_basis || 'manual'
      : null;
    const quality = qualityScore({
      name: value.name,
      brand: value.brandKey,
      quantity: value.netQuantity,
      category: value.taxonomyNodeId,
      gtin: existing.gtin,
      image: value.imageUrl,
      diet: Boolean(existing.attributes && existing.attributes.diet),
    });
    const row = {
      id,
      kind: value.kind,
      name: value.name,
      name_key: value.nameKey,
      brand_key: value.brandKey,
      net_quantity: value.netQuantity,
      unit: value.unit,
      quantity_text: value.quantityText,
      taxonomy_node_id: value.taxonomyNodeId,
      classification_basis: classificationBasis,
      hsn_code: value.hsnCode,
      country_of_origin: value.countryOfOrigin,
      manufacturer: value.manufacturer,
      image_url: value.imageUrl,
      status: value.status,
      quality_score: quality,
    };

    const updated = await sequelize.transaction(async (transaction) => {
      await ensureBrand(value, transaction);
      const result = await select(
        `UPDATE catalog.items SET
           kind = :kind, name = :name, name_key = :name_key, brand_key = :brand_key,
           net_quantity = :net_quantity, unit = :unit, quantity_text = :quantity_text,
           taxonomy_node_id = :taxonomy_node_id, classification_basis = :classification_basis,
           hsn_code = :hsn_code, country_of_origin = :country_of_origin, manufacturer = :manufacturer,
           image_url = :image_url, status = :status, quality_score = :quality_score,
           content_hash = :content_hash, updated_at = now()
         WHERE id = :id
         RETURNING id`,
        { ...row, content_hash: contentHash(row) },
        { transaction }
      );
      if (value.subCategoryIds !== null && result.length) {
        await syncSubCategoryLinks(id, value.subCategoryIds, transaction);
      }
      return result;
    });
    if (!updated.length) return fail(res, 404, 'Item not found');

    const [data] = await enrichedByIds([id]);
    return res.json({ success: true, message: 'Item saved', data });
  })
);

/** Soft remove / restore: the row stays so provenance and dedupe keys are kept. */
const setActive = (isActive, message) =>
  handle(isActive ? 'restore item' : 'remove item', async (req, res) => {
    const { id } = req.params;
    if (!ITEM_ID_PATTERN.test(id)) return fail(res, 404, 'Item not found');
    const updated = await select(
      'UPDATE catalog.items SET is_active = :is_active, updated_at = now() WHERE id = :id RETURNING id',
      { id, is_active: isActive }
    );
    if (!updated.length) return fail(res, 404, 'Item not found');
    const [data] = await enrichedByIds([id]);
    return res.json({ success: true, message, data });
  });

router.delete('/items/:id', setActive(false, 'Item removed. It is hidden from merchants and can be restored.'));
router.post('/items/:id/restore', setActive(true, 'Item restored'));

// ---------------------------------------------------------------------------------------
// Lookups for the item form: categories, brands and HSN codes (search as you type)
// ---------------------------------------------------------------------------------------
const likeContains = (text) => `%${escapeLike(text)}%`;

router.get(
  '/taxonomy',
  handle('taxonomy', async (req, res) => {
    const search = textParam(req.query.search, 100);
    const where = ['is_active'];
    const replacements = { limit: 30 };
    if (search) {
      replacements.like = likeContains(search);
      where.push('(full_path ILIKE :like OR name ILIKE :like)');
    }
    const data = await select(
      `SELECT id, name, full_path FROM catalog.taxonomy_nodes
        WHERE ${where.join(' AND ')} ORDER BY full_path LIMIT :limit`,
      replacements
    );
    res.json({ success: true, data });
  })
);

router.get(
  '/brands',
  handle('brands', async (req, res) => {
    const search = textParam(req.query.search, 100);
    const replacements = { limit: 20, like: likeContains(search || '') };
    const data = await select(
      `SELECT brand_key, name FROM catalog.brands
        WHERE is_active AND name ILIKE :like ORDER BY name LIMIT :limit`,
      replacements
    );
    res.json({ success: true, data });
  })
);

router.get(
  '/hsn',
  handle('hsn', async (req, res) => {
    const search = textParam(req.query.search, 100);
    const replacements = { limit: 30 };
    let filter = '';
    if (/^\d+$/.test(search)) {
      replacements.prefix = `${escapeLike(search)}%`;
      filter = 'AND code LIKE :prefix';
    } else if (search) {
      replacements.like = likeContains(search);
      filter = 'AND description ILIKE :like';
    }
    const data = await select(
      `SELECT code, description, type FROM catalog.hsn_codes
        WHERE is_active ${filter} ORDER BY code LIMIT :limit`,
      replacements
    );
    res.json({ success: true, data });
  })
);

module.exports = router;
