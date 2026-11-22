/**
 * Client helpers for listing stock (docs/catalogue/03-spec.md §C3).
 * The server owns the rules: it derives `is_available` from the stock mode and
 * sends `stock_state`. These helpers only label and read those values.
 *
 *   tracked: the store counts units; sellable while stock_qty > 0
 *   toggle:  the owner switches the item on or off
 *   always:  always available (services)
 */

export const STOCK_MODES = ['tracked', 'toggle', 'always'];
export const DEFAULT_LOW_STOCK = 5;

const kindOf = (listingType) => {
  if (listingType === 'food') return 'food';
  if (listingType === 'service' || listingType === 'rental') return 'service';
  return 'product';
};

/** On / off words for a listing type: "In stock" for goods, "Sold out" for dishes. */
export const availabilityLabels = (listingType) => {
  const kind = kindOf(listingType);
  if (kind === 'food') return { on: 'Available', off: 'Sold out' };
  if (kind === 'service') return { on: 'Available', off: 'Unavailable' };
  return { on: 'In stock', off: 'Out of stock' };
};

/** Options for the stock mode segmented control. */
export const stockModeOptions = (listingType) => {
  const kind = kindOf(listingType);
  return [
    { value: 'tracked', label: 'Count stock' },
    { value: 'toggle', label: kind === 'food' ? 'Available / Sold out' : 'On / Off' },
    { value: 'always', label: 'Always available' },
  ];
};

export const STOCK_MODE_SHORT = { tracked: 'Count', toggle: 'On/Off', always: 'Always' };

/** A sensible mode when the API gives none: services are always available, food is switched. */
export const fallbackStockMode = (listingType) => {
  if (listingType === 'service') return 'always';
  if (listingType === 'food' || listingType === 'rental') return 'toggle';
  return 'tracked';
};

const toInt = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

/** 'in_stock' | 'low' | 'out', preferring the server's value. */
export const stockState = (listing) => {
  if (!listing) return 'out';
  if (['in_stock', 'low', 'out'].includes(listing.stock_state)) return listing.stock_state;
  const mode = listing.stock_mode;
  if (mode === 'always') return 'in_stock';
  if (mode === 'tracked') {
    const qty = toInt(listing.stock_qty) ?? 0;
    if (qty <= 0) return 'out';
    const threshold = toInt(listing.low_stock_threshold) ?? DEFAULT_LOW_STOCK;
    return qty <= threshold ? 'low' : 'in_stock';
  }
  return listing.is_available === false ? 'out' : 'in_stock';
};

/** True when a customer can add the listing to a cart right now. */
export const isSellable = (listing) => {
  if (!listing) return false;
  if (listing.is_available === false) return false;
  if (listing.stock_mode === 'tracked') return (toInt(listing.stock_qty) ?? 0) > 0;
  return true;
};

/** Most a customer can order: the counted stock, or null for no limit. */
export const maxOrderQty = (listing) =>
  listing?.stock_mode === 'tracked' ? Math.max(toInt(listing.stock_qty) ?? 0, 0) : null;

/**
 * The pill an owner sees on a listing: { text, tone } with tone one of
 * 'ok' | 'low' | 'out' | 'always' | 'on'.
 */
export const stockPill = (listing) => {
  const labels = availabilityLabels(listing?.listing_type);
  const mode = listing?.stock_mode;
  if (mode === 'always') return { text: 'Always', tone: 'always' };
  if (mode === 'tracked') {
    const qty = toInt(listing.stock_qty) ?? 0;
    const state = stockState(listing);
    if (state === 'out') return { text: 'Out · 0', tone: 'out' };
    if (state === 'low') return { text: `Low · ${qty}`, tone: 'low' };
    return { text: `${qty} in stock`, tone: 'ok' };
  }
  return listing?.is_available === false ? { text: labels.off, tone: 'out' } : { text: 'On', tone: 'on' };
};

/** "Only 3 left" for counted items at or under their low-stock threshold, else null. */
export const lowStockHint = (listing) => {
  if (listing?.stock_mode !== 'tracked') return null;
  if (stockState(listing) !== 'low') return null;
  const qty = toInt(listing.stock_qty) ?? 0;
  return qty > 0 ? `Only ${qty} left` : null;
};

/** The first problem with a stock block, or null: tracked stock needs a whole number of 0 or more. */
export const stockBlockError = ({ stock_mode, stock_qty, low_stock_threshold } = {}) => {
  if (!STOCK_MODES.includes(stock_mode)) return 'Choose how you track stock';
  if (stock_mode === 'tracked') {
    const qty = toInt(stock_qty);
    if (qty === null) return 'Enter the stock quantity';
    if (qty < 0) return 'Stock cannot be negative';
  }
  if (low_stock_threshold !== null && low_stock_threshold !== undefined && low_stock_threshold !== '') {
    const t = toInt(low_stock_threshold);
    if (t === null || t < 0) return 'Low-stock alert must be 0 or more';
  }
  return null;
};

/** The stock fields to send for a listing, with values the mode ignores left out. */
export const stockPayload = ({ stock_mode, stock_qty, low_stock_threshold, is_available } = {}) => {
  if (stock_mode === 'tracked') {
    const payload = { stock_mode, stock_qty: toInt(stock_qty) ?? 0 };
    const t = toInt(low_stock_threshold);
    if (t !== null) payload.low_stock_threshold = t;
    return payload;
  }
  if (stock_mode === 'toggle') {
    return typeof is_available === 'boolean' ? { stock_mode, is_available } : { stock_mode };
  }
  return { stock_mode: 'always' };
};
