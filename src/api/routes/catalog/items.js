/**
 * Reading catalog items: the columns the API returns, filters and the enrichment step.
 *
 * Lists pick a page of ids from catalog.items first (cheap, index-friendly) and only then
 * read those rows from catalog.items_enriched, whose effective HSN / GST rate is computed
 * per row at read time.
 */
const { select } = require('./db');
const { escapeLike, searchTokens, normalizeGtin } = require('./validate');

const ENRICHED_COLUMNS = [
  'id',
  'gtin',
  'kind',
  'name',
  'brand_key',
  'brand_name',
  'net_quantity',
  'unit',
  'quantity_text',
  'taxonomy_node_id',
  'category_path',
  'classification_basis',
  'hsn_code',
  'effective_hsn',
  'hsn_basis',
  'gst_rate',
  'gst_rate_verified',
  'country_of_origin',
  'manufacturer',
  'image_url',
  'attributes',
  'status',
  'quality_score',
  'primary_source',
  'is_active',
  'created_at',
  'updated_at',
];

const toNumber = (v) => (v === null || v === undefined ? null : Number(v));

/** pg returns numeric as strings; the API returns numbers. */
const shapeItem = (row) => ({
  ...row,
  net_quantity: toNumber(row.net_quantity),
  gst_rate: toNumber(row.gst_rate),
  quality_score: toNumber(row.quality_score),
});

