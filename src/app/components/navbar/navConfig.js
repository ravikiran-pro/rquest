/**
 * Shared navigation helpers for the top navbar, the account drawer (sidebar) and the
 * phone bottom nav, so every surface agrees on who the viewer is, which menu entries a
 * role gets and which entry is "current".
 *
 * Roles come from checkUserRole (src/app/utils/helper.js):
 *   guest  - not signed in
 *   user   - customer / shopper (also the delivery portal)
 *   owner  - store owner ("client" role)
 *   admin  - platform admin
 */
import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import Routes from '../../routes/routes';
import { checkUserRole, storageKeys } from '../../utils';
import { useGlobalStore, useChatStore } from '../../services';
import { colors } from '../../styles/theme';

// Admin console sections, addressable as /admin?tab=<key>. Keys, labels and the default match
// SECTIONS in src/screens/admin/index.jsx (which also accepts the old numeric ?tab=1..4).
export const ADMIN_TABS = [
  { key: 'categories', label: 'Categories & forms' },
  { key: 'stores', label: 'Stores' },
  { key: 'orders', label: 'Orders & accounts' },
  { key: 'catalog', label: 'Master catalog' },
  { key: 'platform', label: 'Platform configuration' },
];
export const ADMIN_DEFAULT_TAB = ADMIN_TABS[0].key;
const ADMIN_LEGACY_TABS = { 1: 'categories', 2: 'stores', 3: 'orders', 4: 'catalog' };
export const adminTabPath = (key) => `${Routes.admin}?tab=${encodeURIComponent(key)}`;

// Where a signed-in role lands by default (logo, login bounce, denied routes).
// Analytics is the dashboard for owners and admins; shoppers keep the marketplace.
export const ROLE_HOME = {
  admin: Routes.analytics,
  owner: Routes.analytics,
  user: Routes.search,
  guest: Routes.search,
};

export const ROLE_META = {
  admin: { label: 'Super Admin', short: 'Admin', pill: 'role-pill role-pill-admin', avatar: colors.tertiary },
  owner: { label: 'Shop Owner', short: 'Shop Owner', pill: 'role-pill role-pill-merchant', avatar: colors.secondary },
  user: { label: 'Shopper', short: 'Shopper', pill: 'role-pill role-pill-user', avatar: colors.primary },
  guest: { label: 'Guest', short: 'Guest', pill: 'role-pill role-pill-user', avatar: colors.primary },
};

const readToken = () => {
  try {
    return sessionStorage.getItem(storageKeys.auth_token);
  } catch {
    return null;
  }
};

export const getNavRole = (userData) => {
  const signedIn = !!(userData?.user_id && readToken());
  return signedIn ? checkUserRole(userData).role : 'guest';
};

/** Viewer identity for navigation. `navRole` is 'guest' unless there is both a user and a token. */
export const useNavSession = () => {
  const user_data = useGlobalStore((state) => state.user_data);
  const navRole = getNavRole(user_data);
  return {
    user_data,
    navRole,
    isLoggedIn: navRole !== 'guest',
    isAdmin: navRole === 'admin',
    isOwner: navRole === 'owner',
    isCustomer: navRole === 'user',
    isGuest: navRole === 'guest',
    roleMeta: ROLE_META[navRole],
  };
};

/** Clears the session everywhere (store, chat badge, both token copies) and goes to /login. */
export const useSignOut = (onDone) => {
  const history = useHistory();
  const update_user_data = useGlobalStore((state) => state.update_user_data);
  return useCallback(() => {
    update_user_data({});
    const chat = useChatStore.getState();
    chat.setUnreadTotal(0);
    if (chat.isChat) chat.handleChatClose();
    try {
      sessionStorage.clear();
    } catch {
      /* storage blocked */
    }
    try {
      // netWorkCall falls back to the localStorage copy, so a stale token would outlive sign out
      localStorage.removeItem(storageKeys.auth_token);
    } catch {
      /* storage blocked */
    }
    if (onDone) onDone();
    history.push(Routes.login);
  }, [history, update_user_data, onDone]);
};

// ---------------------------------------------------------------------------
// Active-route matching (pathname + query aware)
// ---------------------------------------------------------------------------
const cleanPath = (pathname = '/') => (pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname) || '/';
const isUnder = (pathname, base) => pathname === base || pathname.startsWith(`${base}/`);
const queryParam = (location, key) => new URLSearchParams(location?.search || '').get(key);

export const getAdminTab = (location) => {
  const raw = queryParam(location, 'tab');
  const tab = ADMIN_LEGACY_TABS[raw] || raw;
  return ADMIN_TABS.some((t) => t.key === tab) ? tab : ADMIN_DEFAULT_TAB;
};

export const navMatch = {
  home: (loc) => ['/', '/home', '/landing'].includes(cleanPath(loc.pathname)),
  search: (loc) => ['/search', '/app'].includes(cleanPath(loc.pathname)),
  // Customer "Explore": home or search in items mode
  explore: (loc) => (navMatch.home(loc) || navMatch.search(loc)) && queryParam(loc, 'mode') !== 'shops',
  // Customer "Stores": search in shops mode
  shops: (loc) => (navMatch.home(loc) || navMatch.search(loc)) && queryParam(loc, 'mode') === 'shops',
  myStores: (loc) => {
    const p = cleanPath(loc.pathname);
    return isUnder(p, Routes.client) || isUnder(p, Routes.clientShop);
  },
  orders: (loc) => isUnder(cleanPath(loc.pathname), Routes.orders),
  analytics: (loc) => isUnder(cleanPath(loc.pathname), Routes.analytics),
  profile: (loc) => isUnder(cleanPath(loc.pathname), Routes.profile),
  delivery: (loc) => isUnder(cleanPath(loc.pathname), Routes.deliveryPortal),
  cart: (loc) => isUnder(cleanPath(loc.pathname), Routes.cart),
  admin: (loc) => isUnder(cleanPath(loc.pathname), Routes.admin),
  adminTab: (loc, key) => navMatch.admin(loc) && getAdminTab(loc) === key,
};

/**
 * Props for an antd <Button href> that navigates inside the SPA, while keeping a real link
 * (middle-click / ctrl-click open a new tab, valid HTML instead of <a><button/></a>).
 */
export const spaLink = (history, to, onNavigate) => ({
  href: to,
  onClick: (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    history.push(to);
    if (onNavigate) onNavigate();
  },
});
