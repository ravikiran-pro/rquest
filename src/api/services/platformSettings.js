/**
 * Platform configuration: the settings a platform admin controls from
 * Admin > Platform configuration, plus the helpers that make them take effect.
 *
 * Storage: table `platform_settings` (one row per key, JSONB value). Any key without a row
 * uses the default below, so a fresh database works without a migration or seed. The table
 * is created on first use (model sync) and by migration 20261120000000-create-platform-settings.
 *
 * Where each setting is enforced is listed in SETTINGS (`enforced`) and mirrored in the admin UI.
 */
const db = require('../models');

const DEFAULT_MAINTENANCE_MESSAGE =
  'Rquest is down for a short maintenance break. New orders are paused and will be back shortly.';

// type: money (₹, 2 decimals) | number | boolean | text | email | phone
// public: safe to return from the unauthenticated GET /platform/settings
const SETTINGS = {
  // Fees & orders
  platform_fee: {
    group: 'fees',
    label: 'Platform fee',
    type: 'money',
    default: 5,
    min: 0,
    max: 500,
    public: true,
    enforced: 'orders POST: added to every order (client value ignored)',
  },
  delivery_fee_base: {
    group: 'fees',
    label: 'Delivery fee',
    type: 'money',
    default: 30,
    min: 0,
    max: 1000,
    public: true,
    enforced: 'orders POST: charged on delivery orders',
  },
  free_delivery_threshold: {
    group: 'fees',
    label: 'Free delivery threshold',
    type: 'money',
    default: 0,
    min: 0,
    max: 100000,
    public: true,
    enforced: 'orders POST: delivery fee is 0 when the items subtotal reaches it (0 = off)',
  },
  min_order_value: {
    group: 'fees',
    label: 'Minimum order value',
    type: 'money',
    default: 0,
    min: 0,
    max: 100000,
    public: true,
    enforced: 'orders POST: rejects orders whose items subtotal is below it (0 = off)',
  },

  // Marketplace
  allow_new_shop_registrations: {
    group: 'marketplace',
    label: 'New shop registrations',
    type: 'boolean',
    default: true,
    public: true,
    enforced: 'POST /shops/client_register: 403 for new shops when off (admins exempt)',
  },
  default_search_radius_km: {
    group: 'marketplace',
    label: 'Default search radius',
    type: 'number',
    default: 10,
    min: 1,
    max: 100,
    public: true,
    enforced: null, // informational: published to the app, search does not cut off by distance yet
  },
  max_delivery_radius_km: {
    group: 'marketplace',
    label: 'Maximum delivery distance',
    type: 'number',
    default: 0,
    min: 0,
    max: 200,
    public: true,
    enforced: 'orders POST: rejects delivery to a saved address farther than this from the shop (0 = no limit)',
  },

  // Features
  enable_delivery: {
    group: 'features',
    label: 'Home delivery',
    type: 'boolean',
    default: true,
    public: true,
    enforced: 'orders POST: delivery orders rejected when off; cart offers self-pickup only',
  },
  enable_quotes: {
    group: 'features',
    label: 'Quote requests',
    type: 'boolean',
    default: true,
    public: true,
    enforced: 'POST /quotes: 403 when off',
  },
  enable_chat: {
    group: 'features',
    label: 'Customer to store chat',
    type: 'boolean',
    default: true,
    public: true,
    enforced: 'POST /chat/create: 403 when off; cart hides the chat entry points',
  },
  enable_ai_search: {
    group: 'features',
    label: 'AI search (voice, photo, smart search)',
    type: 'boolean',
    default: true,
    public: true,
    enforced: '/ai/*: 403 when off',
  },

  // Support & notices
  support_email: {
    group: 'support',
    label: 'Support email',
    type: 'email',
    default: '',
    maxLength: 254,
    public: true,
    enforced: 'shown with checkout notices in the cart',
  },
  support_phone: {
    group: 'support',
    label: 'Support phone',
    type: 'phone',
    default: '',
    maxLength: 20,
    public: true,
    enforced: 'shown with checkout notices in the cart',
  },
  announcement_banner: {
    group: 'support',
    label: 'Announcement',
    type: 'text',
    default: '',
    maxLength: 280,
    public: true,
    enforced: 'shown at the top of the cart page when set',
  },
  maintenance_mode: {
    group: 'support',
    label: 'Maintenance mode',
    type: 'boolean',
    default: false,
    public: true,
    enforced: 'orders POST, POST /quotes and new shop registrations return 503 while on',
  },
  maintenance_message: {
    group: 'support',
    label: 'Maintenance message',
    type: 'text',
    default: DEFAULT_MAINTENANCE_MESSAGE,
    maxLength: 500,
    public: true,
    enforced: 'returned with the 503 responses and shown in the cart',
  },
};

const SETTING_KEYS = Object.keys(SETTINGS);

