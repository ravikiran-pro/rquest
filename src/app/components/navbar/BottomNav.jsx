import React from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { Badge } from 'antd';
import {
  CompassOutlined,
  ShopOutlined,
  MessageOutlined,
  OrderedListOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useGlobalStore, useChatStore, useCartStore } from '../../services';
import Routes from '../../routes/routes';
import { storageKeys, checkUserRole } from '../../utils';
import './index.css';

const BottomNav = () => {
  const history = useHistory();
  const location = useLocation();

  const { user_data } = useGlobalStore((state) => state);
  const { handleChatOpen, unreadTotal } = useChatStore((state) => state);
  const { cart, openCart } = useCartStore((state) => state);

  const isLoggedIn = !!(
    user_data?.user_id && sessionStorage?.[storageKeys.auth_token]
  );
  const { isMerchant } = checkUserRole(user_data);
  const cartItemCount =
    cart?.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 0;

  const currentPath = location.pathname;
  const isAuthRoute =
    currentPath === Routes.login || currentPath === Routes.register;

  if (isAuthRoute) {
    return null;
  }

  const isHome =
    currentPath === Routes.home ||
    currentPath === '/app' ||
    currentPath === '/home';
  const isShopsMode =
    isHome && new URLSearchParams(location.search).get('mode') === 'shops';
  const isExplore = isHome && !isShopsMode;
  const isMerchantStores =
    currentPath === Routes.client || currentPath === Routes.clientShop;
  const isOrders = currentPath === Routes.orders;
  const isProfile = currentPath === Routes.profile;

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      {/* 1. Explore / Home */}
      <button
        type="button"
        className={`mobile-nav-item ${isExplore ? 'active' : ''}`}
        onClick={() => {
          if (isExplore) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            history.push(Routes.home);
          }
        }}
      >
        <CompassOutlined className="mobile-nav-icon" />
        <span className="mobile-nav-label">Explore</span>
      </button>

      {/* 2. Stores / Outlets (or Merchant Portal for store owners) */}
      <button
        type="button"
        className={`mobile-nav-item ${
          isLoggedIn && isMerchant
            ? isMerchantStores
              ? 'active'
              : ''
            : isShopsMode
            ? 'active'
            : ''
        }`}
        onClick={() => {
          history.push(
            isLoggedIn && isMerchant ? Routes.client : `${Routes.home}?mode=shops`
          );
        }}
      >
        <ShopOutlined className="mobile-nav-icon" />
        <span className="mobile-nav-label">
          {isLoggedIn && isMerchant ? 'My Stores' : 'Stores'}
        </span>
      </button>

      {isLoggedIn ? (
        <>
          {/* 3. Direct Chat (Logged in only) */}
          <button
            type="button"
            className="mobile-nav-item"
            onClick={() => {
              handleChatOpen(null, null);
            }}
          >
            <Badge count={unreadTotal} size="small" offset={[4, -2]}>
              <MessageOutlined className="mobile-nav-icon" />
            </Badge>
            <span className="mobile-nav-label">Chat</span>
          </button>

          {/* 4. Orders (Logged in only) */}
          <button
            type="button"
            className={`mobile-nav-item ${isOrders ? 'active' : ''}`}
            onClick={() => {
              history.push(Routes.orders);
            }}
          >
            <OrderedListOutlined className="mobile-nav-icon" />
            <span className="mobile-nav-label">Orders</span>
          </button>

          {/* 5. Account */}
          <button
            type="button"
            className={`mobile-nav-item ${isProfile ? 'active' : ''}`}
            onClick={() => {
              history.push(Routes.profile);
            }}
          >
            <UserOutlined className="mobile-nav-icon" />
            <span className="mobile-nav-label">Account</span>
          </button>
        </>
      ) : (
        <>
          {/* 3. Cart (Guests) */}
          <button
            type="button"
            className="mobile-nav-item"
            onClick={() => {
              openCart();
            }}
          >
            <Badge count={cartItemCount} size="small" offset={[4, -2]}>
              <ShoppingCartOutlined className="mobile-nav-icon" />
            </Badge>
            <span className="mobile-nav-label">Cart</span>
          </button>

          {/* 4. Sign In (Guests) */}
          <button
            type="button"
            className="mobile-nav-item"
            onClick={() => {
              history.push(Routes.login);
            }}
          >
            <UserOutlined className="mobile-nav-icon" />
            <span className="mobile-nav-label">Sign In</span>
          </button>
        </>
      )}
    </nav>
  );
};

export default BottomNav;

