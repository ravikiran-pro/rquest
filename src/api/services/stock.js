/**
 * Stock rules for shop listings (pure functions; no database access).
 *
 * Every listing has a stock_mode:
 *   tracked  the shop counts units. stock_qty is required (whole number >= 0) and
 *            is_available is always derived from it (qty > 0).
 *   toggle   an on/off switch the owner flips (loose produce, dishes, rentals).
 *            stock_qty is stored as NULL.
 *   always   never runs out (services). is_available is forced true, stock_qty NULL.
 *
 * is_available stays the single "sellable now" flag every reader uses.
 */

const STOCK_MODES = ['tracked', 'toggle', 'always'];
const DEFAULT_LOW_STOCK_THRESHOLD = 5;
const MAX_STOCK_QTY = 1e9;
const MAX_DELTA = 1e9;

// Templates for goods sold loose (weighed or counted at the counter)
const LOOSE_TEMPLATES = ['produce', 'meat_fish'];

const isBlank = (value) =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

/** Whole number in [min, max] from a number or digit string; null when blank; NaN when invalid. */
const toWholeNumber = (raw, { min = 0, max = MAX_STOCK_QTY } = {}) => {
  if (isBlank(raw)) return null;
  if (typeof raw === 'boolean') return NaN;
  const text = typeof raw === 'number' ? String(raw) : String(raw).trim();
  if (!/^-?\d+$/.test(text)) return NaN;
  const n = Number(text);
  if (!Number.isSafeInteger(n) || n < min || n > max) return NaN;
  return n;
};

/** true / false from a boolean or 'true'/'false'/'1'/'0'/'yes'/'no'; null when blank; undefined when invalid. */
const toBool = (raw) => {
  if (isBlank(raw)) return null;
  if (typeof raw === 'boolean') return raw;
  const text = String(raw).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(text)) return true;
  if (['false', '0', 'no', 'off'].includes(text)) return false;
  return undefined;
};

/**
 * The stock mode a new listing starts with.
 *   service → always; food, rental → toggle;
 *   product sold loose (snapshot attributes.loose / sold_by, or a produce / meat template) → toggle;
 *   other products → tracked (applyStockFields falls back to toggle when no quantity is sent,
 *   so a default never invents a quantity).
 */
function defaultStockMode({ listingType, templateKey, snapshot } = {}) {
  if (listingType === 'service') return 'always';
  if (listingType === 'food' || listingType === 'rental') return 'toggle';
  if (snapshot && snapshot.kind === 'service') return 'always';
  const attrs = snapshot && snapshot.attributes && typeof snapshot.attributes === 'object' ? snapshot.attributes : {};
  if (attrs.loose === true || !isBlank(attrs.sold_by)) return 'toggle';
  if (LOOSE_TEMPLATES.includes(templateKey)) return 'toggle';
  return 'tracked';
}

/**
 * Reads the stock keys of a request body. Only keys that are present are returned.
 * Returns { input: { stock_mode?, stock_qty?, low_stock_threshold?, is_available?, delta? } }
 * or { error, code, key } where code is invalid_stock_mode | invalid.
 * Legacy `stock` / `stock_quantity` are read as stock_qty when stock_qty is absent.
 */
