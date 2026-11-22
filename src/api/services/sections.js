/**
 * Storefront sections (shop_sections): one auto section per shop sub-category plus the
 * owner's manual ones. A listing sits in at most one section (shop_listings.section_id).
 *
 * Pure helpers (name keys, the auto-section planner, display-name choice) are exported for
 * unit tests. The database helpers take an optional { transaction }.
 */
const { QueryTypes } = require('sequelize');

// Loaded on first use, so the pure helpers can be unit-tested without the models
const db = () => require('../models').sequelize;

const MAX_SECTION_NAME = 60;
/** Manual sections a shop may have (auto sections follow the sub-category cap). */
const MAX_MANUAL_SECTIONS = 50;

/** lower(trim(collapse-spaces(name))): the case-insensitive identity of a section name. */
const sectionNameKey = (name) =>
  String(name === undefined || name === null ? '' : name)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** Shorter alias used by the spec. */
const nameKey = sectionNameKey;

/** Display form of a name: spaces collapsed and trimmed. */
const cleanName = (name) =>
  String(name === undefined || name === null ? '' : name)
    .replace(/\s+/g, ' ')
    .trim();

/** { name } or { code: 'name_required' | 'name_too_long', error } for an owner-typed name. */
function checkSectionName(raw) {
  const name = cleanName(raw);
  if (!name) return { code: 'name_required', error: 'Enter a section name' };
  if (name.length > MAX_SECTION_NAME) {
    return { code: 'name_too_long', error: `A section name can be at most ${MAX_SECTION_NAME} characters` };
  }
  return { name };
}

/** A name cut to the column width (used for sub-category names and CSV text). */
const fitName = (raw) => cleanName(raw).slice(0, MAX_SECTION_NAME).trim();

