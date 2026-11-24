/**
 * Client helpers for listing variants (catalog/attributes/DESIGN.md §4).
 *
 * A listing with a non-empty `variant_axes` (e.g. ["size", "colour"]) carries `variants`:
 * [{ id, option_values: { size: 'M', colour: 'Navy' }, price, mrp, sku, stock_qty,
 *    is_available, stock_state, label, position }]. The listing's stock_mode applies to every
 * variant. The server keeps the listing's price at the cheapest available variant.
 */

/** True when the listing sells variants. */
export const hasVariants = (listing) =>
  Array.isArray(listing?.variant_axes) && listing.variant_axes.length > 0 && Array.isArray(listing?.variants);

/** "Pack size" from "pack_size". */
export const axisLabel = (key) => String(key || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** "M / Navy": the values in axis order. */
export const variantLabel = (axes, optionValues) =>
  (axes || [])
    .map((k) => (optionValues || {})[k])
    .filter((v) => v !== undefined && v !== null && String(v).trim() !== '')
    .join(' / ');

/** The distinct values of one axis, in variant position order. */
export const axisValues = (listing, axis) => {
  const seen = [];
  (listing?.variants || []).forEach((v) => {
    const value = v?.option_values?.[axis];
    if (value !== undefined && value !== null && !seen.includes(value)) seen.push(value);
  });
  return seen;
};

/** The listing's stock fields applied to one variant, for the stock helpers (isSellable...). */
export const variantAsStock = (listing, variant) =>
  variant
    ? {
        listing_type: listing?.listing_type,
        stock_mode: listing?.stock_mode,
        stock_qty: variant.stock_qty,
        low_stock_threshold: variant.low_stock_threshold ?? listing?.low_stock_threshold,
        is_available: variant.is_available,
        stock_state: variant.stock_state,
      }
    : listing;

const isAvailable = (v) => v && v.is_available !== false && v.stock_state !== 'out';

/** The variant the pickers start on: the cheapest available one, else the first. */
export const defaultVariant = (listing) => {
  const list = [...(listing?.variants || [])];
  if (!list.length) return null;
  list.sort(
    (a, b) => Number(isAvailable(b)) - Number(isAvailable(a)) || Number(a.price) - Number(b.price) || (a.position || 0) - (b.position || 0)
  );
  return list[0];
};

/** The variant matching every axis of a selection, or null. */
export const findVariant = (listing, selection) => {
  const axes = listing?.variant_axes || [];
  if (!selection) return null;
  return (listing?.variants || []).find((v) => axes.every((k) => v.option_values?.[k] === selection[k])) || null;
};

/**
 * The selection after choosing `value` on `axis`: when no variant has the combination, the
 * other axes move to the closest one that exists with the new value.
 */
export const selectOption = (listing, selection, axis, value) => {
  const next = { ...(selection || {}), [axis]: value };
  if (findVariant(listing, next)) return next;
  const axes = listing?.variant_axes || [];
  const candidates = (listing?.variants || []).filter((v) => v.option_values?.[axis] === value);
  const scored = candidates
    .map((v) => ({ v, score: axes.filter((k) => v.option_values?.[k] === next[k]).length + (isAvailable(v) ? 0.5 : 0) }))
    .sort((a, b) => b.score - a.score);
  return scored.length ? { ...scored[0].v.option_values } : next;
};

/** True when some variant with this selection's other values (or any variant) has `value`. */
export const optionExists = (listing, selection, axis, value) =>
  (listing?.variants || []).some(
    (v) =>
      v.option_values?.[axis] === value &&
      (listing.variant_axes || []).every((k) => k === axis || !selection || v.option_values?.[k] === selection[k])
  );

/** An order or cart line's display name: "T-shirt (M / Navy)" for variant lines. */
export const lineName = (line, fallback = 'Item') => {
  const name = line?.item_name || fallback;
  return line?.variant_label ? `${name} (${line.variant_label})` : name;
};

/** Cart line identity: the listing, plus the variant for variant lines. */
export const cartLineKey = (listingId, variantId) => (variantId ? `${listingId}:${variantId}` : listingId);
export const lineKeyOf = (line) => line?.line_key || cartLineKey(line?.listing_id, line?.variant_id);
