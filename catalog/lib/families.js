'use strict';

const { sha256 } = require('./hash');

/**
 * Group catalogue items that are one product in several pack sizes into item_families
 * (catalog migration 4). Each item stays one SKU; the family carries the variant axis.
 *
 * A family = same brand, same category, same unit (g / ml / pc) and the same name once the
 * quantity words are removed ("Amul Butter 100 g" and "Amul Butter 500 g"), with at least two
 * different net quantities. Axis: net_quantity, value = the item's quantity_text.
 *
 * Deterministic and repeatable: family ids hash the grouping key, members are reassigned in
 * one transaction, and families that lost all members are deactivated (never deleted).
 * Rejected items are never grouped. Two items with the same quantity in one group are left
 * out (they are duplicate candidates for `dedupe`, not variants).
 */

const SOURCE = 'families';
// Quantity words to drop from a name_key (name_key is lower case, unaccented, single spaced)
const QTY = [
  /\b\d+(?:[.,]\d+)?\s*(?:kg|g|gm|gms|gram|grams|l|ltr|litre|litres|liter|ml|pc|pcs|piece|pieces|n|nos|units?|tablets?|capsules?|sachets?)\b/g,
  /\bpack of \d+\b/g,
  /\b(?:x|×)\s*\d+\b/g,
  /\b\d+\s*(?:x|×)\b/g,
];
const baseName = (nameKey) => {
  let s = ` ${String(nameKey || '').toLowerCase()} `;
  for (const re of QTY) s = s.replace(re, ' ');
  return s.replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
};
const displayName = (name) =>
  String(name || '')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:kg|g|gm|gms|l|ltr|ml|pcs?|n)\b/gi, '')
    .replace(/\bpack of \d+\b/gi, '')
    .replace(/[(\[]\s*[)\]]/g, '')
    .replace(/\s+[-–,|]+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

async function buildFamilies(client, { log = console.log, dryRun = false } = {}) {
  await client.query('BEGIN');
  try {
    const { rows } = await client.query(`
      SELECT id, name, name_key, brand_key, taxonomy_node_id, unit, net_quantity, quantity_text
        FROM catalog.items
       WHERE is_active AND status <> 'rejected' AND kind = 'product'
         AND brand_key IS NOT NULL AND net_quantity IS NOT NULL`);

    const groups = new Map();
    for (const r of rows) {
      const base = baseName(r.name_key);
      if (!base) continue;
      const key = [r.brand_key, r.taxonomy_node_id || '', r.unit, base].join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }

    const families = [];
    const members = [];
    for (const [key, items] of groups) {
      const byQty = new Map();
      for (const it of items.sort((a, b) => a.id.localeCompare(b.id))) {
        const q = String(Number(it.net_quantity));
        if (!byQty.has(q)) byQty.set(q, it);
      }
      if (byQty.size < 2) continue;
      const id = `fam:${sha256(key).slice(0, 20)}`;
      const first = [...byQty.values()].sort((a, b) => Number(a.net_quantity) - Number(b.net_quantity))[0];
      const fam = {
        id,
        name: displayName(first.name) || first.name,
        brand_key: first.brand_key,
        taxonomy_node_id: first.taxonomy_node_id,
        variant_axes: ['net_quantity'],
        attributes: {},
      };
      families.push(fam);
      for (const it of byQty.values()) {
        const value = it.quantity_text || `${Number(it.net_quantity)} ${it.unit}`;
        members.push({ item_id: it.id, family_id: id, variant_values: { net_quantity: value } });
      }
    }

    // Upsert families (content_hash over the payload, like the loader)
    for (const f of families) {
      const hash = sha256(JSON.stringify([f.name, f.brand_key, f.taxonomy_node_id, f.variant_axes, f.attributes]));
      await client.query(
        `INSERT INTO catalog.item_families (id, name, brand_key, taxonomy_node_id, variant_axes, attributes, source, content_hash)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, brand_key = EXCLUDED.brand_key,
           taxonomy_node_id = EXCLUDED.taxonomy_node_id, variant_axes = EXCLUDED.variant_axes,
           attributes = EXCLUDED.attributes, content_hash = EXCLUDED.content_hash, is_active = true,
           updated_at = now()
         WHERE catalog.item_families.content_hash IS DISTINCT FROM EXCLUDED.content_hash
            OR NOT catalog.item_families.is_active`,
        [f.id, f.name, f.brand_key, f.taxonomy_node_id, JSON.stringify(f.variant_axes), JSON.stringify(f.attributes), SOURCE, hash]
      );
    }

    // Reassign members of this job's families
    await client.query(
      `UPDATE catalog.items SET family_id = NULL, variant_values = '{}'::jsonb
        WHERE family_id IN (SELECT id FROM catalog.item_families WHERE source = $1)`,
      [SOURCE]
    );
    for (const m of members) {
      await client.query('UPDATE catalog.items SET family_id = $2, variant_values = $3::jsonb WHERE id = $1', [
        m.item_id,
        m.family_id,
        JSON.stringify(m.variant_values),
      ]);
    }
    const { rowCount: deactivated } = await client.query(
      `UPDATE catalog.item_families f SET is_active = false, updated_at = now()
        WHERE f.source = $1 AND f.is_active
          AND NOT EXISTS (SELECT 1 FROM catalog.items i WHERE i.family_id = f.id)`,
      [SOURCE]
    );

    if (dryRun) await client.query('ROLLBACK');
    else await client.query('COMMIT');
    log(`families: ${families.length} (${members.length} items), deactivated ${deactivated}${dryRun ? ' — dry run, rolled back' : ''}`);
    return { families: families.length, items: members.length, deactivated };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

module.exports = { buildFamilies, baseName };
