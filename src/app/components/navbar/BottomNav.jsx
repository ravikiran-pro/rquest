import React from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { Badge } from 'antd';
import {
  CompassOutlined,
  ShopOutlined,
  OrderedListOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import ChatIcon from '../common/ChatIcon';
import { useChatStore, useCartStore } from '../../services';
import Routes from '../../routes/routes';
import { useNavSession, navMatch } from './navConfig';
import './index.css';

/**
 * Fixed bottom navigation for phones and tablets (<= 991px). Items per role:
 *   guest    Explore, Stores, Cart, Sign In
 *   customer Explore, Stores, Chat, Orders, Account
 *   owner    My stores, Orders, Chat, Account
 *   admin    Console, Search, Chat, Account
 * The rest of each role's menu (admin sections, delivery portal, sign out) is in the account
 * drawer opened from the header avatar.
 */
const BottomNav = () => {
  const history = useHistory();
  const location = useLocation();

  const { navRole } = useNavSession();
  const { handleChatOpen, unreadTotal } = useChatStore((state) => state);
  const { cart, openCart } = useCartStore((state) => state);

  const cartItemCount =
    cart?.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 0;

  if (location.pathname === Routes.login || location.pathname === Routes.register) {
    return null;
  }

  const go = (to) => () => history.push(to);

  const chatItem = {
    key: 'chat',
    label: 'Chat',
    Icon: ChatIcon,
    badge: unreadTotal,
    ariaLabel: unreadTotal > 0 ? `Chat, ${unreadTotal} unread` : 'Chat',
    onClick: () => handleChatOpen(null, null),
  };
  const accountItem = {
    key: 'account',
    label: 'Account',
    Icon: UserOutlined,
    active: navMatch.profile(location),
    onClick: go(Routes.profile),
  };
  const isHome = navMatch.home(location) && !navMatch.shops(location);
  const exploreItem = {
    key: 'explore',
    label: 'Explore',
    Icon: CompassOutlined,
    active: navMatch.explore(location),
    // Already on the home feed: jump back to the top instead of re-navigating
    onClick: () => (isHome ? window.scrollTo({ top: 0, behavior: 'smooth' }) : history.push(Routes.home)),
  };
  const storesItem = {
    key: 'stores',
    label: 'Stores',
    Icon: ShopOutlined,
    active: navMatch.shops(location),
    onClick: go(`${Routes.search}?mode=shops`),
  };

  let items;
  switch (navRole) {
    case 'admin':
      items = [
        {
          key: 'console',
          label: 'Console',
          Icon: SafetyCertificateOutlined,
          ariaLabel: 'Admin console',
          active: navMatch.admin(location),
          onClick: go(Routes.admin),
        },
        {
          key: 'search',
          label: 'Search',
          Icon: SearchOutlined,
          active: navMatch.search(location),
          onClick: go(Routes.search),
        },
        chatItem,
        accountItem,
      ];
      break;
    case 'owner':
      items = [
        {
          key: 'my-stores',
          label: 'My stores',
          Icon: ShopOutlined,
          active: navMatch.myStores(location),
          onClick: go(Routes.client),
        },
        {
          key: 'orders',
          label: 'Orders',
          Icon: OrderedListOutlined,
          ariaLabel: 'Orders and quotes',
          active: navMatch.orders(location),
          onClick: go(Routes.orders),
        },
        chatItem,
        accountItem,
      ];
      break;
    case 'user':
      items = [
        exploreItem,
        storesItem,
        chatItem,
        {
          key: 'orders',
          label: 'Orders',
          Icon: OrderedListOutlined,
          active: navMatch.orders(location),
          onClick: go(Routes.orders),
        },
        accountItem,
      ];
      break;
    default:
      items = [
        exploreItem,
        storesItem,
        {
          key: 'cart',
          label: 'Cart',
          Icon: ShoppingCartOutlined,
          badge: cartItemCount,
          ariaLabel: cartItemCount > 0 ? `Cart, ${cartItemCount} items` : 'Cart',
          onClick: () => openCart(),
        },
        {
          key: 'sign-in',
          label: 'Sign In',
          Icon: UserOutlined,
          onClick: go(Routes.login),
        },
      ];
  }

  return (
    <nav className="mobile-bottom-nav" aria-label="Main navigation">
      {items.map(({ key, label, Icon, badge, ariaLabel, active, onClick }) => (
        <button
          key={key}
          type="button"
          className={`mobile-nav-item${active ? ' active' : ''}`}
          aria-current={active ? 'page' : undefined}
          aria-label={ariaLabel}
          onClick={onClick}
        >
          <span className="mobile-nav-icon-wrap" aria-hidden="true">
            {badge ? (
              <Badge count={badge} size="small" overflowCount={99} offset={[6, -2]}>
                <Icon className="mobile-nav-icon" />
              </Badge>
            ) : (
              <Icon className="mobile-nav-icon" />
            )}
          </span>
          <span className="mobile-nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
