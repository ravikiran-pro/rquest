import { io } from 'socket.io-client';

export const config = {
  IMAGE_CDN: import.meta.env.VITE_APP_IMAGE_CDN,
  api_url: import.meta.env.VITE_APP_API_URL,
};

export const apiConfig = {
  login: 'user/login',
  register: 'user/register',
  my_shops: 'shops/my_shops',
  register_shop: 'shops/client_register',
  shops_search: 'shops/search',
  decode_link: 'shops/link/decode',
  chat_users: 'chat/getAllUsers',
  user_chats: 'chat/getAll',
  chat_create: 'chat/create',
};

export const SOCKET = io(config.api_url);
