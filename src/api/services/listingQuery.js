/**
 * The paged, filtered listing query shared by the owner list (GET /listings/manage/:shop_id),
 * the storefront (GET /listings/shop/:shop_id/storefront and its paged mode) and the legacy
 * unpaginated GET /listings/shop/:shop_id.
 *
 * parseListingQuery turns query-string params into checked values (pure). buildListingWhere
 * and listingOrder build parameterised SQL over `shop_listings l` (pure: they return SQL text
 * plus replacements; no user text is ever put into the SQL).
 */

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;
const MAX_OFFSET = 100000;
const MAX_Q = 100;

const PUBLIC_STOCK = ['in', 'out'];
const OWNER_STOCK = ['in', 'out', 'low', 'tracked', 'toggle', 'always'];
const SORTS = ['default', 'name', 'price_asc', 'price_desc', 'newest'];
// Any of these present switches GET /listings/shop/:shop_id from the legacy array to paging
const PAGING_PARAMS = ['limit', 'offset', 'q', 'section_id', 'sub_category_id', 'stock'];
const LISTING_TYPES = ['product', 'food', 'service', 'rental'];

const present = (v) => v !== undefined && v !== null;
const first = (v) => (Array.isArray(v) ? v[0] : v);
const isTrue = (v) => ['1', 'true', 'yes'].includes(String(first(v) ?? '').trim().toLowerCase());

/** Whole number from a query value; null when blank; NaN when invalid. */
const intValue = (raw) => {
  const v = first(raw);
  if (!present(v) || String(v).trim() === '') return null;
  const text = String(v).trim();
  if (!/^\d+$/.test(text)) return NaN;
  return Number(text);
};

/** True when none of the paging / filter params were sent (legacy unpaginated mode). */
const isLegacyQuery = (query = {}) => !PAGING_PARAMS.some((k) => present((query || {})[k]));

/**
 * Checked listing params.
 *   scope  'public' (storefront) or 'owner' (Manage Store)
 * Returns { params } or { error, code: 'bad_param', key }.
 * params: { legacy, q, section_id (int | 'none' | null), sub_category_id, stock, sort, limit,
 *           offset, type, needs_details, include_hidden }
 */
function parseListingQuery(query = {}, { scope = 'public' } = {}) {
  const src = query || {};
  const bad = (key, error) => ({ error, code: 'bad_param', key });
  const owner = scope === 'owner';
  const params = {
    legacy: !owner && isLegacyQuery(src),
    q: null,
    section_id: null,
    sub_category_id: null,
    stock: null,
    sort: 'default',
    limit: DEFAULT_LIMIT,
    offset: 0,
    type: null,
    needs_details: false,
    include_hidden: false,
  };

  if (present(src.q)) {
    const q = String(first(src.q)).trim();
    if (q.length > MAX_Q) return bad('q', `Search text can be at most ${MAX_Q} characters`);
    params.q = q || null;
  }

  if (present(src.section_id) && String(first(src.section_id)).trim() !== '') {
    const raw = String(first(src.section_id)).trim().toLowerCase();
    if (raw === 'none') {
      params.section_id = 'none'; // listings without a section ("More items")
    } else {
      const id = intValue(raw);
      if (!Number.isInteger(id) || id < 1) return bad('section_id', 'section_id must be a section id');
      params.section_id = id;
    }
  }

  const sub = intValue(src.sub_category_id);
  if (Number.isNaN(sub) || sub === 0) return bad('sub_category_id', 'sub_category_id must be a sub-category id');
  params.sub_category_id = sub;

  if (present(src.stock) && String(first(src.stock)).trim() !== '') {
    const stock = String(first(src.stock)).trim().toLowerCase();
    if (!OWNER_STOCK.includes(stock)) return bad('stock', `stock must be one of ${(owner ? OWNER_STOCK : PUBLIC_STOCK).join(', ')}`);
    // Owner-only filters are ignored on public endpoints
    params.stock = owner || PUBLIC_STOCK.includes(stock) ? stock : null;
  }

  if (present(src.sort) && String(first(src.sort)).trim() !== '') {
    const sort = String(first(src.sort)).trim().toLowerCase();
    if (!SORTS.includes(sort)) return bad('sort', `sort must be one of ${SORTS.join(', ')}`);
    params.sort = sort;
  }

  const limit = intValue(src.limit);
  if (Number.isNaN(limit)) return bad('limit', 'limit must be a whole number');
  if (limit !== null) params.limit = Math.min(Math.max(limit, 1), MAX_LIMIT);

  const offset = intValue(src.offset);
  if (Number.isNaN(offset)) return bad('offset', 'offset must be a whole number');
  if (offset !== null) {
    if (offset > MAX_OFFSET) return bad('offset', `offset can be at most ${MAX_OFFSET}`);
    params.offset = offset;
  }

  if (present(src.type) && String(first(src.type)).trim() !== '' && String(first(src.type)).trim() !== 'all') {
    const type = String(first(src.type)).trim();
    if (!LISTING_TYPES.includes(type)) return bad('type', `type must be one of ${LISTING_TYPES.join(', ')}`);
    params.type = type;
  }

  if (owner) {
    params.needs_details = isTrue(src.needs_details);
    params.include_hidden = present(src.include_hidden) ? isTrue(src.include_hidden) : true;
  }
  return { params };
}

