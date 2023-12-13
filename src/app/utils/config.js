export const config = {
  IMAGE_CDN: import.meta.env.VITE_APP_IMAGE_CDN,
  api_url: import.meta.env.VITE_APP_API_URL,
};

export const apiConfig = {
  my_shops: 'shops/my_shops',
  register_shop: 'shops/client_register',
  login: 'user/login',
  register: 'user/register',
};
