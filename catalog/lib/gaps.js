'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Coverage of the catalogue per sub-category: how many items it has and how well each
 * catalogue-owned attribute of its attribute set is filled. Drives what collectors fetch.
 *
 * An item belongs to a sub-category when its taxonomy node is one of the sub-category's
 * catalog_nodes (attributes/inputs/sub_categories.json) or a descendant, or when
 * attributes.shop_type is the sub-category key — the same rule the app uses.
 * Attributes that are item columns read the column; the rest read attributes->>key. Reads
 * items_enriched, so facts other collectors added (catalog.item_facts) count as filled.
 */

const ROOT = path.join(__dirname, '..');
const COLUMN = {
  brand: "i.brand_key IS NOT NULL",
  manufacturer: "coalesce(i.manufacturer, i.attributes->>'manufacturer') IS NOT NULL",
  net_quantity: 'i.net_quantity IS NOT NULL',
  pack_size: "coalesce(i.quantity_text, i.attributes->>'pack_size') IS NOT NULL",
  net_weight: "coalesce(i.quantity_text, i.attributes->>'net_weight') IS NOT NULL",
  country_of_origin: "coalesce(i.country_of_origin, i.attributes->>'country_of_origin') IS NOT NULL",
  gtin: 'i.gtin IS NOT NULL',
  hsn_code: 'i.hsn_code IS NOT NULL',
};
const filled = (key) =>
  COLUMN[key] ||
  `(i.attributes ? '${key}' AND i.attributes->'${key}' NOT IN ('null'::jsonb, '""'::jsonb, '[]'::jsonb))`;

async function gaps(client, { sub } = {}) {
  const subs = JSON.parse(fs.readFileSync(path.join(ROOT, 'attributes', 'inputs', 'sub_categories.json'), 'utf8'));
  const sets = JSON.parse(fs.readFileSync(path.join(ROOT, 'seeds', 'attributes', 'sets.json'), 'utf8'));
  const out = [];
  for (const s of subs) {
    if (sub && s.key !== sub) continue;
    const set = sets[s.key] || { attributes: [] };
    const attrs = (set.attributes || []).filter((a) => a.owner === 'catalog' && /^[a-z][a-z0-9_]*$/.test(a.key));
    const nodes = (s.catalog_nodes || []).filter((n) => /^[a-z_]+:\S+$/.test(n));
    const sql = `
      WITH RECURSIVE tree(node_id) AS (
        SELECT unnest($1::text[])
        UNION SELECT n.id FROM catalog.taxonomy_nodes n JOIN tree t ON n.parent_id = t.node_id
      ), member AS (
        SELECT DISTINCT i.* FROM catalog.items_enriched i
         WHERE i.is_active AND i.status <> 'rejected'
           AND (i.taxonomy_node_id IN (SELECT node_id FROM tree) OR i.attributes->>'shop_type' = $2)
      )
      SELECT count(*)::int AS items,
             count(*) FILTER (WHERE i.status IN ('ready', 'verified'))::int AS ready
             ${attrs.map((a, n) => `, count(*) FILTER (WHERE ${filled(a.key)})::int AS a${n}`).join('')}
        FROM member i`;
    const { rows } = await client.query(sql, [nodes, s.key]);
    const r = rows[0];
    const fill = attrs.map((a, n) => ({
      key: a.key,
      level: a.level,
      filled: r[`a${n}`],
      pct: r.items ? Math.round((100 * r[`a${n}`]) / r.items) : 0,
    }));
    const weak = fill
      .filter((f) => f.level === 'statutory' || f.level === 'required' || f.level === 'recommended')
      .filter((f) => f.pct < 50)
      .sort((a, b) => a.pct - b.pct);
    out.push({
      sub_category: s.key,
      category: s.category,
      listing_type: s.listing_type,
      items: r.items,
      ready: r.ready,
      catalog_attributes: attrs.length,
      fill,
      missing: weak.map((f) => `${f.key} ${f.pct}%`),
    });
  }
  return out;
}

module.exports = { gaps };