/** The most common spelling among `spellings` (ties: the first seen). */
function pickDisplayName(spellings) {
  const counts = new Map();
  for (const s of spellings || []) {
    const name = cleanName(s);
    if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  let best = null;
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

/**
 * What ensureAutoSections must change.
 *   shopSubs  [{ id, name }] the shop's sub-categories, in position order
 *   sections  [{ id, name, name_key, sub_category_id, is_auto, sort_order }]
 * Returns {
 *   inserts: [{ sub_category_id, name, name_key, sort_order }],   new auto sections (appended)
 *   adopts:  [{ id, sub_category_id }],   existing sections that become the auto section
 *   demotes: [id],                        auto sections whose sub-category left the shop
 * }
 * A sub-category's former auto section (same sub_category_id) is adopted first, then a
 * manual section with the same name; otherwise a new one is appended.
 */
function planAutoSections(shopSubs, sections) {
  const subs = (shopSubs || []).filter((s) => s && Number.isInteger(Number(s.id)));
  const list = (sections || []).map((s) => ({ ...s, name_key: s.name_key || sectionNameKey(s.name) }));
  const subIds = new Set(subs.map((s) => Number(s.id)));
  const inserts = [];
  const adopts = [];
  const demotes = [];

  for (const section of list) {
    if (section.is_auto && (section.sub_category_id === null || !subIds.has(Number(section.sub_category_id)))) {
      demotes.push(section.id);
      section.is_auto = false;
    }
  }

  const taken = new Set(list.map((s) => s.name_key));
  let nextOrder = list.reduce((max, s) => Math.max(max, Number(s.sort_order) || 0), -1) + 1;
  const adopted = new Set();

  for (const sub of subs) {
    const subId = Number(sub.id);
    if (list.some((s) => s.is_auto && Number(s.sub_category_id) === subId)) continue;
    const name = fitName(sub.name) || `Section ${subId}`;
    const key = sectionNameKey(name);
    const former = list.find(
      (s) => !s.is_auto && !adopted.has(s.id) && Number(s.sub_category_id) === subId
    );
    const sameName = list.find((s) => !s.is_auto && !adopted.has(s.id) && s.name_key === key);
    const adopt = former || sameName;
    if (adopt) {
      adopts.push({ id: adopt.id, sub_category_id: subId });
      adopted.add(adopt.id);
      adopt.is_auto = true;
      adopt.sub_category_id = subId;
      continue;
    }
    // The name belongs to another sub-category's auto section: make it unique
    let finalName = name;
    let finalKey = key;
    for (let n = 2; taken.has(finalKey); n += 1) {
      const suffix = ` (${n})`;
      finalName = `${name.slice(0, MAX_SECTION_NAME - suffix.length).trim()}${suffix}`;
      finalKey = sectionNameKey(finalName);
    }
    taken.add(finalKey);
    inserts.push({ sub_category_id: subId, name: finalName, name_key: finalKey, sort_order: nextOrder });
    nextOrder += 1;
  }

  return { inserts, adopts, demotes: demotes.filter((id) => !adopted.has(id)) };
}

// ─── Database ───────────────────────────────────────────────────────────────────────

const select = (sql, replacements, transaction) =>
  db().query(sql, { replacements, transaction, type: QueryTypes.SELECT });
const exec = (sql, replacements, transaction) => db().query(sql, { replacements, transaction });

/** The shop's sub-categories in position order (the primary column alone for shops without links). */
async function shopSubCategoryRows(shopId, { transaction } = {}) {
  const rows = await select(
    `SELECT s.id, s.name, ssc.position
       FROM shop_sub_categories ssc JOIN sub_categories s ON s.id = ssc.sub_category_id
      WHERE ssc.shop_id = :shopId
      ORDER BY ssc.position, ssc.id`,
    { shopId },
    transaction
  );
  if (rows.length) return rows;
  return select(
    `SELECT s.id, s.name, 0 AS position
       FROM shops sh JOIN sub_categories s ON s.id = sh.sub_category_id
      WHERE sh.id = :shopId`,
    { shopId },
    transaction
  );
}

/**
 * Create the missing auto section of each shop sub-category, adopt matching sections and
 * demote the auto sections of sub-categories the shop no longer has. Safe to call often and
 * concurrently (inserts use ON CONFLICT DO NOTHING).
 */
async function ensureAutoSections(shopId, { transaction } = {}) {
  const subs = await shopSubCategoryRows(shopId, { transaction });
  const sections = await select(
    `SELECT id, name, name_key, sub_category_id, is_auto, sort_order
       FROM shop_sections WHERE shop_id = :shopId ORDER BY sort_order, id`,
    { shopId },
    transaction
  );
  const plan = planAutoSections(subs, sections);
  if (!plan.inserts.length && !plan.adopts.length && !plan.demotes.length) return plan;

  if (plan.demotes.length) {
    await exec(
      `UPDATE shop_sections SET is_auto = false, updated_at = now() WHERE shop_id = :shopId AND id IN (:ids)`,
      { shopId, ids: plan.demotes },
      transaction
    );
  }
  for (const adopt of plan.adopts) {
    // Another request may have created the auto section meanwhile: the partial unique index
    // then refuses the adopt, which is fine (the guard keeps it a no-op)
    await exec(
      `UPDATE shop_sections SET is_auto = true, sub_category_id = :subId, updated_at = now()
        WHERE id = :id AND shop_id = :shopId
          AND NOT EXISTS (SELECT 1 FROM shop_sections a
                           WHERE a.shop_id = :shopId AND a.is_auto AND a.sub_category_id = :subId)`,
      { id: adopt.id, subId: adopt.sub_category_id, shopId },
      transaction
    );
  }
  for (const row of plan.inserts) {
    await exec(
      `INSERT INTO shop_sections (shop_id, name, name_key, sub_category_id, sort_order, is_auto, is_hidden, created_at, updated_at)
       VALUES (:shopId, :name, :nameKey, :subId, :sortOrder, true, false, now(), now())
       ON CONFLICT DO NOTHING`,
      { shopId, name: row.name, nameKey: row.name_key, subId: row.sub_category_id, sortOrder: row.sort_order },
      transaction
    );
  }
  return plan;
}

/** Sections of a shop with their listing counts, in sort order (the Section object). */
async function listSections(shopId, { transaction, publicOnly = false } = {}) {
  const rows = await select(
    `SELECT s.id, s.shop_id, s.name, s.sub_category_id, sc.name AS sub_category_name, s.sort_order,
            s.is_auto, s.is_hidden,
            COALESCE(c.n, 0)::int AS count, COALESCE(c.in_stock, 0)::int AS in_stock_count
       FROM shop_sections s
       LEFT JOIN sub_categories sc ON sc.id = s.sub_category_id
       LEFT JOIN (SELECT l.section_id, count(*) AS n, count(*) FILTER (WHERE l.is_available) AS in_stock
                    FROM shop_listings l WHERE l.shop_id = :shopId AND l.section_id IS NOT NULL
                   GROUP BY l.section_id) c ON c.section_id = s.id
      WHERE s.shop_id = :shopId
      ORDER BY s.sort_order, s.id`,
    { shopId },
    transaction
  );
  return publicOnly ? rows.filter((s) => !s.is_hidden && s.count > 0) : rows;
}

/** The Section object as the API returns it. */
const serializeSection = (row) => ({
  id: row.id,
  shop_id: row.shop_id,
  name: row.name,
  sub_category_id: row.sub_category_id ?? null,
  sub_category_name: row.sub_category_name ?? null,
  sort_order: row.sort_order,
  is_auto: Boolean(row.is_auto),
  is_hidden: Boolean(row.is_hidden),
  count: Number(row.count) || 0,
});

/**
 * Per-request section lookups for one shop: validate an id, find a sub-category's auto
 * section, or resolve CSV text to a section (creating a manual one when missing, up to
 * MAX_MANUAL_SECTIONS). Loads the shop's sections once (after ensureAutoSections).
 */
async function createSectionResolver(shopId, { transaction } = {}) {
  await ensureAutoSections(shopId, { transaction });
  const rows = await select(
    'SELECT id, name, name_key, sub_category_id, is_auto, sort_order FROM shop_sections WHERE shop_id = :shopId',
    { shopId },
    transaction
  );
  const byId = new Map(rows.map((r) => [Number(r.id), r]));
  const byKey = new Map(rows.map((r) => [r.name_key, r]));
  let manualCount = rows.filter((r) => !r.is_auto).length;
  let maxOrder = rows.reduce((m, r) => Math.max(m, Number(r.sort_order) || 0), -1);

  const autoFor = (subId) => {
    if (subId === null || subId === undefined) return null;
    const row = rows.find((r) => r.is_auto && Number(r.sub_category_id) === Number(subId));
    return row ? Number(row.id) : null;
  };

  return {
    /** Does this id belong to the shop? */
    has: (id) => byId.has(Number(id)),
    /** The auto section id of a sub-category, or null. */
    autoFor,
    /**
     * section_id for a listing: the requested id (must be the shop's), else the auto section
     * of its sub-category. Returns { section_id } or { code: 'section_not_in_shop', error }.
     */
    forListing(requested, subId) {
      if (requested === undefined || requested === null || requested === '') return { section_id: autoFor(subId) };
      const id = Number.parseInt(requested, 10);
      if (!Number.isInteger(id) || String(id) !== String(requested).trim() || !byId.has(id)) {
        return { code: 'section_not_in_shop', error: 'That section does not belong to this shop' };
      }
      return { section_id: id };
    },
    /**
     * A section by its typed name (CSV). Missing names become manual sections; past the cap
     * the auto section is used and a warning is returned. Returns { section_id, warning? }.
     */
    async byName(rawName, subId) {
      const name = fitName(rawName);
      if (!name) return { section_id: autoFor(subId) };
      const key = sectionNameKey(name);
      const found = byKey.get(key);
      if (found) return { section_id: Number(found.id) };
      if (manualCount >= MAX_MANUAL_SECTIONS) {
        return {
          section_id: autoFor(subId),
          warning: `Section "${name}" was not created: a shop can have at most ${MAX_MANUAL_SECTIONS} sections`,
        };
      }
      maxOrder += 1;
      await exec(
        `INSERT INTO shop_sections (shop_id, name, name_key, sort_order, is_auto, is_hidden, created_at, updated_at)
         VALUES (:shopId, :name, :key, :sortOrder, false, false, now(), now())
         ON CONFLICT DO NOTHING`,
        { shopId, name, key, sortOrder: maxOrder },
        transaction
      );
      const [row] = await select(
        'SELECT id, name, name_key, sub_category_id, is_auto, sort_order FROM shop_sections WHERE shop_id = :shopId AND name_key = :key',
        { shopId, key },
        transaction
      );
      if (!row) return { section_id: autoFor(subId) };
      rows.push(row);
      byId.set(Number(row.id), row);
      byKey.set(row.name_key, row);
      if (!row.is_auto) manualCount += 1;
      return { section_id: Number(row.id) };
    },
  };
}

module.exports = {
  MAX_SECTION_NAME,
  MAX_MANUAL_SECTIONS,
  sectionNameKey,
  nameKey,
  cleanName,
  checkSectionName,
  fitName,
  pickDisplayName,
  planAutoSections,
  shopSubCategoryRows,
  ensureAutoSections,
  listSections,
  serializeSection,
  createSectionResolver,
};
