/**
 * A shop's sub-categories, primary first (the server orders sub_category_ids that way).
 * Uses the full shopSubCategories list when the server sends it; otherwise the single
 * primary sub-category the shop record always carries.
 */
export const shopSubCategories = (shop) => {
  if (!shop) return [];
  const all = Array.isArray(shop.shopSubCategories) ? shop.shopSubCategories.filter((s) => s && s.name) : [];
  if (all.length > 0) {
    const ids = Array.isArray(shop.sub_category_ids) ? shop.sub_category_ids : [];
    if (ids.length === 0) return all;
    const byId = new Map(all.map((s) => [String(s.id), s]));
    const ordered = ids.map((id) => byId.get(String(id))).filter(Boolean);
    return ordered.length > 0 ? ordered : all;
  }
  return shop.shopSubCategory?.name ? [shop.shopSubCategory] : [];
};

/** Sub-category ids a shop is in, primary first. */
export const shopSubCategoryIds = (shop) => {
  if (Array.isArray(shop?.sub_category_ids) && shop.sub_category_ids.length > 0) {
    return shop.sub_category_ids.map(String);
  }
  return shopSubCategories(shop).map((s) => String(s.id));
};
/**
 * The sub-category ids a shop sells in. `sub_category_ids` is the full list for
 * multi-category shops; the single `sub_category_id` is the fallback for older shop records.
 * Returns unique positive integers, in the shop's own order.
 */
export const getShopSubCategoryIds = (shop) => {
  const list =
    Array.isArray(shop?.sub_category_ids) && shop.sub_category_ids.length > 0
      ? shop.sub_category_ids
      : [shop?.sub_category_id ?? shop?.shopSubCategory?.id];
  const ids = [];
  for (const raw of list) {
    const id = Number(raw);
    if (Number.isInteger(id) && id > 0 && !ids.includes(id)) ids.push(id);
  }
  return ids;
};
