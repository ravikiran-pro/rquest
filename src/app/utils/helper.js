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

  const response = await fetch(`${config.api_url}/${endpoint}`, body);
  let data = await response.json();
  return data;
};

export { debounce, storageKeys, netWorkCall };