const escapeLike = (text) => String(text).replace(/[\\%_]/g, (c) => `\\${c}`);

// Shared SQL fragments over `l` (shop_listings)
const HIDDEN_SECTION_SQL =
  'EXISTS (SELECT 1 FROM shop_sections hs WHERE hs.id = l.section_id AND hs.is_hidden)';
// Simple listings: the listing's count. Variant listings (whose stock_qty is the sum of their
// variants): still in stock, and some variant is at or under its alert level.
const LOW_SQL = `(l.stock_mode = 'tracked' AND l.stock_qty > 0 AND (
  (l.variant_axes = '[]'::jsonb AND l.stock_qty <= COALESCE(l.low_stock_threshold, 5))
  OR (l.variant_axes <> '[]'::jsonb AND EXISTS (SELECT 1 FROM listing_variants lv
        WHERE lv.listing_id = l.id AND lv.stock_qty <= COALESCE(lv.low_stock_threshold, l.low_stock_threshold, 5)))))`;
const OUT_SQL = "(NOT COALESCE(l.is_available, true) OR (l.stock_mode = 'tracked' AND COALESCE(l.stock_qty, 0) <= 0))";

/**
 * WHERE clause (without the keyword) and replacements for the params.
 *   shopId         the shop (always filtered)
 *   scope          'public' hides listings in hidden sections; 'owner' does so only when
 *                  include_hidden is false
 *   needsDetails   optional { sql, replacements } (see needsDetailsCondition) used when
 *                  params.needs_details is set
 */