function normaliseStockInput(body = {}) {
  const src = body && typeof body === 'object' ? body : {};
  const input = {};
  if (src.stock_mode !== undefined && src.stock_mode !== null && src.stock_mode !== '') {
    const mode = String(src.stock_mode).trim().toLowerCase();
    if (!STOCK_MODES.includes(mode)) {
      return { code: 'invalid_stock_mode', key: 'stock_mode', error: 'stock_mode must be tracked, toggle or always' };
    }
    input.stock_mode = mode;
  }
  const rawQty = src.stock_qty !== undefined ? src.stock_qty : src.stock_quantity !== undefined ? src.stock_quantity : src.stock;
  if (rawQty !== undefined) {
    const qty = toWholeNumber(rawQty);
    if (Number.isNaN(qty)) {
      return { code: 'invalid', key: 'stock_qty', error: 'Stock quantity must be a whole number of 0 or more' };
    }
    if (qty !== null) input.stock_qty = qty;
  }
  if (src.low_stock_threshold !== undefined) {
    const threshold = toWholeNumber(src.low_stock_threshold);
    if (Number.isNaN(threshold)) {
      return { code: 'invalid', key: 'low_stock_threshold', error: 'Low-stock alert must be a whole number of 0 or more' };
    }
    input.low_stock_threshold = threshold;
  }
  if (src.is_available !== undefined && src.is_available !== null) {
    const flag = toBool(src.is_available);
    if (flag === undefined) {
      return { code: 'invalid', key: 'is_available', error: 'is_available must be true or false' };
    }
    if (flag !== null) input.is_available = flag;
  }
  if (src.delta !== undefined && src.delta !== null && src.delta !== '') {
    const delta = toWholeNumber(src.delta, { min: -MAX_DELTA, max: MAX_DELTA });
    if (Number.isNaN(delta)) return { code: 'invalid', key: 'delta', error: 'delta must be a whole number' };
    input.delta = delta;
  }
  return { input };
}

/** is_available for a mode: derived for tracked and always, the owner's flag for toggle. */
function deriveAvailability(mode, qty, ownerFlag) {
  if (mode === 'tracked') return Number(qty) > 0;
  if (mode === 'always') return true;
  return ownerFlag === undefined || ownerFlag === null ? true : Boolean(ownerFlag);
}

/**
 * The stock columns after applying `input` (from normaliseStockInput) to `current`
 * (the stored listing, or null when creating).
 *   options.defaultMode  mode for a new listing without an explicit one (defaultStockMode)
 * Returns { values: { stock_mode, stock_qty, low_stock_threshold, is_available } } or
 * { code, key, error } with code stock_qty_required | is_available_derived.
 */
function applyStockFields(current, input = {}, { defaultMode = 'toggle' } = {}) {
  const creating = !current;
  const explicitMode = input.stock_mode !== undefined;
  let mode = explicitMode ? input.stock_mode : creating ? defaultMode : current.stock_mode || 'toggle';
  if (!STOCK_MODES.includes(mode)) mode = 'toggle';

  // A tracked default without a quantity would invent stock: fall back to on/off
  if (creating && !explicitMode && mode === 'tracked' && input.stock_qty === undefined) mode = 'toggle';

  const wasTracked = !creating && current.stock_mode === 'tracked';
  const threshold =
    input.low_stock_threshold !== undefined
      ? input.low_stock_threshold
      : creating
        ? null
        : current.low_stock_threshold ?? null;

  if (mode === 'tracked') {
    let qty = input.stock_qty;
    if (qty === undefined && wasTracked) qty = current.stock_qty;
    if (qty === undefined || qty === null) {
      return { code: 'stock_qty_required', key: 'stock_qty', error: 'Enter the stock quantity for a counted item' };
    }
    const available = qty > 0;
    if (input.is_available !== undefined && input.is_available !== available) {
      return {
        code: 'is_available_derived',
        key: 'is_available',
        error: 'Availability follows the stock count for a counted item; change the quantity instead',
      };
    }
    return {
      values: {
        stock_mode: 'tracked',
        stock_qty: qty,
        // Switching to tracked starts with the default alert level
        low_stock_threshold: threshold === null && !wasTracked ? DEFAULT_LOW_STOCK_THRESHOLD : threshold,
        is_available: available,
      },
    };
  }

  if (mode === 'always') {
    if (input.is_available === false) {
      return {
        code: 'is_available_derived',
        key: 'is_available',
        error: 'An always-available item cannot be marked out of stock; switch it to On/Off first',
      };
    }
    return { values: { stock_mode: 'always', stock_qty: null, low_stock_threshold: threshold, is_available: true } };
  }

  // toggle: the owner's switch; keeps the current state when not sent
  let flag = input.is_available;
  if (flag === undefined) flag = creating ? true : current.is_available;
  return {
    values: { stock_mode: 'toggle', stock_qty: null, low_stock_threshold: threshold, is_available: deriveAvailability('toggle', null, flag) },
  };
}

