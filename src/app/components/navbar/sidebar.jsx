import React from 'react';
import PropTypes from 'prop-types';
import Routes from '../../routes/routes';
import { Button, Avatar, Divider, Drawer, Badge, Flex, Typography, Grid } from 'antd';
import { useCartStore, useChatStore } from '../../services';
import { useHistory, useLocation } from 'react-router-dom';
import { AppIcon } from '../assets';
import { colors, radii } from '../../styles/theme';
import './index.css';
import {
  CloseOutlined,
  OrderedListOutlined,
  ShopOutlined,
  UserOutlined,
  LogoutOutlined,
  LoginOutlined,
  UserAddOutlined,
  ShoppingCartOutlined,
  RightOutlined,
  CompassOutlined,
  CarOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  ShoppingOutlined,
  ControlOutlined,
} from '@ant-design/icons';import ChatIcon from '../common/ChatIcon';
import { useNavSession, useSignOut, navMatch, ADMIN_TABS, adminTabPath } from './navConfig';

const { Text } = Typography;

const ADMIN_TAB_ICONS = {
  categories: AppstoreOutlined,
  stores: ShopOutlined,
  orders: DatabaseOutlined,
  catalog: ShoppingOutlined,
  platform: ControlOutlined,
};

const Chevron = () => <RightOutlined className="drawer-nav-chevron" aria-hidden="true" />;

/**
 * Account drawer (opened from the header avatar on phones). Same options per role as the
 * desktop account menu:
 *   guest    Explore, Cart, Sell on Rquest, Sign in / Register
 *   customer Explore, Cart, Orders, Profile, Delivery portal, Messages, Sign out
 *   owner    My stores, Orders & quotes, Messages, Profile, Sign out
 *   admin    Admin console (+ each section), Search, Messages, Profile, Sign out
 */
