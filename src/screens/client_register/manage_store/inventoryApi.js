import { netWorkCall, apiConfig } from '../../../app/utils';

const chunk = (list, size) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

/**
 * PATCH listings/inventory in batches of 200 (spec §E2).
 * Resolves to { updated:[Listing], skipped:[{id,reason}], error } — error is set when a batch failed outright.
 */
export const patchInventory = async (shopId, updates) => {
  const updated = [];
  const skipped = [];
  let error = null;
  for (const part of chunk(updates, 200)) {
    try {
      const res = await netWorkCall(apiConfig.listings_inventory, 'PATCH', JSON.stringify({ shop_id: shopId, updates: part }), true);
      if (!res?.success) {
        error = res;
        break;
      }
      updated.push(...(Array.isArray(res.updated) ? res.updated : []));
      skipped.push(...(Array.isArray(res.skipped) ? res.skipped : []));
    } catch (err) {
      error = { error: 'Could not reach the server. Check your connection.' };
      break;
    }
  }
  return { updated, skipped, error };
};

/**
 * Updates for "Mark in stock" / "Mark out of stock" on selected listings.
 * Counted rows need `qty` to come back in stock; always-available rows cannot be changed.
 */
export const buildStockUpdates = (items, direction, qty) => {
  const updates = [];
  let unchanged = 0;
  items.forEach((item) => {
    // Listings with variants: one update per variant (the count lives there)
    if (Array.isArray(item.variant_axes) && item.variant_axes.length && Array.isArray(item.variants)) {
      if (item.stock_mode === 'always' || !item.variants.length) {
        unchanged += 1;
      } else if (item.stock_mode === 'tracked') {
        if (direction === 'out') item.variants.forEach((v) => updates.push({ id: item.id, variant_id: v.id, stock_qty: 0 }));
        else if (qty !== null && qty !== undefined) {
          const n = Math.max(0, Math.trunc(Number(qty)));
          item.variants.forEach((v) => updates.push({ id: item.id, variant_id: v.id, stock_qty: n }));
        } else unchanged += 1;
      } else {
        item.variants.forEach((v) => updates.push({ id: item.id, variant_id: v.id, is_available: direction === 'in' }));
      }
      return;
    }
    if (item.stock_mode === 'tracked') {
      if (direction === 'out') updates.push({ id: item.id, stock_qty: 0 });
      else if (qty !== null && qty !== undefined) updates.push({ id: item.id, stock_qty: Math.max(0, Math.trunc(Number(qty))) });
      else unchanged += 1;
    } else if (item.stock_mode === 'always') {
      unchanged += 1;
    } else {
      updates.push({ id: item.id, is_available: direction === 'in' });
    }
  });
  return { updates, unchanged };
};

/** PATCH listings/section: move up to 500 listings at a time. Resolves to { updated, error }. */
export const assignSection = async (shopId, listingIds, sectionId) => {
  let updated = 0;
  for (const part of chunk(listingIds, 500)) {
    try {
      const res = await netWorkCall(
        apiConfig.listings_assign_section,
        'PATCH',
        JSON.stringify({ shop_id: shopId, listing_ids: part, section_id: sectionId }),
        true
      );
      if (!res?.success) return { updated, error: res };
      updated += Number(res.updated) || part.length;
    } catch (err) {
      return { updated, error: { error: 'Could not reach the server. Check your connection.' } };
    }
  }
  return { updated, error: null };
};

/** DELETE listings one by one, a few at a time. Resolves to { deleted:[id], failed:[id] }. */
export const deleteListings = async (ids) => {
  const deleted = [];
  const failed = [];
  for (const part of chunk(ids, 5)) {
    const results = await Promise.all(
      part.map((id) =>
        netWorkCall(`${apiConfig.listings_delete}/${id}`, 'DELETE', null, true)
          .then((res) => ({ id, ok: Boolean(res?.success) }))
          .catch(() => ({ id, ok: false }))
      )
    );
    results.forEach((r) => (r.ok ? deleted : failed).push(r.id));
  }
  return { deleted, failed };
};