function buildListingWhere(params, { shopId, scope = 'public', needsDetails = null } = {}) {
  const replacements = { shop_id: shopId };
  const where = ['l.shop_id = :shop_id'];
  const p = params || {};

  if (scope !== 'owner' || p.include_hidden === false) where.push(`(l.section_id IS NULL OR NOT ${HIDDEN_SECTION_SQL})`);

  if (p.q) {
    replacements.q_like = `%${escapeLike(p.q)}%`;
    where.push(
      "(l.name ILIKE :q_like OR COALESCE(l.description, '') ILIKE :q_like OR COALESCE(l.metadata->>'brand', '') ILIKE :q_like" +
        " OR (l.variant_axes <> '[]'::jsonb AND EXISTS (SELECT 1 FROM listing_variants qv WHERE qv.listing_id = l.id" +
        ' AND (qv.sku ILIKE :q_like OR EXISTS (SELECT 1 FROM jsonb_each_text(qv.option_values) ov WHERE ov.value ILIKE :q_like)))))'
    );
  }
  if (p.section_id === 'none') where.push('l.section_id IS NULL');
  else if (Number.isInteger(p.section_id)) {
    replacements.section_id = p.section_id;
    where.push('l.section_id = :section_id');
  }
  if (Number.isInteger(p.sub_category_id)) {
    replacements.sub_category_id = p.sub_category_id;
    where.push('l.sub_category_id = :sub_category_id');
  }
  if (p.type) {
    replacements.listing_type = p.type;
    where.push('l.listing_type = :listing_type');
  }
  switch (p.stock) {
    case 'in':
      where.push(`NOT ${OUT_SQL}`);
      break;
    case 'out':
      where.push(OUT_SQL);
      break;
    case 'low':
      where.push(LOW_SQL);
      break;
    case 'tracked':
    case 'toggle':
    case 'always':
      replacements.stock_mode = p.stock;
      where.push('l.stock_mode = :stock_mode');
      break;
    default:
      break;
  }
  if (p.needs_details && scope === 'owner') {
    if (needsDetails && needsDetails.sql) {
      Object.assign(replacements, needsDetails.replacements);
      where.push(`(${needsDetails.sql})`);
    } else {
      where.push('FALSE');
    }
  }
  return { sql: where.join(' AND '), replacements };
}

/** ORDER BY terms (without the keyword) for a sort. Default: in stock first, then name. */
function listingOrder(sort = 'default') {
  switch (sort) {
    case 'name':
      return 'l.name ASC, l.id ASC';
    case 'price_asc':
      return 'l.price ASC, l.name ASC, l.id ASC';
    case 'price_desc':
      return 'l.price DESC, l.name ASC, l.id ASC';
    case 'newest':
      return 'l."createdAt" DESC, l.id ASC';
    default:
      return 'l.is_available DESC, l.name ASC, l.id ASC';
  }
}

/**
 * SQL for "a required field of the listing's form is empty", given the required keys of each
 * form a shop's listings follow.
 *   requiredBySub  Map(sub_category_id | null → [key])  (null = listings without a sub-category)
 * Keys are passed as replacements. Returns { sql, replacements } ('FALSE' when nothing is required).
 */
function needsDetailsCondition(requiredBySub) {
  const replacements = {};
  const parts = [];
  let n = 0;
  for (const [subId, keys] of requiredBySub || []) {
    const list = (keys || []).filter((k) => typeof k === 'string' && k);
    if (!list.length) continue;
    const keyConds = list.map((key) => {
      const name = `nd_k${n++}`;
      replacements[name] = key;
      return `COALESCE(l.metadata->>:${name}, '') = ''`;
    });
    let subCond;
    if (subId === null || subId === undefined) subCond = 'l.sub_category_id IS NULL';
    else {
      const name = `nd_s${n++}`;
      replacements[name] = Number(subId);
      subCond = `l.sub_category_id = :${name}`;
    }
    parts.push(`(${subCond} AND (${keyConds.join(' OR ')}))`);
  }
  return { sql: parts.length ? parts.join(' OR ') : 'FALSE', replacements };
}

/** SQL for the owner summary counts over a WHERE clause on `l`. */
const SUMMARY_SELECT = `count(*)::int AS total,
  count(*) FILTER (WHERE NOT ${OUT_SQL})::int AS in_stock,
  count(*) FILTER (WHERE ${LOW_SQL})::int AS low,
  count(*) FILTER (WHERE ${OUT_SQL})::int AS out`;

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MAX_OFFSET,
  MAX_Q,
  PUBLIC_STOCK,
  OWNER_STOCK,
  SORTS,
  isLegacyQuery,
  parseListingQuery,
  buildListingWhere,
  listingOrder,
  needsDetailsCondition,
  SUMMARY_SELECT,
  LOW_SQL,
  OUT_SQL,
};
