/**
 * Store listing forms (/api/v1/forms): each shop may adjust the form of each of its
 * sub-categories (shop_form_overrides; rules in services/formOverrides.js). Owner or admin.
 *
 *   GET    /shop/:shop_id                         every sub-category's base, override, resolved,
 *                                                 available (attributes it can enable), variant_axes
 *   GET    /shop/:shop_id/:sub_category_id/resolved
 *   PUT    /shop/:shop_id/:sub_category_id        { fields, custom_fields, enabled_attributes }
 *                                                 → save the override
 *   DELETE /shop/:shop_id/:sub_category_id        reset to the default form
 */
const express = require('express');
const { shops, categories, shop_form_overrides } = require('../../models');
const { authMiddleware, isAdminReq } = require('../../auth');
const { normalizeOverride, layerSchema } = require('../../services/formOverrides');
const attributeSets = require('../../services/attributeSets');
const { defaultStockMode } = require('../../services/stock');
const { loadListingContext, listingTypeFor } = require('../../services/listingForm');
const { subCategoriesForShop } = require('../../services/shopSubCategories');

const router = express.Router();
router.use(authMiddleware);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fail = (res, status, error, code, extra = {}) =>
  res.status(status).json({ success: false, error, ...(code ? { code } : {}), ...extra });

const handle = (label, fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (res.headersSent) return;
    console.error(`forms: ${label} failed:`, err);
    fail(res, 500, 'Internal Server Error');
  }
};

/** The shop if the caller manages it; otherwise sends 404 / 403 and returns null. */
async function ownedShop(req, res, shopId) {
  const shop = UUID_PATTERN.test(String(shopId || ''))
    ? await shops.findByPk(shopId, { include: [{ model: categories, as: 'shopCategory', attributes: ['name'] }] })
    : null;
  if (!shop) {
    fail(res, 404, 'Shop not found');
    return null;
  }
  const isOwner = Boolean(shop.owner_id) && shop.owner_id === req.headers.user_id;
  if (!isOwner && !isAdminReq(req)) {
    fail(res, 403, "Only the shop owner can change this shop's forms");
    return null;
  }
  return shop;
}

/** The shop and one of its sub-categories from the path, or null after sending the error. */
async function ownedShopSub(req, res) {
  const shop = await ownedShop(req, res, req.params.shop_id);
  if (!shop) return null;
  const subId = /^\d+$/.test(String(req.params.sub_category_id)) ? Number(req.params.sub_category_id) : null;
  const subs = await subCategoriesForShop(shop);
  const sub = subs.find((s) => s.id === subId);
  if (!sub) {
    fail(res, 400, "That sub-category is not one of your shop's", 'sub_category_not_in_shop');
    return null;
  }
  return { shop, sub };
}

/** Fields with the UI flags (an override's resolved schema already has them). */
const withFlags = (ctx) => (ctx.schemaSource === 'override' ? ctx.schema : layerSchema(ctx.schema, null));

const overrideDoc = (row) =>
  row
    ? {
        fields: row.overrides?.fields || {},
        custom_fields: row.overrides?.custom_fields || [],
        enabled_attributes: row.overrides?.enabled_attributes || [],
      }
    : null;

const hasShopForm = (shop) => Array.isArray(shop.form_schema) && shop.form_schema.length > 0;

router.get(
  '/shop/:shop_id',
  handle('list', async (req, res) => {
    const shop = await ownedShop(req, res, req.params.shop_id);
    if (!shop) return;
    const subs = await subCategoriesForShop(shop);
    const data = [];
    for (const sub of subs) {
      const ctx = await loadListingContext(shop, {}, { subCategoryId: sub.id });
      data.push({
        sub_category: { id: sub.id, key: sub.key, name: sub.name, listing_type: sub.listing_type },
        base: ctx.base,
        override: overrideDoc(ctx.override),
        resolved: withFlags(ctx),
        // Researched catalogue attributes the store can switch on (enabled_attributes)
        available: ctx.available,
        variant_axes: attributeSets.variantAxes(sub.key),
        legacy_shop_form: hasShopForm(shop),
      });
    }
    res.json({ success: true, data });
  })
);

router.get(
  '/shop/:shop_id/:sub_category_id/resolved',
  handle('resolved', async (req, res) => {
    const found = await ownedShopSub(req, res);
    if (!found) return;
    const ctx = await loadListingContext(found.shop, {}, { subCategoryId: found.sub.id });
    const listingType = listingTypeFor(found.shop, ctx.subCategory);
    res.json({
      success: true,
      data: {
        fields: withFlags(ctx),
        default_stock_mode: defaultStockMode({ listingType, templateKey: ctx.subCategory?.template_key }),
        listing_type: listingType,
      },
    });
  })
);

router.put(
  '/shop/:shop_id/:sub_category_id',
  handle('save', async (req, res) => {
    const found = await ownedShopSub(req, res);
    if (!found) return;
    const ctx = await loadListingContext(found.shop, {}, { subCategoryId: found.sub.id });
    const body = req.body || {};
    const { override, errors } = normalizeOverride(
      {
        fields: body.fields ?? {},
        custom_fields: body.custom_fields ?? [],
        enabled_attributes: body.enabled_attributes ?? [],
      },
      ctx.base,
      ctx.available
    );
    if (errors.length) {
      return fail(res, 400, errors.map((e) => e.message).join('. '), 'invalid', { errors });
    }
    const existing = ctx.override;
    if (existing) {
      await existing.update({
        overrides: override,
        version: (existing.version || 1) + 1,
        updated_by: req.headers.user_id || null,
      });
    } else {
      await shop_form_overrides.create({
        shop_id: found.shop.id,
        sub_category_id: found.sub.id,
        overrides: override,
        version: 1,
        updated_by: req.headers.user_id || null,
      });
    }
    res.json({ success: true, data: { override, resolved: layerSchema(ctx.base, override, ctx.available) } });
  })
);

router.delete(
  '/shop/:shop_id/:sub_category_id',
  handle('reset', async (req, res) => {
    const found = await ownedShopSub(req, res);
    if (!found) return;
    await shop_form_overrides.destroy({ where: { shop_id: found.shop.id, sub_category_id: found.sub.id } });
    const ctx = await loadListingContext(found.shop, {}, { subCategoryId: found.sub.id });
    res.json({ success: true, data: { resolved: withFlags(ctx) } });
  })
);

module.exports = router;
