import React from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { Badge } from 'antd';
import {
  CompassOutlined,
  ShopOutlined,
  MessageOutlined,
  OrderedListOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useGlobalStore, useChatStore, useCartStore } from '../../services';
import Routes from '../../routes/routes';
import { storageKeys } from '../../utils';
import './index.css';

const BottomNav = () => {
  const history = useHistory();
  const location = useLocation();

  const { user_data } = useGlobalStore((state) => state);
  const { handleChatOpen, unreadTotal } = useChatStore((state) => state);
  const { cart } = useCartStore((state) => state);

  const isLoggedIn = !!(
    user_data?.user_id && sessionStorage?.[storageKeys.auth_token]
  );

  const currentPath = location.pathname;
  const isHome = currentPath === Routes.home || currentPath === '/app' || currentPath === '/home';
  const isOrders = currentPath === Routes.orders;
  const isProfile = currentPath === Routes.profile;

  const cartItemCount =
    cart?.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 0;

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      {/* 1. Explore / Home */}
      <button
        type="button"
        className={`mobile-nav-item ${isHome ? 'active' : ''}`}
        onClick={() => {
          if (isHome) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            history.push(Routes.home);
          }
        }}
      >
        <CompassOutlined className="mobile-nav-icon" />
        <span className="mobile-nav-label">Explore</span>
      </button>

      {/* 2. Stores / Outlets */}
      <button
        type="button"
        className="mobile-nav-item"
        onClick={() => {
          history.push(`${Routes.home}?mode=shops`);
        }}
      >
        <ShopOutlined className="mobile-nav-icon" />
        <span className="mobile-nav-label">Stores</span>
      </button>

      {/* 3. Direct Chat */}
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

      {/* 4. Orders */}
      <button
        type="button"
        className={`mobile-nav-item ${isOrders ? 'active' : ''}`}
        onClick={() => {
          history.push(isLoggedIn ? Routes.orders : Routes.login);
        }}
      >
        <Badge count={cartItemCount} size="small" offset={[4, -2]}>
          <OrderedListOutlined className="mobile-nav-icon" />
        </Badge>
        <span className="mobile-nav-label">Orders</span>
      </button>

      {/* 5. Profile / Account */}
      <button
        type="button"
        className={`mobile-nav-item ${isProfile ? 'active' : ''}`}
        onClick={() => {
          history.push(isLoggedIn ? Routes.profile : Routes.login);
        }}
      >
        <UserOutlined className="mobile-nav-icon" />
        <span className="mobile-nav-label">{isLoggedIn ? 'Account' : 'Sign In'}</span>
      </button>
    </nav>
  );
};

export default BottomNav;

