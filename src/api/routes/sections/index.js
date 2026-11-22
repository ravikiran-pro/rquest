/**
 * Storefront sections (/api/v1/sections). See services/sections.js.
 *
 *   GET    /shop/:shop_id     public   visible sections with items
 *   GET    /manage/:shop_id   owner    every section (auto sections ensured first)
 *   POST   /                  owner    { shop_id, name, sub_category_id? } → manual section, appended
 *   PUT    /reorder           owner    { shop_id, ids } (exactly the shop's section ids)
 *   PUT    /:id               owner    { name?, is_hidden? }
 *   DELETE /:id               owner    manual sections only; items go to their auto section
 *
 * Section: { id, shop_id, name, sub_category_id, sub_category_name, sort_order, is_auto,
 *            is_hidden, count }
 */
const express = require('express');
const { QueryTypes } = require('sequelize');
const { sequelize, shops, shop_sections } = require('../../models');
const { authMiddleware, isAdminReq } = require('../../auth');
const {
  MAX_MANUAL_SECTIONS,
  sectionNameKey,
  checkSectionName,
  ensureAutoSections,
  listSections,
  serializeSection,
} = require('../../services/sections');
const { shopSubCategoryIds } = require('../../services/listingForm');

const router = express.Router();

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fail = (res, status, error, code, extra = {}) =>
  res.status(status).json({ success: false, error, ...(code ? { code } : {}), ...extra });

const toInt = (raw) => {
  if (typeof raw === 'number') return Number.isInteger(raw) ? raw : null;
  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) return Number(raw.trim());
  return null;
};

const findShop = (shopId) =>
  UUID_PATTERN.test(String(shopId || ''))
    ? shops.findByPk(shopId, { attributes: ['id', 'owner_id', 'sub_category_id'] })
    : Promise.resolve(null);

const canManageShop = (req, shop) =>
  Boolean(shop) && (isAdminReq(req) || (Boolean(shop.owner_id) && shop.owner_id === req.headers.user_id));

/** The shop if the caller manages it; otherwise sends 404 / 403 and returns null. */
async function ownedShop(req, res, shopId) {
  const shop = await findShop(shopId);
  if (!shop) {
    fail(res, 404, 'Shop not found');
    return null;
  }
  if (!canManageShop(req, shop)) {
    fail(res, 403, "Only the shop owner can manage this shop's sections");
    return null;
  }
  return shop;
}

/** The section (with its shop) if the caller manages that shop. */
async function ownedSection(req, res, rawId, { transaction } = {}) {
  const id = toInt(rawId);
  const section = id ? await shop_sections.findByPk(id, { transaction }) : null;
  if (!section) {
    fail(res, 404, 'Section not found');
    return null;
  }
  const shop = await findShop(section.shop_id);
  if (!canManageShop(req, shop)) {
    fail(res, 403, "Only the shop owner can manage this shop's sections");
    return null;
  }
  return section;
}

const sectionById = async (shopId, id) =>
  (await listSections(shopId)).find((s) => Number(s.id) === Number(id)) || null;

const isNameTaken = (err) =>
  Boolean(err) &&
  (err.name === 'SequelizeUniqueConstraintError' || err.original?.code === '23505') &&
  /name/.test(String(err.original?.constraint || err.parent?.constraint || err.message || ''));

const handle = (label, fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (res.headersSent) return;
    if (isNameTaken(err)) return fail(res, 409, 'A section with this name already exists', 'name_taken');
    console.error(`sections: ${label} failed:`, err);
    fail(res, 500, 'Internal Server Error');
  }
};

// Public: the sections a customer sees (not hidden, with at least one item)
router.get(
  '/shop/:shop_id',
  handle('public list', async (req, res) => {
    const shop = await findShop(req.params.shop_id);
    if (!shop) return fail(res, 404, 'Shop not found');
    try {
      await ensureAutoSections(shop.id);
    } catch (err) {
      console.warn('sections: could not ensure auto sections:', err.message);
    }
    const rows = await listSections(shop.id, { publicOnly: true });
    res.json({ success: true, data: rows.map(serializeSection) });
  })
);

router.use(authMiddleware);

router.get(
  '/manage/:shop_id',
  handle('manage list', async (req, res) => {
    const shop = await ownedShop(req, res, req.params.shop_id);
    if (!shop) return;
    await ensureAutoSections(shop.id);
    const rows = await listSections(shop.id);
    res.json({ success: true, data: rows.map(serializeSection) });
  })
);

