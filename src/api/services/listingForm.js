/**
 * Which form a listing follows and which listing type it defaults to.
 *
 * Form, most specific first:
 *   1. the shop's own form (shops.form_schema, set by an admin for one shop)
 *   2. the listing's sub-category form: metadata.sub_category_id (multi-category shops),
 *      else the shop's sub-category
 *   3. the category form (fallback for shops with only a category)
 */
const { categories, sub_categories } = require('../models');
const { resolveSchema } = require('./formSchema');

const toId = (value) => {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n >= 0 ? n : null;
};

const subCategoryIdFor = (shop, metadata) => toId(metadata?.sub_category_id) ?? toId(shop?.sub_category_id);
const categoryIdFor = (shop, metadata) => toId(metadata?.category_id) ?? toId(shop?.category_id);

const SUB_ATTRS = ['id', 'key', 'name', 'category_id', 'form_schema', 'listing_type'];

/** { schema, subCategory, category } for a listing of `shop` with `metadata`. */
const loadListingContext = async (shop, metadata) => {
  const subId = subCategoryIdFor(shop, metadata);
  const subCategory = subId !== null ? await sub_categories.findByPk(subId, { attributes: SUB_ATTRS }) : null;
  const categoryId = subCategory ? subCategory.category_id : categoryIdFor(shop, metadata);
  const category =
    categoryId !== null ? await categories.findByPk(categoryId, { attributes: ['id', 'name', 'form_schema'] }) : null;
  return { schema: resolveSchema(shop, category, subCategory), subCategory, category };
};

const loadListingSchema = async (shop, metadata) => (await loadListingContext(shop, metadata)).schema;

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

/** Fields the server records on every listing so it knows which form it follows. */
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
  listingTypeFor,
  categoryMetadata,
  subCategoryIdFor,
  categoryIdFor,
};
