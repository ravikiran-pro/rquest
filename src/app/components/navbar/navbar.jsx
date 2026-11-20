import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Routes from '../../routes/routes';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { netWorkCall, apiConfig } from '../../utils';
import { Avatar, Button, Badge, Tooltip, Dropdown, Flex, Grid, message } from 'antd';
import { useCartStore, useChatStore, chatSocket, requestPushPermission } from '../../services';
import { DesktopLogo, AppIcon } from '../assets';
import { colors, radii } from '../../styles/theme';
import './index.css';
import {
  UserOutlined,
  ShoppingCartOutlined,
  ShopOutlined,
  LogoutOutlined,
  OrderedListOutlined,
  DownOutlined,
  CompassOutlined,
  CarOutlined,
  SafetyCertificateOutlined,
  BellOutlined,
  SearchOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  ShoppingOutlined,
  ControlOutlined,
} from '@ant-design/icons';
import ChatIcon from '../common/ChatIcon';
import {
  useNavSession,
  useSignOut,
  navMatch,
  spaLink,
  ADMIN_TABS,
  adminTabPath,
} from './navConfig';

const ADMIN_TAB_ICONS = {
  categories: AppstoreOutlined,
  stores: ShopOutlined,
  orders: DatabaseOutlined,
  catalog: ShoppingOutlined,
  platform: ControlOutlined,
};

/**
 * Top bar. Desktop (>= 992px) shows the role's main links; from 768px the account capsule
 * opens the account menu; below 768px the avatar opens the account drawer (sidebar.jsx).
 *   guest    Explore Market, Sell with Us | cart, Login, Register
 *   customer Explore App, My Orders       | cart, bell, account menu
 *   owner    My stores, Orders & quotes   | bell, account menu (no cart)
 *   admin    Admin console, Search        | bell, account menu with each console section
 */
