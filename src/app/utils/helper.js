import { config } from './config';

const debounce = (func, delay) => {
  let timer;
  return function (...args) {
    const context = this;
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(context, args), delay);
  };
};

const storageKeys = {
  auth_token: 'auth_token',
  user_data: 'user_data',
};

const netWorkCall = async (endpoint, method, payload, isAuth = false) => {
  let body = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: payload,
  };

  if (isAuth) {
    body.headers.Authorization = `Bearer ${sessionStorage.getItem(
      storageKeys.auth_token
    )}`;
  }

  const response = await fetch(`${config.api_url}/api/v1/${endpoint}`, body);
  let data = await response.json();
  return data;
};

const distanceConvertor = (distance) =>
  parseFloat((distance / 1000).toFixed(2));

const getColorByName = (username) => {
  // Simple hash function to generate a number from the username
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert the hash to a 6-digit hexadecimal color code
  const color = ((hash & 0x00ffffff) | 0x400000).toString(16);

  return `#${color}`;
};

const USER_ROLES = {
  USER: 'c0f93a2f-16c9-49cf-b47b-e0c0a38a5a4d',
  MERCHANT: 'a5e858d8-636c-4fc3-8c3a-0a76131c95e5',
};

const checkUserRole = (userData) => {
  if (!userData || !userData.user_id) {
    return { isMerchant: false, isUser: false, isAdmin: false, role: 'guest' };
  }
  const roleId = userData.role_id;
  const roleName = (userData.role || userData.role_name || '').toLowerCase();
  const isMerchant =
    roleId === USER_ROLES.MERCHANT ||
    roleName === 'client' ||
    roleName === 'merchant' ||
    roleName === 'owner';
  const isUser = !isMerchant;
  return {
    isMerchant,
    isUser,
    isAdmin: false,
    role: isMerchant ? 'owner' : 'user',
  };
};

const getLocationName = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
    );

    const data = await response.json();
    const address = data.address;

    return (
      address.suburb ||
      address.neighbourhood ||
      address.city_district ||
      address.town ||
      address.city ||
      address.village ||
      data.display_name
    );
  } catch (error) {
    console.error('Failed to get location name:', error);
    return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  }
};

export {
  debounce,
  storageKeys,
  netWorkCall,
  distanceConvertor,
  getColorByName,
  USER_ROLES,
  checkUserRole,
  getLocationName
};
