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
  if (endpoint == '/user/trace_ip') debugger;
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

export {
  debounce,
  storageKeys,
  netWorkCall,
  distanceConvertor,
  getColorByName,
};