const Navbar = ({ open, handleOpen }) => {
  const history = useHistory();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const { user_data, navRole, isLoggedIn, isAdmin, isOwner, isCustomer, roleMeta } = useNavSession();
  const { cart, openCart } = useCartStore((state) => state);
  const { handleChatOpen, unreadTotal } = useChatStore((state) => state);

  const cartItemCount =
    cart?.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 0;
  // Shopping is for guests and customers; owners and admins have no cart
  const showCart = navRole === 'guest' || isCustomer;

  const [notificationsList, setNotificationsList] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [isPushEnabled, setIsPushEnabled] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  const loadNotifications = async () => {
    if (!user_data?.user_id) return;
    try {
      const res = await netWorkCall(apiConfig.notifications_list, 'GET', null, true);
      if (res?.success && Array.isArray(res?.data)) {
        setNotificationsList(res.data);
        setUnreadNotifCount(
          res.unreadCount !== undefined
            ? res.unreadCount
            : res.data.filter((n) => !n.is_read).length
        );
      }
    } catch (e) {
      // Ignore notification fetch error
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadNotifications();
    } else {
      setNotificationsList([]);
      setUnreadNotifCount(0);
    }
  }, [isLoggedIn, user_data?.user_id]);

  useEffect(() => {
    const unsub = chatSocket.onPushNotification(() => {
      setUnreadNotifCount((prev) => prev + 1);
      loadNotifications();
    });
    return () => unsub();
  }, [user_data?.user_id]);

  const handleEnablePush = async () => {
    const perm = await requestPushPermission(user_data);
    if (perm === 'granted') {
      setIsPushEnabled(true);
      message.success('Push notifications enabled!');
    } else if (perm === 'denied') {
      message.warning('Notification permission was blocked in browser settings.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await netWorkCall(apiConfig.notifications_read_all, 'PUT', null, true);
      setUnreadNotifCount(0);
      setNotificationsList((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      // Ignore mark all read error
    }
  };

  const signOut = useSignOut(() => {
    setNotificationsList([]);
    setUnreadNotifCount(0);
  });

  const openNotification = (item) => {
    if (item.data?.url) history.push(item.data.url);
    else if (item.type === 'order_status_change' || item.type === 'order_placed') history.push(Routes.orders);
  };

  const logoDestination = isAdmin ? Routes.admin : isOwner ? Routes.client : Routes.home;

  // ---------------------------------------------------------------------------
  // Account menu (capsule dropdown, >= 768px)
  // ---------------------------------------------------------------------------
  const go = (to) => () => history.push(to);
  const chatMenuItem = (label) => ({
    key: 'chat',
    icon: <ChatIcon />,
    label: (
      <span className="nav-menu-label">
        <span>{label}</span>
        {unreadTotal > 0 && <Badge count={unreadTotal} size="small" overflowCount={99} />}
      </span>
    ),
    onClick: () => handleChatOpen(null, null),
  });

  let roleMenuItems = [];
  const activeMenuKeys = [];
  if (isAdmin) {
    roleMenuItems = [
      {
        key: 'admin',
        icon: <SafetyCertificateOutlined />,
        label: <span style={{ fontWeight: 700 }}>Admin console</span>,
        onClick: go(Routes.admin),
      },
      {
        key: 'admin-sections',
        type: 'group',
        label: 'Console sections',
        children: ADMIN_TABS.map((tab) => {
          const TabIcon = ADMIN_TAB_ICONS[tab.key] || AppstoreOutlined;
          if (navMatch.adminTab(location, tab.key)) activeMenuKeys.push(`admin-${tab.key}`);
          return {
            key: `admin-${tab.key}`,
            icon: <TabIcon />,
            label: tab.label,
            onClick: go(adminTabPath(tab.key)),
          };
        }),
      },
      { type: 'divider' },
      { key: 'search', icon: <SearchOutlined />, label: 'Search', onClick: go(Routes.search) },
      chatMenuItem('Messages'),
      { key: 'profile', icon: <UserOutlined />, label: 'Profile', onClick: go(Routes.profile) },
    ];
    if (navMatch.search(location)) activeMenuKeys.push('search');
  } else if (isOwner) {
    roleMenuItems = [
      {
        key: 'my-stores',
        icon: <ShopOutlined />,
        label: <span style={{ fontWeight: 700 }}>My stores</span>,
        onClick: go(Routes.client),
      },
      { key: 'orders', icon: <OrderedListOutlined />, label: 'Orders & quotes', onClick: go(Routes.orders) },
      chatMenuItem('Messages'),
      { key: 'profile', icon: <UserOutlined />, label: 'Profile', onClick: go(Routes.profile) },
    ];
    if (navMatch.myStores(location)) activeMenuKeys.push('my-stores');
  } else {
    roleMenuItems = [
      { key: 'explore', icon: <CompassOutlined />, label: 'Explore Marketplace', onClick: go(Routes.app) },
      { key: 'orders', icon: <OrderedListOutlined />, label: 'My Orders & Quotes', onClick: go(Routes.orders) },
      { key: 'profile', icon: <UserOutlined />, label: 'My Profile & Addresses', onClick: go(Routes.profile) },
      {
        key: 'delivery-portal',
        icon: <CarOutlined style={{ color: colors.semantic.success }} />,
        label: <span style={{ color: colors.semantic.successHover, fontWeight: 600 }}>Delivery Portal</span>,
        onClick: go(Routes.deliveryPortal),
      },
      chatMenuItem('Direct Messages'),
    ];
    if (navMatch.search(location)) activeMenuKeys.push('explore');
    if (navMatch.delivery(location)) activeMenuKeys.push('delivery-portal');
  }
  if (navMatch.orders(location)) activeMenuKeys.push('orders');
  if (navMatch.profile(location)) activeMenuKeys.push('profile');

  const userMenuItems = [
    {
      key: 'user-header',
      disabled: true,
      className: 'nav-menu-header',
      label: (
        <div style={{ padding: '4px 0' }}>
          <div className="nav-menu-username">{user_data?.username || 'Account'}</div>
          <div style={{ marginTop: 4 }}>
            <span className={roleMeta.pill}>{roleMeta.label}</span>
          </div>
        </div>
      ),
    },
    { type: 'divider' },
    ...roleMenuItems,
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      danger: true,
      label: 'Sign out',
      onClick: signOut,
    },
  ];

  // ---------------------------------------------------------------------------
  // Desktop links (>= 992px)
  // ---------------------------------------------------------------------------
  const desktopLinks = {
    guest: [
      { key: 'explore', to: Routes.search, Icon: CompassOutlined, label: 'Explore Market', active: navMatch.search(location) },
      { key: 'sell', to: Routes.client, Icon: ShopOutlined, label: 'Sell with Us', tone: 'success' },
    ],
    user: [
      { key: 'explore', to: Routes.app, Icon: CompassOutlined, label: 'Explore App', active: navMatch.search(location) },
      { key: 'orders', to: Routes.orders, Icon: OrderedListOutlined, label: 'My Orders', active: navMatch.orders(location) },
    ],
    owner: [
      { key: 'my-stores', to: Routes.client, Icon: ShopOutlined, label: 'My stores', active: navMatch.myStores(location) },
      { key: 'orders', to: Routes.orders, Icon: OrderedListOutlined, label: 'Orders & quotes', active: navMatch.orders(location) },
    ],
    admin: [
      { key: 'admin', to: Routes.admin, Icon: SafetyCertificateOutlined, label: 'Admin console', active: navMatch.admin(location) },
      { key: 'search', to: Routes.search, Icon: SearchOutlined, label: 'Search', active: navMatch.search(location) },
    ],
  }[navRole];

  const isOrdersRoute = navMatch.orders(location);
  const isAuthRoute =
    location.pathname === Routes.login || location.pathname === Routes.register;

  if (isMobile && isAuthRoute) {
    return null;
  }

  const notificationsPanel = () => (
    <div className="nav-notif-panel">
      <div className="nav-notif-head">
        <span className="nav-notif-title">
          Notifications{' '}
          {unreadNotifCount > 0 && (
            <Badge count={unreadNotifCount} style={{ backgroundColor: colors.primary }} />
          )}
        </span>
        {unreadNotifCount > 0 && (
          <Button
            type="link"
            size="small"
            onClick={handleMarkAllRead}
            style={{ padding: 0, fontSize: 11, height: 'auto', color: colors.primary }}
          >
            Mark all read
          </Button>
        )}
      </div>

      {!isPushEnabled && (
        <div className="nav-notif-push">
          <span className="nav-notif-push-text">Receive OS & order alerts</span>
          <Button
            size="small"
            type="primary"
            onClick={handleEnablePush}
            style={{
              fontSize: 11,
              height: 24,
              padding: '0 8px',
              borderRadius: radii.sm || 6,
              background: colors.primary,
              borderColor: colors.primary,
            }}
          >
            Enable Push
          </Button>
        </div>
      )}

      <div className="nav-notif-list">
        {notificationsList.length === 0 ? (
          <div className="nav-notif-empty">No notifications yet</div>
        ) : (
          notificationsList.slice(0, 10).map((item, idx) => (
            <button
              type="button"
              key={item.id || idx}
              className={`nav-notif-item${item.is_read ? '' : ' unread'}`}
              onClick={() => openNotification(item)}
            >
              <span className="nav-notif-item-title">{item.title}</span>
              <span className="nav-notif-item-body">{item.body}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );

  const avatarMenuButton = (extraClass = '') => (
    <button
      type="button"
      className={`rq-nav-avatar-btn ${extraClass}`.trim()}
      aria-label={`Open account menu, ${user_data?.username || 'User'}`}
      aria-haspopup="dialog"
      aria-expanded={!!open}
      onClick={handleOpen}
    >
      <Avatar size={32} icon={<UserOutlined />} style={{ backgroundColor: roleMeta.avatar }} />
    </button>
  );

  if (isMobile && isOrdersRoute && isLoggedIn) {
    return (
      <header className="navBar navBar--orders">
        {/* Phone orders top app bar */}
        <div className="navbar-orders-title">
          <img src={AppIcon} alt="" className="navbar-orders-icon" />
          <div style={{ minWidth: 0 }}>
            <div className="navbar-orders-heading">{isOwner ? 'Store orders' : 'Orders'}</div>
            <div className="navbar-orders-sub">
              {isOwner ? 'Orders & quotes for your stores' : isAdmin ? 'Your orders' : 'Your Order History'}
            </div>
          </div>
        </div>

        <Flex align="center" gap={8}>
          <Dropdown trigger={['click']} placement="bottomRight" popupRender={notificationsPanel}>
            <button
              type="button"
              className="navbar-orders-bell"
              aria-label={unreadNotifCount > 0 ? `Notifications, ${unreadNotifCount} unread` : 'Notifications'}
            >
              <Badge count={unreadNotifCount} size="small" offset={[2, -2]}>
                <BellOutlined style={{ fontSize: 16, color: colors.textMain }} />
              </Badge>
            </button>
          </Dropdown>
          {avatarMenuButton()}
        </Flex>
      </header>
    );
  }

  return (
    <header className="navBar">
      {/* Brand: role home (admin console, my stores, or the marketplace) */}
      <Link to={logoDestination} className="navbar-brand" aria-label="Rquest Home">
        <img src={DesktopLogo} alt="Rquest" className="navbar-logo-desktop" />
        <img src={AppIcon} alt="Rquest" className="navbar-logo-mobile" />
      </Link>

      {/* Desktop navigation links (>= 992px) */}
      <nav className="navbar-desktop-nav" aria-label="Main navigation">
        {desktopLinks.map(({ key, to, Icon, label, active, tone }) => (
          <Button
            key={key}
            type="text"
            icon={<Icon />}
            className={`nav-item-btn${tone ? ` nav-item-btn--${tone}` : ''}${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
            {...spaLink(history, to)}
          >
            {label}
          </Button>
        ))}
      </nav>

      {/* Right actions: cart, notifications, account */}
      <Flex align="center" gap={screens.xs ? 6 : 10} className="navbar-actions">
        {showCart && (
          <Tooltip
            title={
              cartItemCount > 0
                ? `${cartItemCount} item${cartItemCount > 1 ? 's' : ''} in cart (${cart.shop_name || 'Cart'})`
                : 'Your cart is empty'
            }
          >
            <Badge
              count={cartItemCount}
              offset={[-2, 4]}
              color={colors.primary}
              size={screens.xs ? 'small' : 'default'}
            >
              <Button
                className="rq-nav-icon-btn"
                shape="circle"
                size={screens.xs ? 'middle' : 'large'}
                icon={<ShoppingCartOutlined style={{ fontSize: screens.xs ? 17 : 19 }} />}
                onClick={openCart}
                style={{
                  border: `1px solid ${colors.border}`,
                  color: cartItemCount > 0 ? colors.primary : '#64748b',
                  background: cartItemCount > 0 ? colors.primaryLight : '#ffffff',
                  boxShadow: cartItemCount > 0 ? '0 2px 8px rgba(11, 45, 107, 0.2)' : 'none',
                }}
                aria-label={cartItemCount > 0 ? `View shopping cart, ${cartItemCount} items` : 'View shopping cart'}
              />
            </Badge>
          </Tooltip>
        )}

        {isLoggedIn && (
          <Dropdown trigger={['click']} placement="bottomRight" popupRender={notificationsPanel}>
            <Badge
              count={unreadNotifCount}
              offset={[-2, 4]}
              color="#ef4444"
              size={screens.xs ? 'small' : 'default'}
            >
              <Button
                className="rq-nav-icon-btn"
                shape="circle"
                size={screens.xs ? 'middle' : 'large'}
                icon={<BellOutlined style={{ fontSize: screens.xs ? 17 : 19 }} />}
                style={{
                  border: `1px solid ${colors.border}`,
                  color: unreadNotifCount > 0 ? colors.primary : '#64748b',
                  background: unreadNotifCount > 0 ? colors.primaryLight : '#ffffff',
                }}
                aria-label={unreadNotifCount > 0 ? `Notifications, ${unreadNotifCount} unread` : 'Notifications'}
              />
            </Badge>
          </Dropdown>
        )}

        {/* Tablet and desktop (>= 768px): account capsule and menu, or sign in */}
        {!isMobile &&
          (isLoggedIn ? (
            <Dropdown
              menu={{
                items: userMenuItems,
                selectable: true,
                selectedKeys: activeMenuKeys,
                className: 'nav-account-menu',
              }}
              placement="bottomRight"
              arrow
              trigger={['click']}
            >
              <button
                type="button"
                className="navbar-user-capsule"
                aria-label={`Account menu, ${user_data?.username || 'User'}`}
              >
                <Avatar size={30} icon={<UserOutlined />} style={{ backgroundColor: roleMeta.avatar }} />
                <span className="navbar-username">{user_data?.username || 'User'}</span>
                <span className={roleMeta.pill}>{roleMeta.short}</span>
                <DownOutlined style={{ fontSize: 10, color: '#94a3b8', marginLeft: 2 }} />
              </button>
            </Dropdown>
          ) : (
            <Flex align="center" gap={8} style={{ marginLeft: 4 }}>
              <Button
                type="default"
                style={{ borderRadius: radii.md, fontWeight: 600 }}
                {...spaLink(history, Routes.login)}
              >
                Login
              </Button>
              <Button
                type="primary"
                style={{
                  borderRadius: radii.md,
                  fontWeight: 700,
                  background: colors.primary,
                  borderColor: colors.primary,
                  color: '#ffffff',
                }}
                {...spaLink(history, Routes.register)}
              >
                Register
              </Button>
            </Flex>
          ))}

        {/* Phones (< 768px): the avatar opens the account drawer with the role's full menu */}
        {isMobile && isLoggedIn && avatarMenuButton()}
      </Flex>
    </header>
  );
};

Navbar.propTypes = {
  open: PropTypes.bool,
  handleOpen: PropTypes.func,
  handleClose: PropTypes.func,
};

export default Navbar;