router.post(
  '/',
  handle('create', async (req, res) => {
    const body = req.body || {};
    const shop = await ownedShop(req, res, body.shop_id);
    if (!shop) return;
    const checked = checkSectionName(body.name);
    if (checked.code) return fail(res, 400, checked.error, checked.code);

    let subCategoryId = null;
    if (body.sub_category_id !== undefined && body.sub_category_id !== null && body.sub_category_id !== '') {
      subCategoryId = toInt(body.sub_category_id);
      const own = await shopSubCategoryIds(shop);
      if (subCategoryId === null || !own.includes(subCategoryId)) {
        return fail(res, 400, "That sub-category is not one of your shop's", 'sub_category_not_in_shop');
      }
    }

    await ensureAutoSections(shop.id);
    const created = await sequelize.transaction(async (transaction) => {
      // Serialise section creation per shop so the cap and sort order hold
      await sequelize.query('SELECT id FROM shops WHERE id = :id FOR UPDATE', {
        replacements: { id: shop.id },
        transaction,
      });
      const manual = await shop_sections.count({ where: { shop_id: shop.id, is_auto: false }, transaction });
      if (manual >= MAX_MANUAL_SECTIONS) return { limit: true };
      const key = sectionNameKey(checked.name);
      if (await shop_sections.findOne({ where: { shop_id: shop.id, name_key: key }, attributes: ['id'], transaction })) {
        return { taken: true };
      }
      const [{ next }] = await sequelize.query(
        'SELECT COALESCE(max(sort_order), -1) + 1 AS next FROM shop_sections WHERE shop_id = :id',
        { replacements: { id: shop.id }, type: QueryTypes.SELECT, transaction }
      );
      return shop_sections.create(
        {
          shop_id: shop.id,
          name: checked.name,
          name_key: key,
          sub_category_id: subCategoryId,
          sort_order: Number(next) || 0,
          is_auto: false,
          is_hidden: false,
        },
        { transaction }
      );
    });
    if (created.limit) {
      return fail(res, 400, `A shop can have at most ${MAX_MANUAL_SECTIONS} sections`, 'section_limit');
    }
    if (created.taken) return fail(res, 409, 'A section with this name already exists', 'name_taken');
    res.status(201).json({ success: true, data: serializeSection(await sectionById(shop.id, created.id)) });
  })
);

// Declared before PUT /:id so "reorder" is not read as an id
router.put(
  '/reorder',
  handle('reorder', async (req, res) => {
    const body = req.body || {};
    const shop = await ownedShop(req, res, body.shop_id);
    if (!shop) return;
    const ids = Array.isArray(body.ids) ? body.ids.map(toInt) : null;
    const existing = await shop_sections.findAll({ where: { shop_id: shop.id }, attributes: ['id'], raw: true });
    const own = new Set(existing.map((s) => Number(s.id)));
    const valid =
      ids &&
      ids.every((id) => id !== null && own.has(id)) &&
      new Set(ids).size === ids.length &&
      ids.length === own.size;
    if (!valid) {
      return fail(res, 400, "ids must list each of the shop's sections exactly once", 'ids_mismatch');
    }
    await sequelize.transaction(async (transaction) => {
      for (const [position, id] of ids.entries()) {
        await shop_sections.update({ sort_order: position }, { where: { id, shop_id: shop.id }, transaction });
      }
    });
    const rows = await listSections(shop.id);
    res.json({ success: true, data: rows.map(serializeSection) });
  })
);

router.put(
  '/:id',
  handle('update', async (req, res) => {
    const section = await ownedSection(req, res, req.params.id);
    if (!section) return;
    const body = req.body || {};
    const changes = {};
    if (body.name !== undefined) {
      const checked = checkSectionName(body.name);
      if (checked.code) return fail(res, 400, checked.error, checked.code);
      const key = sectionNameKey(checked.name);
      if (key !== section.name_key) {
        const clash = await shop_sections.findOne({
          where: { shop_id: section.shop_id, name_key: key },
          attributes: ['id'],
        });
        if (clash) return fail(res, 409, 'A section with this name already exists', 'name_taken');
      }
      changes.name = checked.name;
      changes.name_key = key;
    }
    if (body.is_hidden !== undefined) {
      if (typeof body.is_hidden !== 'boolean') return fail(res, 400, 'is_hidden must be true or false', 'invalid');
      changes.is_hidden = body.is_hidden;
    }
    if (Object.keys(changes).length) await section.update(changes);
    res.json({ success: true, data: serializeSection(await sectionById(section.shop_id, section.id)) });
  })
);

router.delete(
  '/:id',
  handle('delete', async (req, res) => {
    const section = await ownedSection(req, res, req.params.id);
    if (!section) return;
    if (section.is_auto) {
      return fail(res, 400, "An automatic section can't be deleted while its sub-category is on the shop; hide it instead", 'auto_section');
    }
    const moved = await sequelize.transaction(async (transaction) => {
      // Each item goes to the auto section of its own sub-category (none → no section)
      const [, result] = await sequelize.query(
        `UPDATE shop_listings l
            SET section_id = (SELECT a.id FROM shop_sections a
                               WHERE a.shop_id = l.shop_id AND a.is_auto AND a.sub_category_id = l.sub_category_id
                               LIMIT 1),
                "updatedAt" = now()
          WHERE l.section_id = :id AND l.shop_id = :shopId`,
        { replacements: { id: section.id, shopId: section.shop_id }, transaction }
      );
      await section.destroy({ transaction });
      return result && typeof result.rowCount === 'number' ? result.rowCount : 0;
    });
    res.json({ success: true, moved });
  })
);

module.exports = router;