const DEFAULT_SETTINGS = SETTING_KEYS.reduce((acc, key) => {
  acc[key] = SETTINGS[key].default;
  return acc;
}, {});

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const formatRupees = (n) => {
  const v = round2(n);
  return `₹${Number.isInteger(v) ? v : v.toFixed(2)}`;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s-]{6,18}[0-9]$/;

/** Validate and normalise one value. Returns { value } or { error }. */
function validateValue(key, raw) {
  const def = SETTINGS[key];
  if (!def) return { error: 'Unknown setting' };

  switch (def.type) {
    case 'money':
    case 'number': {
      const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
      if (typeof n !== 'number' || !Number.isFinite(n)) {
        return { error: `${def.label} must be a number` };
      }
      if (n < def.min || n > def.max) {
        const fmt = def.type === 'money' ? formatRupees : (v) => `${v} km`;
        return { error: `${def.label} must be between ${fmt(def.min)} and ${fmt(def.max)}` };
      }
      return { value: def.type === 'money' ? round2(n) : Math.round(n * 10) / 10 };
    }
    case 'boolean':
      if (typeof raw !== 'boolean') return { error: `${def.label} must be on or off (true/false)` };
      return { value: raw };
    case 'text':
    case 'email':
    case 'phone': {
      if (raw === null || raw === undefined) return { value: '' };
      if (typeof raw !== 'string') return { error: `${def.label} must be text` };
      const v = def.type === 'text' ? raw.trim() : raw.trim().replace(/\s+/g, def.type === 'phone' ? ' ' : '');
      if (def.maxLength && v.length > def.maxLength) {
        return { error: `${def.label} must be ${def.maxLength} characters or fewer` };
      }
      if (v && def.type === 'email' && !EMAIL_RE.test(v)) {
        return { error: 'Enter a valid email address, or leave it empty' };
      }
      if (v && def.type === 'phone' && !PHONE_RE.test(v)) {
        return { error: 'Enter a valid phone number (digits, spaces, + or -), or leave it empty' };
      }
      return { value: v };
    }
    default:
      return { error: 'Unsupported setting type' };
  }
}

class PlatformSettingsValidationError extends Error {
  constructor(errors) {
    super('Some settings are invalid');
    this.name = 'PlatformSettingsValidationError';
    this.errors = errors;
  }
}

/** Validate a partial update. Unknown keys are rejected so typos are not silently dropped. */
function validatePatch(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return { values: {}, errors: { _: 'Send a JSON object of settings to update' } };
  }
  const values = {};
  const errors = {};
  Object.keys(patch).forEach((key) => {
    const { value, error } = validateValue(key, patch[key]);
    if (error) errors[key] = error;
    else values[key] = value;
  });
  if (!Object.keys(patch).length) errors._ = 'No settings to update';
  return { values, errors };
}

// ---------------------------------------------------------------------------
// Storage (with a short in-process cache; writes through this module clear it)
// ---------------------------------------------------------------------------
const CACHE_MS = 10 * 1000;
let cache = null; // { at, data: { settings, meta } }
let tableReady = null;

function getModel() {
  return db.platform_settings;
}

// CREATE TABLE IF NOT EXISTS on first use, so the app works before the migration runs.
function ensureTable() {
  if (!tableReady) {
    tableReady = getModel()
      .sync()
      .catch((err) => {
        tableReady = null; // retry on the next call
        throw err;
      });
  }
  return tableReady;
}