const SideBar = ({ open, handleClose }) => {
  const history = useHistory();
  const location = useLocation();
  const screens = Grid.useBreakpoint();

  const { user_data, navRole, isLoggedIn, roleMeta } = useNavSession();
  const { cart, openCart } = useCartStore((state) => state);
  const { handleChatOpen, unreadTotal } = useChatStore((state) => state);
  const signOut = useSignOut(handleClose);

  const cartItemCount =
    cart?.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 0;

  const isMobile = !screens.md;
  const isAuthRoute =
    location.pathname === Routes.login || location.pathname === Routes.register;

  const handleNavigate = (path) => {
    history.push(path);
    handleClose();
  };

  if (isMobile && isAuthRoute) {
    return null;
  }

  const go = (to) => () => handleNavigate(to);

  const cartItem = {
    key: 'cart',
    Icon: ShoppingCartOutlined,
    label: 'My Shopping Cart',
    active: navMatch.cart(location),
    onClick: () => {
      handleClose();
      openCart();
    },
    trailing:
      cartItemCount > 0 ? (
        <Badge
          count={`${cartItemCount} item${cartItemCount > 1 ? 's' : ''}`}
          style={{ backgroundColor: colors.primary, fontWeight: 700, fontSize: 11 }}
        />
      ) : (
        <span className="drawer-nav-meta">Empty</span>
      ),
  };

  const chatItem = (label) => ({
    key: 'chat',
    Icon: ChatIcon,
    label,
    onClick: () => {
      handleClose();
      handleChatOpen(null, null);
    },
    trailing: unreadTotal > 0 ? <Badge count={unreadTotal} size="small" overflowCount={99} /> : <Chevron />,
  });

  const exploreItem = {
    key: 'explore',
    Icon: CompassOutlined,
    label: 'Explore Market',
    active: navMatch.home(location),
    onClick: go(Routes.home),
  };

  let items;
  switch (navRole) {
    case 'admin':
      items = [
        {
          key: 'dashboard',
          Icon: DatabaseOutlined,
          label: 'Dashboard',
          tone: 'brand',
          active: navMatch.dashboard(location),
          onClick: go(Routes.dashboard),
          trailing: <span className="drawer-nav-pill">Dashboard</span>,
        },
        {
          key: 'admin',
          Icon: SafetyCertificateOutlined,
          label: 'Admin console',
          tone: 'brand',
          parentActive: navMatch.admin(location),
          onClick: go(Routes.admin),
          trailing: <span className="drawer-nav-pill">Admin</span>,
        },
        ...ADMIN_TABS.map((tab) => ({
          key: `admin-${tab.key}`,
          Icon: ADMIN_TAB_ICONS[tab.key] || AppstoreOutlined,
          label: tab.label,
          sub: true,
          active: navMatch.adminTab(location, tab.key),
          onClick: go(adminTabPath(tab.key)),
        })),
        {
          key: 'search',
          Icon: SearchOutlined,
          label: 'Search',
          active: navMatch.search(location),
          onClick: go(Routes.search),
          trailing: <Chevron />,
        },
        chatItem('Messages'),
        {
          key: 'profile',
          Icon: UserOutlined,
          label: 'Profile',
          active: navMatch.profile(location),
          onClick: go(Routes.profile),
          trailing: <Chevron />,
        },
      ];
      break;
    case 'owner':
      items = [
        {
          key: 'dashboard',
          Icon: DatabaseOutlined,
          label: 'Dashboard',
          tone: 'brand',
          active: navMatch.dashboard(location),
          onClick: go(Routes.dashboard),
          trailing: <span className="drawer-nav-pill">Dashboard</span>,
        },
        {
          key: 'my-stores',
          Icon: ShopOutlined,
          label: 'My stores',
          tone: 'brand',
          active: navMatch.myStores(location),
          onClick: go(Routes.client),
          trailing: <span className="drawer-nav-pill">Manage</span>,
        },
        {
          key: 'orders',
          Icon: OrderedListOutlined,
          label: 'Orders & quotes',
          active: navMatch.orders(location),
          onClick: go(Routes.orders),
          trailing: <Chevron />,
        },
        chatItem('Messages'),
        {
          key: 'profile',
          Icon: UserOutlined,
          label: 'Profile',
          active: navMatch.profile(location),
          onClick: go(Routes.profile),
          trailing: <Chevron />,
        },
      ];
      break;
    case 'user':
      items = [
        exploreItem,
        cartItem,
        {
          key: 'orders',
          Icon: OrderedListOutlined,
          label: 'My Orders & Quotes',
          active: navMatch.orders(location),
          onClick: go(Routes.orders),
          trailing: <Chevron />,
        },
        {
          key: 'profile',
          Icon: UserOutlined,
          label: 'My Profile & Addresses',
          active: navMatch.profile(location),
          onClick: go(Routes.profile),
          trailing: <Chevron />,
        },
        {
          key: 'delivery',
          Icon: CarOutlined,
          label: 'Delivery Portal',
          tone: 'success',
          active: navMatch.delivery(location),
          onClick: go(Routes.deliveryPortal),
          trailing: <Chevron />,
        },
        chatItem('Direct Chat / Messages'),
      ];
      break;
    default:
      items = [
        exploreItem,
        cartItem,
        {
          key: 'sell',
          Icon: ShopOutlined,
          label: 'Sell on Rquest',
          tone: 'success',
          onClick: go(Routes.client),
          trailing: <Chevron />,
        },
      ];
  }

  return (
    <Drawer
      rootClassName="sidebar-root"
      placement="right"
      onClose={handleClose}
      open={open}
      width="min(340px, 88vw)"
      closable={false}
    >
      {/* Brand and close */}
      <Flex justify="space-between" align="center" className="drawer-brand">
        <Flex align="center" gap={10} style={{ minWidth: 0 }}>
          <img src={AppIcon} alt="" className="drawer-brand-icon" />
          <div style={{ minWidth: 0 }}>
            <div className="drawer-brand-title">Rquest Direct</div>
            <div className="drawer-brand-sub">Hyper-Local Marketplace</div>
          </div>
        </Flex>
        <Button
          type="text"
          shape="circle"
          className="drawer-close-btn"
          aria-label="Close menu"
          icon={<CloseOutlined style={{ fontSize: 16 }} />}
          onClick={handleClose}
        />
      </Flex>

      {isLoggedIn ? (
        <div className="drawer-user-card">
          <Flex align="center" gap={10}>
            <Avatar
              size={42}
              icon={<UserOutlined />}
              style={{ backgroundColor: roleMeta.avatar, flexShrink: 0 }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="drawer-user-name">{user_data?.username || 'User'}</div>
              <div style={{ marginTop: 3 }}>
                <span className={roleMeta.pill}>{roleMeta.label}</span>
              </div>
            </div>
          </Flex>
        </div>
      ) : (
        <div className="drawer-user-card drawer-user-card--guest">
          <div className="drawer-user-name" style={{ marginBottom: 2 }}>
            Welcome to Rquest
          </div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
            Sign in to track orders, neighbourhood sellers and deals.
          </Text>
          <Flex gap={8}>
            <Button
              type="primary"
              icon={<LoginOutlined />}
              block
              style={{
                borderRadius: radii.md,
                fontWeight: 700,
                height: 40,
                background: colors.primary,
                borderColor: colors.primary,
              }}
              onClick={go(Routes.login)}
            >
              Sign In
            </Button>
            <Button
              block
              icon={<UserAddOutlined />}
              style={{ borderRadius: radii.md, fontWeight: 600, height: 40 }}
              onClick={go(Routes.register)}
            >
              Register
            </Button>
          </Flex>
        </div>
      )}

      <nav className="drawer-nav" aria-label="Account menu">
        {items.map(({ key, Icon, label, tone, sub, active, parentActive, onClick, trailing }) => (
          <Button
            key={key}
            type="text"
            icon={<Icon className="drawer-nav-icon" />}
            className={[
              'drawer-nav-item',
              sub ? 'drawer-nav-item--sub' : '',
              tone ? `drawer-nav-item--${tone}` : '',
              active ? 'active' : '',
              parentActive ? 'active-parent' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-current={active ? 'page' : undefined}
            onClick={onClick}
          >
            <span className="drawer-nav-label">{label}</span>
            {trailing}
          </Button>
        ))}
      </nav>

      <div className="drawer-footer">
        <Divider style={{ margin: '8px 0 12px 0' }} />
        {isLoggedIn ? (
          <Button
            type="text"
            danger
            block
            icon={<LogoutOutlined />}
            className="drawer-signout-btn"
            onClick={signOut}
          >
            <span className="drawer-nav-label">
              Sign out
              <span className="drawer-signout-user"> ({user_data?.username || 'User'})</span>
            </span>
          </Button>
        ) : (
          <div style={{ textAlign: 'center', padding: '4px 0' }}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Rquest Neighbourhood • Direct Local Stores • v1.0.8
            </Text>
          </div>
        )}
      </div>
    </Drawer>
  );
};

SideBar.propTypes = {
  open: PropTypes.bool,
  handleClose: PropTypes.func,
};

export default SideBar;
