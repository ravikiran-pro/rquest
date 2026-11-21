const Routes = {
  home: '/',
  app: '/search',
  search: '/search',
  login: '/login',
  client: '/client_register',
  // Legacy owner deep link used by server notifications ('/client', '/client?shop_id=…');
  // redirected to /client_register with the query string kept.
  clientShop: '/client',
  chat: '/chat',
  register: '/register',
  storefront: '/shop/:shop_id',
  cart: '/cart',
  orders: '/orders',
  profile: '/profile',
  deliveryPortal: '/delivery-portal',
  analytics: '/analytics',
  admin: '/admin',
};

export default Routes;