/** Full settings (defaults merged with stored values) plus last-update metadata. Never throws. */
async function loadSettings({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.data;

  const settings = { ...DEFAULT_SETTINGS };
  const meta = { updated_at: null, updated_by: null };
  try {
    await ensureTable();
    const rows = await getModel().findAll();
    rows.forEach((row) => {
      if (!SETTINGS[row.key]) return; // retired key: ignore
      const { value, error } = validateValue(row.key, row.value);
      if (!error) settings[row.key] = value;
      if (row.updatedAt && (!meta.updated_at || row.updatedAt > meta.updated_at)) {
        meta.updated_at = row.updatedAt;
        meta.updated_by = row.updated_by || null;
      }
    });
  } catch (err) {
    console.warn('Platform settings: using defaults,', err.message);
  }

  const data = { settings, meta };
  cache = { at: Date.now(), data };
  return data;
}

async function getSettings() {
  const { settings } = await loadSettings();
  return { ...settings };
}

async function getPublicSettings() {
  const settings = await getSettings();
  const out = {};
  SETTING_KEYS.forEach((key) => {
    if (SETTINGS[key].public) out[key] = settings[key];
  });
  if ('maintenance_message' in out && !out.maintenance_message) {
    out.maintenance_message = DEFAULT_MAINTENANCE_MESSAGE;
  }
  return out;
}

/** Validate + save a partial update. Throws PlatformSettingsValidationError on bad input. */
async function saveSettings(patch, userId) {
  const { values, errors } = validatePatch(patch);
  if (Object.keys(errors).length) throw new PlatformSettingsValidationError(errors);

  const current = (await loadSettings({ fresh: true })).settings;
  const merged = { ...current, ...values };
  if (merged.maintenance_mode && !merged.maintenance_message) {
    throw new PlatformSettingsValidationError({
      maintenance_message: 'Add the message shoppers will see while maintenance mode is on',
    });
  }

  await ensureTable();
  const Model = getModel();
  await db.sequelize.transaction(async (transaction) => {
    for (const key of Object.keys(values)) {
      await Model.upsert(
        { key, value: values[key], updated_by: userId ? String(userId) : null },
        { transaction }
      );
    }
  });

  cache = null;
  return loadSettings({ fresh: true });
}

// ---------------------------------------------------------------------------
// Enforcement helpers
// ---------------------------------------------------------------------------

// Same rule as requireAdmin in src/api/auth (role id, or the built-in admin usernames).
const ADMIN_ROLE_ID = 'd5e858d8-636c-4fc3-8c3a-0a76131c95e9';
const isAdminRequest = (req) => {
  const { role_id, username } = (req && req.headers) || {};
  return role_id === ADMIN_ROLE_ID || username === 'admin' || username === 'root';
};

const maintenanceMessage = (settings) => settings.maintenance_message || DEFAULT_MAINTENANCE_MESSAGE;

const FEATURE_OFF_MESSAGES = {
  enable_delivery: 'Home delivery is turned off right now. Choose self-pickup instead.',
  enable_quotes: 'Quote requests are turned off on Rquest right now.',
  enable_chat: 'Chat is turned off on Rquest right now.',
  enable_ai_search: 'AI search is turned off on Rquest right now.',
};

/** JSON body for a blocked request. */
const blocked = (status, code, message, extra) => ({
  status,
  body: { success: false, code, error: message, message, ...extra },
});

/** Delivery fee, platform fee and total for an order, from the settings. */
function computeOrderFees({ itemsTotal, orderType }, settings) {
  const subtotal = round2(itemsTotal);
  const platformFee = round2(settings.platform_fee);
  let deliveryFee = 0;
  if (orderType === 'delivery') {
    const freeOver = Number(settings.free_delivery_threshold) || 0;
    deliveryFee = freeOver > 0 && subtotal >= freeOver ? 0 : round2(settings.delivery_fee_base);
  }
  return { platformFee, deliveryFee, total: round2(subtotal + platformFee + deliveryFee) };
}

/** Why a new order may not be placed (maintenance, delivery off, below minimum), or null. */
function orderBlock({ orderType, itemsTotal }, settings) {
  if (settings.maintenance_mode) {
    return blocked(503, 'MAINTENANCE', maintenanceMessage(settings));
  }
  if (orderType === 'delivery' && !settings.enable_delivery) {
    return blocked(403, 'FEATURE_DISABLED', FEATURE_OFF_MESSAGES.enable_delivery, {
      feature: 'enable_delivery',
    });
  }
  const min = Number(settings.min_order_value) || 0;
  if (min > 0 && round2(itemsTotal) < min) {
    const short = round2(min - itemsTotal);
    return blocked(
      400,
      'MIN_ORDER_VALUE',
      `The minimum order on Rquest is ${formatRupees(min)}. Add ${formatRupees(short)} more to place this order.`,
      { min_order_value: min }
    );
  }
  return null;
}

/** Why a new shop may not be registered (maintenance, registrations closed), or null. */
function shopRegistrationBlock(settings) {
  if (settings.maintenance_mode) {
    return blocked(503, 'MAINTENANCE', maintenanceMessage(settings));
  }
  if (!settings.allow_new_shop_registrations) {
    return blocked(
      403,
      'REGISTRATIONS_CLOSED',
      'New shop registrations are closed right now. Please check back later or contact Rquest support.',
      { error: 'Shop registrations closed' }
    );
  }
  return null;
}

/** Great-circle distance in km between two lat/lon points. */
function distanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (Number(d) * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Express middleware that blocks a route while an admin has switched `feature` off
 * (403), and optionally while maintenance mode is on (503).
 */
function requireFeature(feature, { pauseInMaintenance = false } = {}) {
  return async (req, res, next) => {
    const settings = await getSettings();
    if (pauseInMaintenance && settings.maintenance_mode) {
      const b = blocked(503, 'MAINTENANCE', maintenanceMessage(settings));
      return res.status(b.status).json(b.body);
    }
    if (settings[feature] === false) {
      const b = blocked(403, 'FEATURE_DISABLED', FEATURE_OFF_MESSAGES[feature] || 'This feature is turned off.', {
        feature,
      });
      return res.status(b.status).json(b.body);
    }
    return next();
  };
}

module.exports = {
  SETTINGS,
  SETTING_KEYS,
  DEFAULT_SETTINGS,
  PlatformSettingsValidationError,
  validatePatch,
  loadSettings,
  getSettings,
  getPublicSettings,
  saveSettings,
  computeOrderFees,
  orderBlock,
  shopRegistrationBlock,
  distanceKm,
  requireFeature,
  isAdminRequest,
};
