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
  track_ip: '/user/trace_ip',
  my_shops: 'shops/my_shops',
  my_categories: 'shops/my_categories',
  register_shop: 'shops/client_register',
  shops_search: 'shops/search',
  decode_link: 'shops/link/decode',
  chat_users: 'chat/getAllUsers',
  chat_shops: 'chat/getAllShops',
  user_chats: 'chat/getAll',
  chat_create: 'chat/create',
  chat_update_read: 'chat/markAll',

  master_categories : 'master/categories',
  master_categories_stauts: 'master/categories/status',
  master_categories_create: 'master/categories/create',
  master_categories_delete: 'master/categories',

  master_sub_categories : 'master/sub_categories',
  master_sub_categories_stauts: 'master/sub_categories/status',
  master_sub_categories_create: 'master/sub_categories/create',
  master_sub_categories_delete: 'master/sub_categories',


  master_products : 'master/products',
  master_products_stauts: 'master/products/status',
  master_products_create: 'master/products/create',
  master_products_delete: 'master/products',

  upload: 'master/upload'
};

export const SOCKET = io(config.api_url);