/** 'in_stock' | 'low' | 'out' for a listing (plain object or model instance). */
function stockState(listing) {
  if (!listing) return 'out';
  const mode = listing.stock_mode || 'toggle';
  if (mode === 'tracked') {
    const qty = Number(listing.stock_qty) || 0;
    if (qty <= 0) return 'out';
    const threshold =
      listing.low_stock_threshold === null || listing.low_stock_threshold === undefined
        ? DEFAULT_LOW_STOCK_THRESHOLD
        : Number(listing.low_stock_threshold);
    return qty <= threshold ? 'low' : 'in_stock';
  }
  if (mode === 'always') return 'in_stock';
  return listing.is_available === false ? 'out' : 'in_stock';
}

/**
 * Stock check for an order.
 *   lines     [{ listing_id, quantity }]
 *   listings  Map(listing_id → { id, name, stock_mode, stock_qty, is_available })
 * Quantities of the same listing on several lines are summed.
 * Returns { short: [{ listing_id, name, requested, available }], deductions: [{ listing_id, quantity }]
 * (tracked listings only, one per listing), lineDeducted: [number] (per line, aligned with lines) }.
 */
function planOrderStock(lines, listings) {
  const requested = new Map();
  for (const line of lines) {
    requested.set(line.listing_id, (requested.get(line.listing_id) || 0) + (Number(line.quantity) || 0));
  }
  const short = [];
  const deductions = [];
  for (const [listingId, quantity] of requested) {
    const listing = listings.get(listingId);
    if (!listing) {
      short.push({ listing_id: listingId, name: null, requested: quantity, available: 0 });
      continue;
    }
    const tracked = listing.stock_mode === 'tracked';
    const qty = Number(listing.stock_qty) || 0;
    if (tracked) {
      if (qty < quantity) short.push({ listing_id: listingId, name: listing.name, requested: quantity, available: Math.max(0, qty) });
      else deductions.push({ listing_id: listingId, quantity });
    } else if (listing.is_available === false && listing.stock_mode !== 'always') {
      short.push({ listing_id: listingId, name: listing.name, requested: quantity, available: 0 });
    }
  }
  const lineDeducted = lines.map((line) => {
    const listing = listings.get(line.listing_id);
    return listing && listing.stock_mode === 'tracked' ? Number(line.quantity) || 0 : 0;
  });
  return { short, deductions, lineDeducted };
}

/**
 * What a cancel puts back: one entry per tracked listing, summing the order lines that
 * still record a deduction. Listings that are no longer tracked are skipped.
 *   items     [{ listing_id, stock_deducted }]
 *   listings  Map(listing_id → { stock_mode })  (optional; without it every listing counts)
 * Returns [{ listing_id, quantity }].
 */
function planRestock(items, listings) {
  const back = new Map();
  for (const item of items || []) {
    const q = Number(item.stock_deducted) || 0;
    if (q <= 0 || !item.listing_id) continue;
    if (listings) {
      const listing = listings.get(item.listing_id);
      if (!listing || listing.stock_mode !== 'tracked') continue;
    }
    back.set(item.listing_id, (back.get(item.listing_id) || 0) + q);
  }
  return [...back].map(([listing_id, quantity]) => ({ listing_id, quantity }));
}

module.exports = {
  STOCK_MODES,
  DEFAULT_LOW_STOCK_THRESHOLD,
  defaultStockMode,
  normaliseStockInput,
  applyStockFields,
  deriveAvailability,
  stockState,
  planOrderStock,
  planRestock,
};
