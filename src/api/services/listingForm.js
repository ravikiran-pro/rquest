/**
 * Which form a listing follows and which listing type it defaults to.
 *
 * Sub-category of a listing: the shop_listings.sub_category_id column, else the legacy
 * metadata.sub_category_id, else the shop's primary sub-category.
 *
 * Form, most specific first (services/formOverrides.resolveListingSchema):
 *   1. the shop's override for that sub-category (shop_form_overrides), layered on the
 *      sub-category form (or the category form when the sub-category has none)
 *   2. the shop's own form (shops.form_schema, set by an admin for one shop)
 *   3. the sub-category form
 *   4. the category form (fallback for shops with only a category)
 */
const { categories, sub_categories, shop_form_overrides } = require('../models');
const { resolveListingSchema } = require('./formOverrides');
const attributeSets = require('./attributeSets');
const { subCategoryIdsByShop } = require('./shopSubCategories');

const toId = (value) => {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n >= 0 ? n : null;
};

/** The listing's sub-category id: column, then metadata, then the shop's primary. */
const subCategoryIdFor = (shop, metadata, columnId) =>
  toId(columnId) ?? toId(metadata?.sub_category_id) ?? toId(shop?.sub_category_id);
const categoryIdFor = (shop, metadata) => toId(metadata?.category_id) ?? toId(shop?.category_id);

const SUB_ATTRS = ['id', 'key', 'name', 'category_id', 'form_schema', 'listing_type', 'template_key'];

/**
 * { schema, base, schemaSource, subCategory, category, override, subCategoryId } for a
 * listing of `shop`.
 *   metadata               legacy source of the sub-category (metadata.sub_category_id)
 *   options.subCategoryId  the listing's sub_category_id column (wins over metadata)
 * `base` is the form an override is layered on; `override` is the shop_form_overrides row.
 */
const loadListingContext = async (shop, metadata, { subCategoryId, transaction } = {}) => {
  const subId = subCategoryIdFor(shop, metadata, subCategoryId);
  const subCategory =
    subId !== null ? await sub_categories.findByPk(subId, { attributes: SUB_ATTRS, transaction }) : null;
  const categoryId = subCategory ? subCategory.category_id : categoryIdFor(shop, metadata);
  const category =
    categoryId !== null
      ? await categories.findByPk(categoryId, { attributes: ['id', 'name', 'form_schema'], transaction })
      : null;
  const override =
    shop?.id && subCategory
      ? await shop_form_overrides.findOne({
          where: { shop_id: shop.id, sub_category_id: subCategory.id },
          transaction,
        })
      : null;
  const baseForm = Array.isArray(subCategory?.form_schema) && subCategory.form_schema.length
    ? subCategory.form_schema
    : category?.form_schema || [];
  // Researched attributes this store may switch on (not already in the base form)
  const available = subCategory
    ? attributeSets.enableableFields(subCategory.key, (baseForm || []).map((f) => f && f.key))
    : [];
  const { schema, base, source } = resolveListingSchema({
    override: override ? override.overrides : null,
    shopForm: shop?.form_schema,
    subForm: subCategory?.form_schema,
    categoryForm: category?.form_schema,
    available,
  });
  return {
    schema,
    base,
    available,
    schemaSource: source,
    subCategory,
    category,
    override,
    subCategoryId: subCategory ? subCategory.id : null,
  };
};

const loadListingSchema = async (shop, metadata, options) => (await loadListingContext(shop, metadata, options)).schema;

/**
 * Memoised loadListingContext for one shop, keyed by sub-category id (null = the shop's
 * fallback). For endpoints that resolve the form of many listings.
 */
const createContextLoader = (shop, { transaction } = {}) => {
  const cache = new Map();
  return (subCategoryId) => {
    const key = toId(subCategoryId);
    if (!cache.has(key)) {
      cache.set(key, loadListingContext(shop, {}, { subCategoryId: key ?? undefined, transaction }));
    }
    return cache.get(key);
  };
};

/** The shop's sub-category ids in position order (the primary alone for shops without links). */
const shopSubCategoryIds = async (shop, { transaction } = {}) => {
  const linked = (await subCategoryIdsByShop([shop.id], { transaction })).get(String(shop.id)) || [];
  if (linked.length) return linked;
  return toId(shop.sub_category_id) !== null ? [toId(shop.sub_category_id)] : [];
};

/**
 * The sub-category a listing write files under: `requested` (must be one of `ownIds`), else
 * `fallback`, else the first of ownIds. Returns { id } (null = the shop has none) or
 * { code: 'sub_category_not_in_shop', error }.
 */
const pickShopSubCategory = (requested, ownIds, fallback) => {
  if (requested === undefined || requested === null || requested === '') {
    const id = toId(fallback);
    if (id !== null && ownIds.includes(id)) return { id };
    return { id: ownIds.length ? ownIds[0] : null };
  }
  const id = toId(requested);
  if (id === null || String(id) !== String(requested).trim() || !ownIds.includes(id)) {
    return { code: 'sub_category_not_in_shop', error: "That sub-category is not one of your shop's" };
  }
  return { id };
};

/**
 * The sub-category's listing type; for shops without one, a guess from the shop type text
 * (the rule the app used before sub-categories carried a listing type).
 */
const listingTypeFor = (shop, subCategory) => {
  if (subCategory && subCategory.listing_type) return subCategory.listing_type;
  const typeStr = `${shop?.shop_type || ''} ${shop?.shopCategory?.name || ''}`.toLowerCase();
  if (['restaurant', 'food', 'bakery', 'cafe', 'biri'].some((w) => typeStr.includes(w))) return 'food';
  if (typeStr.includes('rental') || typeStr.includes('bike')) return 'rental';
  if (['electric', 'plumb', 'service', 'salon', 'spa'].some((w) => typeStr.includes(w))) return 'service';
  return 'product';
};

/** Fields the server records on every listing so search knows which form it follows. */
const categoryMetadata = (subCategory, category) => {
  if (subCategory) {
    return {
      category_id: subCategory.category_id,
      sub_category_id: subCategory.id,
      sub_category_name: subCategory.name,
    };
  }
  if (category) return { category_id: category.id };
  return {};
};

module.exports = {
  loadListingContext,
  loadListingSchema,
  createContextLoader,
  shopSubCategoryIds,
  pickShopSubCategory,
  listingTypeFor,
  categoryMetadata,
  subCategoryIdFor,
  categoryIdFor,
};
