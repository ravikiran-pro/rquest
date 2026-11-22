/**
 * A shop's sub-categories (shop_sub_categories): parsing the request, the per-shop cap,
 * validation against sub_categories, saving the ordered list, and the response fields.
 *
 * The first id is the primary sub-category: shops.sub_category_id and shops.category_id
 * always follow it, so code that still reads the single columns keeps working.
 */
const { Op, literal } = require('sequelize');
const { shops, sub_categories, shop_sub_categories } = require('../models');
const { ensureAutoSections } = require('./sections');

/** Platform default cap for a new shop (GET /shops/my_categories returns it as limits). */
const DEFAULT_MAX_SUB_CATEGORIES = 5;
/** Highest cap an admin may set. */
const MAX_SUB_CATEGORIES_LIMIT = 20;

const toPositiveInt = (value) => {
  if (typeof value === 'number') return Number.isInteger(value) && value > 0 ? value : null;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const n = Number.parseInt(value, 10);
    return n > 0 ? n : null;
  }
  return null;
};

/**
 * Reads sub_category_ids (preferred) or the older single sub_category_id from a request body.
 * Returns { provided: false } when neither key is present (leave the shop's links alone),
 * else { provided: true, ids } with ids in the order sent ([] clears them), or { error }.
 */
function parseSubCategoryIds(body = {}) {
  if (body.sub_category_ids !== undefined) {
    if (body.sub_category_ids === null) return { provided: true, ids: [] };
    if (!Array.isArray(body.sub_category_ids)) {
      return { error: 'sub_category_ids must be a list of sub-category ids' };
    }
    const ids = body.sub_category_ids.map(toPositiveInt);
    if (ids.some((id) => id === null)) return { error: 'Invalid sub-category id in sub_category_ids' };
    if (new Set(ids).size !== ids.length) return { error: 'A sub-category can only be chosen once' };
    return { provided: true, ids };
  }
  if (body.sub_category_id !== undefined) {
    if (body.sub_category_id === null || body.sub_category_id === '') return { provided: true, ids: [] };
    const id = toPositiveInt(body.sub_category_id);
    if (id === null) return { error: 'Invalid category or sub-category' };
    return { provided: true, ids: [id] };
  }
  return { provided: false };
}

/** The cap for a shop (existing shops keep theirs; new shops get the platform default). */
const capFor = (shop) =>
  shop && Number.isInteger(shop.max_sub_categories) ? shop.max_sub_categories : DEFAULT_MAX_SUB_CATEGORIES;

/** Error message for ids beyond the cap, or null. */
function capError(ids, max) {
  if (ids.length <= max) return null;
  return `This shop can have at most ${max} sub-categories (${ids.length} chosen)`;
}

/**
 * Every id must be an existing sub-category. Inactive ones are refused unless `allowInactive`
 * (platform admins may keep an inactive sub-category on a shop).
 * Returns { error } or { rows } with the sub-category rows in the order of `ids`.
 */
async function loadSubCategories(ids, { allowInactive = false, transaction } = {}) {
  if (!ids.length) return { rows: [] };
  const found = await sub_categories.findAll({
    where: { id: ids },
    attributes: ['id', 'category_id', 'is_active'],
    transaction,
  });
  const byId = new Map(found.map((s) => [s.id, s]));
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length) return { error: 'Sub-category not found' };
  const inactive = ids.filter((id) => !byId.get(id).is_active);
  if (inactive.length && !allowInactive) return { error: 'Sub-category not found' };
  return { rows: ids.map((id) => byId.get(id)) };
}

/**
 * Replace a shop's sub-category list (ordered) and its primary columns, in the caller's
 * transaction. ids must already be validated. Empty ids clear the list and the primary.
 * Then each sub-category gets its auto storefront section, and the auto sections of removed
 * sub-categories become manual ones (their listings stay visible).
 */
async function saveShopSubCategories(shopId, ids, { transaction, categoryId } = {}) {
  await shop_sub_categories.destroy({ where: { shop_id: shopId }, transaction });
  if (ids.length) {
    await shop_sub_categories.bulkCreate(
      ids.map((sub_category_id, position) => ({ shop_id: shopId, sub_category_id, position })),
      { transaction }
    );
  }
  await shops.update(
    {
      sub_category_id: ids.length ? ids[0] : null,
      ...(categoryId !== undefined ? { category_id: categoryId } : {}),
    },
    { where: { id: shopId }, transaction }
  );
  await ensureAutoSections(shopId, { transaction });
}

