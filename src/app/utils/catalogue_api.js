/**
 * Small helpers shared by the catalogue, inventory, sections and store-form screens.
 * Endpoints and response shapes follow docs/catalogue/03-spec.md §E.
 */
import { apiConfig, config } from './config';
import { netWorkCall, storageKeys } from './helper';

// Error and skip codes from the API, in plain words for a shop owner
const CODE_TEXT = {
  already_added: 'Already in your store',
  not_found: 'No longer in the catalogue',
  price_above_mrp: 'Price is above MRP',
  stock_qty_required: 'Enter a stock quantity',
  invalid_stock_mode: 'Choose how you track stock',
  sub_category_not_in_shop: 'That category is not on your store',
  section_not_in_shop: 'That section is not on your store',
  is_available_derived: 'Availability follows the stock count for this item',
  negative_stock: 'Stock cannot go below 0',
  invalid_price: 'Price must be 0 or more',
  invalid_mrp: 'MRP must be 0 or more',
  invalid_stock: 'Stock must be a whole number',
  too_many_rows: 'Too many rows. Upload up to 500 at a time',
  scope_not_allowed: 'You can only browse your own categories',
  name_required: 'Enter a section name',
  name_too_long: 'Keep the name under 60 characters',
  name_taken: 'You already have a section with this name',
  section_limit: 'You can have up to 50 sections',
  auto_section: 'Sections made from your categories cannot be deleted',
  ids_mismatch: 'Your sections changed. Refresh and try again',
  invalid: 'Some details need fixing',
  bad_param: 'That search or filter is not valid',
};

/** Plain words for an API code, else the fallback. */
export const codeText = (code, fallback = 'Could not be saved') => CODE_TEXT[code] || fallback;

/** The best message from an API error response. */
export const apiErrorText = (res, fallback = 'Something went wrong. Please try again.') => {
  if (!res) return fallback;
  if (res.code && CODE_TEXT[res.code]) return CODE_TEXT[res.code];
  if (res.error && CODE_TEXT[res.error]) return CODE_TEXT[res.error];
  if (Array.isArray(res.errors) && res.errors[0]?.message) return res.errors[0].message;
  return res.error || res.message || fallback;
};

/** True when the response says the master catalogue is not set up on this server. */
export const isCatalogueUnavailable = (res) => res?.httpStatus === 503;

/** "?a=1&b=x" from an object, leaving out empty values. */
export const toQuery = (params) => {
  const sp = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') return;
    sp.set(key, String(value));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
};

/* ------------------------------------------------------------------ */
/* Resolved store forms, cached per shop and sub-category              */
/* ------------------------------------------------------------------ */

const resolvedCache = new Map();
const cacheKey = (shopId, subId) => `${shopId}:${subId}`;

/**
 * GET forms/shop/:shop_id/:sub_id/resolved, cached for the session.
 * Resolves to { fields, default_stock_mode, listing_type } or rejects with the response.
 */
export const fetchResolvedForm = (shopId, subId, { force = false } = {}) => {
  if (!shopId || subId === null || subId === undefined) {
    return Promise.resolve({ fields: [], default_stock_mode: null, listing_type: null });
  }
  const key = cacheKey(shopId, subId);
  if (!force && resolvedCache.has(key)) return resolvedCache.get(key);
  const request = netWorkCall(`${apiConfig.forms_shop}/${shopId}/${subId}/resolved`, 'GET', null, true).then(
    (res) => {
      if (res?.success && res.data) {
        return {
          fields: Array.isArray(res.data.fields) ? res.data.fields : [],
          default_stock_mode: res.data.default_stock_mode || null,
          listing_type: res.data.listing_type || null,
          // [{ key, label, values, open_values }]: options this sub-category's products vary by
          variant_axes: Array.isArray(res.data.variant_axes) ? res.data.variant_axes : [],
        };
      }
      resolvedCache.delete(key);
      throw res || { error: 'Could not load the product form' };
    },
    (err) => {
      resolvedCache.delete(key);
      throw err;
    }
  );
  resolvedCache.set(key, request);
  return request;
};

/** Drop cached forms after Form settings saves (all sub-categories of the shop when subId is omitted). */
export const invalidateResolvedForm = (shopId, subId) => {
  if (subId !== undefined && subId !== null) {
    resolvedCache.delete(cacheKey(shopId, subId));
    return;
  }
  Array.from(resolvedCache.keys()).forEach((key) => {
    if (key.startsWith(`${shopId}:`)) resolvedCache.delete(key);
  });
};

/* ------------------------------------------------------------------ */
/* Image upload (master/upload, any signed-in user)                    */
/* ------------------------------------------------------------------ */

/** Uploads an image file and resolves to its public URL, or rejects with a message. */
export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('fileData', file);
  const token = sessionStorage.getItem(storageKeys.auth_token) || localStorage.getItem(storageKeys.auth_token);
  const response = await fetch(`${config.api_url}/api/v1/${apiConfig.upload}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  let json = null;
  try {
    json = await response.json();
  } catch (err) {
    json = null;
  }
  const url = json?.data?.Location;
  if (!url) throw new Error(json?.error || 'Image upload failed');
  return url;
};
