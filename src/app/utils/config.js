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
};

export const SOCKET = io(config.api_url);