/** The shop's sub-categories for API responses: [{ id, key, name, listing_type, position }]. */
async function subCategoriesForShop(shop, { transaction } = {}) {
  const links = await shop_sub_categories.findAll({
    where: { shop_id: shop.id },
    attributes: ['sub_category_id', 'position'],
    order: [
      ['position', 'ASC'],
      ['id', 'ASC'],
    ],
    raw: true,
    transaction,
  });
  const ordered = links.length
    ? links.map((l) => ({ id: l.sub_category_id, position: l.position }))
    : shop.sub_category_id
      ? [{ id: shop.sub_category_id, position: 0 }]
      : [];
  if (!ordered.length) return [];
  const rows = await sub_categories.findAll({
    where: { id: ordered.map((o) => o.id) },
    attributes: ['id', 'key', 'name', 'listing_type'],
    raw: true,
    transaction,
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ordered
    .filter((o) => byId.has(o.id))
    .map((o) => ({ ...byId.get(o.id), position: o.position }));
}

/** Ordered sub-category ids for a set of shop ids: Map<shopId, number[]>. */
async function subCategoryIdsByShop(shopIds, { transaction } = {}) {
  const map = new Map(shopIds.map((id) => [String(id), []]));
  if (!shopIds.length) return map;
  const links = await shop_sub_categories.findAll({
    where: { shop_id: shopIds },
    attributes: ['shop_id', 'sub_category_id', 'position'],
    order: [
      ['position', 'ASC'],
      ['id', 'ASC'],
    ],
    raw: true,
    transaction,
  });
  for (const link of links) map.get(String(link.shop_id))?.push(link.sub_category_id);
  return map;
}

/**
 * Plain JSON for one or many shop records, with sub_category_ids (primary first) and
 * max_sub_categories added. Accepts model instances or plain objects.
 */
async function serializeShops(input) {
  const list = Array.isArray(input) ? input : [input];
  const plain = list.map((s) => (s && typeof s.get === 'function' ? s.get({ plain: true }) : { ...s }));
  const idsByShop = await subCategoryIdsByShop(plain.map((s) => s.id));
  const allIds = [...new Set([...idsByShop.values()].flat().concat(plain.map((s) => s.sub_category_id).filter(Boolean)))];
  const names = new Map();
  if (allIds.length) {
    const rows = await sub_categories.findAll({ where: { id: allIds }, attributes: ['id', 'name'], raw: true });
    rows.forEach((r) => names.set(String(r.id), r.name));
  }
  for (const shop of plain) {
    const linked = idsByShop.get(String(shop.id)) || [];
    // A shop saved before the links existed still reports its primary sub-category
    shop.sub_category_ids = linked.length ? linked : shop.sub_category_id ? [shop.sub_category_id] : [];
    // Names in the same order, for storefront chips
    shop.shopSubCategories = shop.sub_category_ids
      .map((id) => ({ id, name: names.get(String(id)) }))
      .filter((s) => s.name);
    shop.max_sub_categories = capFor(shop);
  }
  return Array.isArray(input) ? plain : plain[0];
}

/**
 * Shops whose sub-categories include `subCategoryId`: their primary column or any link.
 * Returns a Sequelize where-clause fragment (the id is a validated integer).
 */
function subCategoryFilter(subCategoryId) {
  const id = Number.parseInt(subCategoryId, 10);
  return {
    [Op.or]: [
      { sub_category_id: id },
      { id: { [Op.in]: literal(`(SELECT shop_id FROM shop_sub_categories WHERE sub_category_id = ${id})`) } },
    ],
  };
}

module.exports = {
  DEFAULT_MAX_SUB_CATEGORIES,
  MAX_SUB_CATEGORIES_LIMIT,
  parseSubCategoryIds,
  capFor,
  capError,
  loadSubCategories,
  saveShopSubCategories,
  subCategoriesForShop,
  subCategoryIdsByShop,
  serializeShops,
  subCategoryFilter,
};