/** Enriched rows for these ids, in the given order (plus the category node's own name). */
async function enrichedByIds(ids, options = {}) {
  if (!ids.length) return [];
  const rows = await select(
    `SELECT ${ENRICHED_COLUMNS.map((c) => `e.${c}`).join(', ')}, tn.name AS category_name
       FROM catalog.items_enriched e
       LEFT JOIN catalog.taxonomy_nodes tn ON tn.id = e.taxonomy_node_id
      WHERE e.id IN (:ids)`,
    { ids },
    options
  );
  const byId = new Map(rows.map((r) => [r.id, shapeItem(r)]));
  // Sub-categories each item is linked to (rule and manual links; excluded ones are hidden)
  const links = await select(
    `SELECT l.catalog_item_id, s.id, s.key, s.name, c.id AS category_id, c.name AS category_name
       FROM catalog_item_sub_categories l
       JOIN sub_categories s ON s.id = l.sub_category_id
       JOIN categories c ON c.id = s.category_id
      WHERE l.catalog_item_id IN (:ids) AND l.source <> 'excluded'
      ORDER BY c.sort_order, s.sort_order, s.id`,
    { ids },
    options
  );
  for (const link of links) {
    const row = byId.get(link.catalog_item_id);
    if (!row) continue;
    if (!row.sub_categories) row.sub_categories = [];
    row.sub_categories.push({
      id: link.id,
      key: link.key,
      name: link.name,
      category_id: link.category_id,
      category_name: link.category_name,
    });
  }
  byId.forEach((row) => {
    if (!row.sub_categories) row.sub_categories = [];
  });
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

/**
 * WHERE fragments for a text search over items `i` joined to brands `b`.
 * Every word must appear in the name, the brand or a local-language alias
 * (curated produce: "aloo" finds Potato); a barcode or an item id also matches directly.
 */
function searchConditions(text, replacements, { matchId = false } = {}) {
  // Set before the early return: searchOrder() refers to these even when no word survives.
  const raw = String(text).trim();
  replacements.q_exact = raw.toLowerCase();
  replacements.q_prefix = `${escapeLike(raw)}%`;
  const tokens = searchTokens(text);
  // Punctuation only (e.g. "-"): match nothing, rather than every active item
  if (!tokens.length) return 'FALSE';
  const wordConds = tokens.map((token, i) => {
    const key = `w${i}`;
    replacements[key] = `%${escapeLike(token)}%`;
    return `(i.name ILIKE :${key} OR b.name ILIKE :${key}
             OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(
                  CASE WHEN jsonb_typeof(i.attributes->'aliases') = 'array'
                       THEN i.attributes->'aliases' ELSE '[]'::jsonb END) AS al(alias)
                  WHERE al.alias ILIKE :${key}))`;
  });
  const alternatives = [`(${wordConds.join(' AND ')})`];

  const digits = raw.replace(/[\s-]/g, '');
  if (/^\d{8,14}$/.test(digits)) {
    const { gtin } = normalizeGtin(digits);
    if (gtin) {
      replacements.gtin = gtin;
      alternatives.push('i.gtin = :gtin');
    }
    replacements.gtin_part = `%${digits}%`;
    alternatives.push('i.gtin LIKE :gtin_part');
  }
  if (matchId) {
    replacements.id_exact = raw;
    alternatives.push('i.id = :id_exact');
    if (raw.includes(':')) {
      replacements.id_part = `%${escapeLike(raw)}%`;
      alternatives.push('i.id ILIKE :id_part');
    }
  }
  return `(${alternatives.join(' OR ')})`;
}

/** Relevance ORDER BY terms for a search (uses pg_trgm when it is installed). */
function searchOrder(trgmSchema) {
  const terms = ['(lower(i.name) = :q_exact) DESC', '(i.name ILIKE :q_prefix) DESC'];
  if (trgmSchema) terms.push(`${trgmSchema}.similarity(i.name, :q_exact) DESC`);
  return terms;
}

/**
 * Category filter. A node id ("ondc:RET10", "shop_type:grocery") matches that node, its
 * descendants and — for shop types — the categories the shop type is mapped to, plus
 * services offered by that shop type. Any other text matches the category path.
 */
function categoryCondition(category, replacements) {
  const value = String(category).trim();
  if (!value) return null;
  if (!value.includes(':')) {
    replacements.cat_path = `%${escapeLike(value)}%`;
    return `EXISTS (SELECT 1 FROM catalog.taxonomy_nodes cn
                     WHERE cn.id = i.taxonomy_node_id AND cn.full_path ILIKE :cat_path)`;
  }
  replacements.cat_id = value;
  replacements.cat_shop_type = value.startsWith('shop_type:') ? value.slice('shop_type:'.length) : null;
  // COALESCE: an item with no node and no shop_type would otherwise be NULL, which sorts
  // before true in "linked DESC"
  return `COALESCE(i.taxonomy_node_id IN (
             WITH RECURSIVE start AS (
               SELECT CAST(:cat_id AS text) AS id
               UNION
               SELECT m.to_id FROM catalog.taxonomy_mappings m
                WHERE m.from_id = :cat_id AND m.is_active
             ), sub AS (
               SELECT n.id FROM catalog.taxonomy_nodes n JOIN start s ON s.id = n.id
               UNION
               SELECT n.id FROM catalog.taxonomy_nodes n JOIN sub ON n.parent_id = sub.id
             )
             SELECT id FROM sub)
           OR (CAST(:cat_shop_type AS text) IS NOT NULL
               AND i.attributes->>'shop_type' = :cat_shop_type))`;
}

/**
 * Items that apply to a sub-category: items under any of its catalog nodes (or their
 * descendants), plus service items tagged with its key (attributes.shop_type — the
 * sub-category key equals the catalog shop-type key). Returns a SQL boolean over `i`.
 */
function subCategoryCondition(subCategory, replacements, prefix = 'sc') {
  const nodes = (Array.isArray(subCategory?.catalog_nodes) ? subCategory.catalog_nodes : []).filter(
    (n) => typeof n === 'string' && n.includes(':')
  );
  const key = typeof subCategory?.key === 'string' && subCategory.key ? subCategory.key : null;
  const subId = Number.parseInt(subCategory?.id, 10);
  const hasId = Number.isInteger(subId) && subId > 0;
  if (!nodes.length && !key && !hasId) return 'FALSE';
  // Manual links (admin picks) always count; a rule match is dropped when an admin excluded it
  const manual = hasId
    ? `EXISTS (SELECT 1 FROM catalog_item_sub_categories l WHERE l.catalog_item_id = i.id AND l.sub_category_id = ${subId} AND l.source = 'manual')`
    : 'FALSE';
  const excluded = hasId
    ? `EXISTS (SELECT 1 FROM catalog_item_sub_categories x WHERE x.catalog_item_id = i.id AND x.sub_category_id = ${subId} AND x.source = 'excluded')`
    : 'FALSE';
  if (!nodes.length && !key) return `(${manual})`;
  replacements[`${prefix}_nodes`] = nodes.length ? nodes : ['-'];
  replacements[`${prefix}_key`] = key || '-';
  const rule = ruleCondition(prefix);
  return `(${manual} OR (${rule} AND NOT ${excluded}))`;
}

/** The catalogue rule (same as catalog/search): taxonomy descendants or the shop_type key. */
function ruleCondition(prefix) {
  // COALESCE: an item with no node and no shop_type would otherwise be NULL, which sorts
  // before true in "linked DESC"
  return `COALESCE(i.taxonomy_node_id IN (
             WITH RECURSIVE sub AS (
               SELECT n.id FROM catalog.taxonomy_nodes n
                WHERE n.id = ANY (ARRAY[:${prefix}_nodes]::text[])
               UNION
               SELECT n.id FROM catalog.taxonomy_nodes n JOIN sub ON n.parent_id = sub.id
             )
             SELECT id FROM sub)
           OR i.attributes->>'shop_type' = :${prefix}_key, false)`;
}

/**
 * The facts frozen onto a listing when it is copied from the catalogue
 * (shop_listings.catalog_snapshot). Same shape as the migration backfill.
 */
function snapshotFromEnriched(row, capturedAt = new Date()) {
  if (!row) return null;
  return {
    item_id: row.id,
    kind: row.kind || null,
    name: row.name || null,
    brand: row.brand_name || null,
    manufacturer: row.manufacturer || null,
    gtin: row.gtin || null,
    net_quantity: toNumber(row.net_quantity),
    unit: row.unit || null,
    quantity_text: row.quantity_text || null,
    hsn_code: row.effective_hsn || row.hsn_code || null,
    gst_rate: toNumber(row.gst_rate),
    country_of_origin: row.country_of_origin || null,
    image_url: row.image_url || null,
    category_path: row.category_path || null,
    attributes: row.attributes && typeof row.attributes === 'object' && !Array.isArray(row.attributes) ? row.attributes : {},
    captured_at: (capturedAt instanceof Date ? capturedAt : new Date(capturedAt)).toISOString(),
  };
}

// How a loose item is sold (attributes.sold_by) → the listing unit
const SOLD_BY_UNITS = [
  [/kg|kilo/i, 'kg'],
  [/dozen/i, 'dozen'],
  [/bunch/i, 'bunch'],
  [/litre|liter|\bl\b/i, 'litre'],
];

/** The listing unit for a catalogue item: from sold_by for loose goods, else 'piece'. */
function listingUnitFor(snapshot) {
  const soldBy = snapshot && snapshot.attributes ? snapshot.attributes.sold_by : null;
  if (typeof soldBy === 'string') {
    const match = SOLD_BY_UNITS.find(([re]) => re.test(soldBy));
    if (match) return match[1];
  }
  return 'piece';
}

/** attributes.mrp when it is a positive number, else null. */
function mrpHint(attributes) {
  const raw = attributes && typeof attributes === 'object' ? attributes.mrp : undefined;
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * The statutory answers the catalogue can give for an item: true / false, or null when the
 * catalogue does not know (attributes.prescription_status 'unknown' and no schedule value).
 * Only an explicit 'required' / 'not_required' status is read as an answer.
 */
function statutoryFrom(attributes) {
  const attrs = attributes && typeof attributes === 'object' && !Array.isArray(attributes) ? attributes : {};
  const yesNo = (v) => (typeof v === 'boolean' ? v : null);
  const rx = attrs.prescription_status === 'required' ? true : attrs.prescription_status === 'not_required' ? false : null;
  const foodType = typeof attrs.food_type === 'string' && attrs.food_type.trim() ? attrs.food_type.trim() : null;
  return { prescription_required: yesNo(attrs.prescription_required) ?? rx, schedule_drug: yesNo(attrs.schedule_drug), food_type: foodType };
}

module.exports = {
  snapshotFromEnriched,
  listingUnitFor,
  mrpHint,
  statutoryFrom,
  ENRICHED_COLUMNS,
  subCategoryCondition,
  shapeItem,
  enrichedByIds,
  searchConditions,
  searchOrder,
  categoryCondition,
};
