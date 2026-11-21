import { io } from 'socket.io-client';

export const config = {
  IMAGE_CDN: import.meta.env.VITE_APP_IMAGE_CDN,
  api_url: import.meta.env.VITE_APP_API_URL,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_API_KEY,
  storageBucket: import.meta.env.VITE_FIREBASE_API_KEY,
  messagingSenderId: import.meta.env.VITE_FIREBASE_API_KEY,
  appId: import.meta.env.VITE_FIREBASE_API_KEY,
  measurementId: import.meta.env.VITE_FIREBASE_API_KEY,
};

export const apiConfig = {
  login: 'user/login',
  register: 'user/register',
  otp_request: 'user/otp/request',
  otp_verify: 'user/otp/verify',
  otp_status: 'user/otp/status',
  track_ip: '/user/trace_ip',
  location_reverse: 'location/reverse',
  location_search: 'location/search',
  location_place_details: 'location/place-details',
  location_geocode: 'location/geocode',
  my_shops: 'shops/my_shops',
  my_categories: 'shops/my_categories',
  register_shop: 'shops/client_register',
  shops_search: 'shops/search',
  decode_link: 'shops/link/decode',
  chat_users: 'chat/getAllUsers',
  chat_shops: 'chat/getAllShops',
  user_chats: 'chat/getAll',
  chat_create: 'chat/create',
  chat_upload: 'chat/upload',
  chat_update_read: 'chat/markAll',
  chat_delete: 'chat/delete',
  chat_unread_count: 'chat/unreadCount',

  master_categories : 'master/categories',
  master_categories_stauts: 'master/categories/status',
  master_categories_create: 'master/categories/create',
  master_categories_schema: 'master/categories/form_schema',
  master_form_templates: 'master/form_templates',
  master_categories_delete: 'master/categories',
  master_shops: 'master/shops',
  master_shops_schema: 'master/shops/form_schema',
  master_shops_max_sub_categories: 'master/shops/max_sub_categories',
  shop_update: 'shops',
  shop_delete: 'shops',

  master_sub_categories : 'master/sub_categories',
  master_sub_categories_stauts: 'master/sub_categories/status',
  master_sub_categories_create: 'master/sub_categories/create',
  master_sub_categories_delete: 'master/sub_categories',
  master_sub_categories_schema: 'master/sub_categories/form_schema',


  master_products : 'master/products',
  master_products_stauts: 'master/products/status',
  master_products_create: 'master/products/create',
  master_products_delete: 'master/products',

  // Master catalog (catalog.* schema) — platform admin only
  catalog_meta: 'catalog/meta',
  catalog_items: 'catalog/items',
  catalog_taxonomy: 'catalog/taxonomy',
  catalog_sub_category_options: 'catalog/sub-category-options',
  catalog_brands: 'catalog/brands',
  catalog_hsn: 'catalog/hsn',
  catalog_sub_category_coverage: 'catalog/sub-category-coverage',
  // Owner-facing master catalog: search the shared catalog and add an item to a shop
  catalog_search: 'catalog/search',
  catalog_import: 'catalog/import',
  // Browse the master catalog for one shop (paged; already_added = the shop's listing id) and bulk import
  catalog_browse: 'catalog/browse',
  catalog_import_bulk: 'catalog/import-bulk',

  // Platform configuration (GET is public, PUT is platform admin only)
  platform_settings: 'platform/settings',
  platform_settings_admin: 'platform/settings/admin',

  upload: 'master/upload',

  shop_details: 'shops',
  listings_by_shop: 'listings/shop',
  listings_search: 'listings/search',
  listings_create: 'listings',
  listings_bulk_create: 'listings/bulk',
  listings_update: 'listings',
  listings_delete: 'listings',
  listings_import_master: 'listings/import-master',

  orders_create: 'orders',
  orders_user: 'orders/user',
  orders_shop: 'orders/shop',
  orders_owner: 'orders/owner',
  orders_admin: 'orders/admin/all',
  orders_status: 'orders',
  orders_delivery_feed: 'orders/delivery/feed',
  orders_claim_delivery: 'orders',
  orders_switch_pickup: 'orders',

  quotes_create: 'quotes',
  quotes_user: 'quotes/user',
  quotes_shop: 'quotes/shop',
  quotes_owner: 'quotes/owner',
  quotes_admin: 'quotes/admin/all',
  quotes_status: 'quotes',

  user_profile: 'user/profile',
  user_addresses: 'user/addresses',

  notifications_vapid_key: 'notifications/vapid-key',
  notifications_subscribe: 'notifications/subscribe',
  notifications_unsubscribe: 'notifications/unsubscribe',
  notifications_list: 'notifications',
  notifications_read_all: 'notifications/read-all',
  notifications_test: 'notifications/test',
};

export const SOCKET = io(config.api_url);
