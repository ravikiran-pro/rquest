/**
 * Remember where a signed-out user was, so login can send them back.
 * Used by the cart: guests sign in on /login, then return to the page they
 * were on with the cart reopened. Storage is per tab (sessionStorage).
 */
const PATH_KEY = 'rq_return_to';
const REOPEN_CART_KEY = 'rq_reopen_cart';

const safeStorage = {
  get(key) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* private mode: fall back to no return */
    }
  },
  remove(key) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

// Only same-site paths, never the login page itself
const isSafePath = (path) =>
  typeof path === 'string' &&
  path.startsWith('/') &&
  !path.startsWith('//') &&
  !path.startsWith('/login') &&
  !path.startsWith('/register');

export const setCartReturn = (path) => {
  safeStorage.set(PATH_KEY, path);
  safeStorage.set(REOPEN_CART_KEY, '1');
};

// Read and clear the saved path (called once after a successful login)
export const takeReturnPath = () => {
  const path = safeStorage.get(PATH_KEY);
  safeStorage.remove(PATH_KEY);
  return isSafePath(path) ? path : null;
};

// True once after a return, then cleared
export const takeReopenCartFlag = () => {
  const flag = safeStorage.get(REOPEN_CART_KEY) === '1';
  safeStorage.remove(REOPEN_CART_KEY);
  return flag;
};
