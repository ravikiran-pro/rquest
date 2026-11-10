import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Routes from '../../routes/routes';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { storageKeys, checkUserRole, netWorkCall, apiConfig } from '../../utils';
import {
  Avatar,
  Button,
  Badge,
  Tooltip,
  Dropdown,
  Flex,
  Grid,
  message,
} from 'antd';
import {
  useGlobalStore,
  useCartStore,
  useChatStore,
  chatSocket,
  requestPushPermission,
} from '../../services';
import { DesktopLogo, AppIcon } from '../assets';
import { colors, radii } from '../../styles/theme';
import './index.css';
import {
  MenuOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  ShopOutlined,
  LogoutOutlined,
  OrderedListOutlined,
  DownOutlined,
  MessageOutlined,
  CompassOutlined,
  CarOutlined,
  SafetyCertificateOutlined,
  BellOutlined,
} from '@ant-design/icons';

const Navbar = ({ open, handleOpen, handleClose }) => {
  const history = useHistory();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const { user_data, update_user_data } = useGlobalStore((state) => state);
  const { cart, openCart } = useCartStore((state) => state);
  const { handleChatOpen, unreadTotal } = useChatStore((state) => state);

  const cartItemCount =
    cart?.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 0;

  const { isAdmin, isMerchant } = checkUserRole(user_data);
  const isLoggedIn = !!(
    user_data?.user_id && sessionStorage?.[storageKeys.auth_token]
  );

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

  const logout = () => {
    update_user_data({});
    useChatStore.getState().setUnreadTotal(0);
    setNotificationsList([]);
    setUnreadNotifCount(0);
    sessionStorage.clear();
    history.push(Routes.login);
  };

  const currentPath = location.pathname;

  const logoDestination = !isLoggedIn
    ? Routes.home
    : isAdmin
    ? Routes.admin
    : isMerchant
    ? Routes.client
    : Routes.home;

  // Dropdown items for desktop user profile capsule
  const userMenuItems = [
    {
      key: 'user-header',
      disabled: true,
      label: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>
            {user_data?.username || 'Account'}
          </div>
          <div style={{ marginTop: 4 }}>
            {isAdmin ? (
              <span
                className="role-pill role-pill-admin"
                style={{
                  background: '#fee2e2',
                  color: '#b91c1c',
                  border: '1px solid #fecaca',
                  fontWeight: 700,
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 6,
                }}
              >
                Super Admin
              </span>
            ) : isMerchant ? (
              <span className="role-pill role-pill-merchant">Shop Owner</span>
            ) : (
              <span className="role-pill role-pill-user">Customer</span>
            )}
          </div>
        </div>
      ),
    },
    { type: 'divider' },
    ...(isMerchant
      ? [
          {
            key: 'merchant',
            icon: <ShopOutlined style={{ color: colors.primary }} />,
            label: (
              <span style={{ color: colors.primary, fontWeight: 700 }}>
                Merchant Studio
              </span>
            ),
            onClick: () => history.push(Routes.client),
          },
          {
            key: 'orders',
            icon: <OrderedListOutlined />,
            label: 'Store Orders & Quotes',
            onClick: () => history.push(Routes.orders),
          },
        ]
      : [
          {
            key: 'explore',
            icon: <CompassOutlined />,
            label: 'Explore Marketplace',
            onClick: () => history.push(Routes.app),
          },
          {
            key: 'orders',
            icon: <OrderedListOutlined />,
            label: 'My Orders & Quotes',
            onClick: () => history.push(Routes.orders),
          },
        ]),
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: isMerchant ? 'Store & Profile Details' : 'My Profile & Addresses',
      onClick: () => history.push(Routes.profile),
    },
    ...(!isMerchant
      ? [
          {
            key: 'delivery-portal',
            icon: <CarOutlined style={{ color: '#10b981' }} />,
            label: (
              <span style={{ color: '#047857', fontWeight: 600 }}>
                Delivery Portal
              </span>
            ),
            onClick: () => history.push(Routes.deliveryPortal),
          },
        ]
      : []),
    {
      key: 'chat',
      icon: <MessageOutlined />,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span>Direct Messages</span>
          {unreadTotal > 0 && <Badge count={unreadTotal} size="small" />}
        </span>
      ),
      onClick: () => handleChatOpen(null, null),
    },
    ...(isMerchant
      ? [
          {
            key: 'explore-shopper-view',
            icon: <CompassOutlined style={{ color: '#64748b' }} />,
            label: (
              <span style={{ color: '#64748b', fontSize: 13 }}>
                Preview Marketplace (Shopper View)
              </span>
            ),
            onClick: () => history.push(Routes.app),
          },
        ]
      : []),
    ...(isAdmin || user_data?.role_id === 'd5e858d8-636c-4fc3-8c3a-0a76131c95e9' || user_data?.username === 'admin' || user_data?.username === 'root'
      ? [
          {
            key: 'admin-console',
            icon: <SafetyCertificateOutlined style={{ color: colors.cobalt }} />,
            label: (
              <span style={{ color: colors.cobalt, fontWeight: 700 }}>
                Platform Admin Console
              </span>
            ),
            onClick: () => history.push(Routes.admin),
          },
        ]
      : []),
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      danger: true,
      label: 'Log Out',
      onClick: logout,
    },
  ];

  const isOrdersRoute = currentPath === Routes.orders;
  const isAuthRoute =
    currentPath === Routes.login || currentPath === Routes.register;

  if (isMobile && isAuthRoute) {
    return null;
  }

  if (isMobile && isOrdersRoute) {
    return (
      <header
        className="navBar"
        style={{
          backgroundColor: '#F8F4EF',
          borderBottom: 'none',
          boxShadow: 'none',
          padding: '0 16px',
          height: 60,
        }}
      >
        {/* Mobile Orders Top App Bar matching Stitch visual design */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src={AppIcon}
            alt="Rquest"
            style={{ width: 34, height: 34, borderRadius: 10, objectFit: 'contain' }}
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#0B2D6B', lineHeight: 1.2 }}>
              Orders
            </div>
            <div style={{ fontSize: 11, color: '#667085', fontWeight: 500, lineHeight: 1.2 }}>
              Your Order History
            </div>
          </div>
        </div>

        <Flex align="center" gap={10}>
          {/* Circular Bell Notification Action */}
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            dropdownRender={() => (
              <div
                style={{
                  width: 320,
                  maxWidth: '90vw',
                  background: '#ffffff',
                  borderRadius: 12,
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 13, color: colors.text }}>
                    Notifications {unreadNotifCount > 0 && <Badge count={unreadNotifCount} style={{ backgroundColor: colors.primary }} />}
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
                {notificationsList.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                    No new notifications
                  </div>
                ) : (
                  <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                    {notificationsList.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid #f8fafc',
                          fontSize: 12,
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.title}</div>
                        <div style={{ color: '#64748b', fontSize: 11 }}>{item.body}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          >
            <div
              role="button"
              tabIndex={0}
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#ffffff',
                border: '1px solid #ECE7DF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <Badge count={unreadNotifCount} size="small" offset={[2, -2]}>
                <BellOutlined style={{ fontSize: 16, color: '#1D2939' }} />
              </Badge>
            </div>
          </Dropdown>

          {/* Circular User Avatar Trigger */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => (open ? handleClose() : handleOpen())}
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: '#0B2D6B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ffffff',
            }}
          >
            <UserOutlined style={{ fontSize: 16 }} />
          </div>
        </Flex>
      </header>
    );
  }

  return (
    <header className="navBar">
      {/* Brand Logo - Navigates dynamically based on role (Desktop Logo on desktop, App Icon on mobile) */}
      <Link to={logoDestination} className="navbar-brand" aria-label="Rquest Home">
        <img
          src={DesktopLogo}
          alt="Rquest"
          className="navbar-logo-desktop"
        />
        <img
          src={AppIcon}
          alt="Rquest"
          className="navbar-logo-mobile"
        />
      </Link>

      {/* Desktop Navigation Links (≥ 992px) */}
      <nav className="navbar-desktop-nav">
        {/* Guest: Show Explore Market, Sell with Us */}
        {!isLoggedIn && (
          <>
            <Link to={Routes.home}>
              <Button
                type="text"
                icon={<CompassOutlined />}
                className={`nav-item-btn ${currentPath === Routes.home || currentPath === '/app' || currentPath === '/home' ? 'active' : ''}`}
              >
                Explore Market
              </Button>
            </Link>

            <Link to={Routes.client}>
              <Button
                type="text"
                icon={<ShopOutlined />}
                className="nav-item-btn"
                style={{ color: '#059669' }}
              >
                Sell with Us
              </Button>
            </Link>
          </>
        )}

        {/* Customer Logged In: Show Explore App, My Orders (Home and Seller links hidden) */}
        {isLoggedIn && !isMerchant && (
          <>
            <Link to={Routes.app}>
              <Button
                type="text"
                icon={<CompassOutlined />}
                className={`nav-item-btn ${currentPath === Routes.app || currentPath === '/home' ? 'active' : ''}`}
              >
                Explore App
              </Button>
            </Link>

            <Link to={Routes.orders}>
              <Button
                type="text"
                icon={<OrderedListOutlined />}
                className={`nav-item-btn ${currentPath === Routes.orders ? 'active' : ''}`}
              >
                My Orders
              </Button>
            </Link>
          </>
        )}

        {/* Merchant Logged In: Show Merchant Studio, Store Orders (Home and Buyer explore hidden) */}
        {isLoggedIn && isMerchant && (
          <>
            <Link to={Routes.client}>
              <Button
                type="text"
                icon={<ShopOutlined />}
                className={`nav-item-btn ${currentPath.startsWith('/client') ? 'active' : ''}`}
                style={{ color: colors.primary, fontWeight: 700 }}
              >
                Merchant Studio
              </Button>
            </Link>

            <Link to={Routes.orders}>
              <Button
                type="text"
                icon={<OrderedListOutlined />}
                className={`nav-item-btn ${currentPath === Routes.orders ? 'active' : ''}`}
              >
                Store Orders
              </Button>
            </Link>
          </>
        )}
      </nav>

      {/* Right Actions Container: Cart, Profile/Auth, Hamburger */}
      <Flex align="center" gap={screens.xs ? 6 : 10}>
        {/* Cart Button: Visible for shoppers and guests; hidden for shop owners */}
        {(!isLoggedIn || !isMerchant) && (
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
                aria-label="View Shopping Cart"
              />
            </Badge>
          </Tooltip>
        )}

        {/* Notification Bell with Badge and Push Prompt */}
        {isLoggedIn && (
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            dropdownRender={() => (
              <div
                style={{
                  width: 320,
                  maxWidth: '90vw',
                  background: '#ffffff',
                  borderRadius: 12,
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 13, color: colors.text }}>
                    Notifications {unreadNotifCount > 0 && <Badge count={unreadNotifCount} style={{ backgroundColor: colors.primary }} />}
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
                  <div
                    style={{
                      padding: '8px 14px',
                      background: colors.primaryLight,
                      borderBottom: `1px solid ${colors.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 11, color: colors.primary, fontWeight: 500 }}>
                      Receive OS & order alerts
                    </span>
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

                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {notificationsList.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                      No notifications yet
                    </div>
                  ) : (
                    notificationsList.slice(0, 10).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (item.data?.url) history.push(item.data.url);
                          else if (item.type === 'order_status_change' || item.type === 'order_placed') history.push(Routes.orders);
                        }}
                        style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          background: item.is_read ? '#ffffff' : '#f8fafc',
                        }}
                      >
                        <div style={{ fontWeight: item.is_read ? 500 : 700, fontSize: 12, color: '#0f172a' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: '15px' }}>
                          {item.body}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          >
            <Badge
              count={unreadNotifCount}
              offset={[-2, 4]}
              color="#ef4444"
              size={screens.xs ? 'small' : 'default'}
            >
              <Button
                shape="circle"
                size={screens.xs ? 'middle' : 'large'}
                icon={<BellOutlined style={{ fontSize: screens.xs ? 17 : 19 }} />}
                style={{
                  border: `1px solid ${colors.border}`,
                  color: unreadNotifCount > 0 ? colors.primary : '#64748b',
                  background: unreadNotifCount > 0 ? colors.primaryLight : '#ffffff',
                }}
                aria-label="Notifications"
              />
            </Badge>
          </Dropdown>
        )}

        {/* Desktop / Tab User Profile & Auth (Screen md and up) */}
        {!isMobile && (
          <>
            {isLoggedIn ? (
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                arrow
                trigger={['click']}
              >
                <div className="navbar-user-capsule">
                  <Avatar
                    size={30}
                    icon={<UserOutlined />}
                    style={{
                      backgroundColor: isMerchant ? colors.cobalt : colors.primary,
                    }}
                  />
                  <span className="navbar-username">
                    {user_data?.username || 'User'}
                  </span>
                  {isMerchant ? (
                    <span className="role-pill role-pill-merchant">Shop Owner</span>
                  ) : (
                    <span className="role-pill role-pill-user">Customer</span>
                  )}
                  <DownOutlined style={{ fontSize: 10, color: '#94a3b8', marginLeft: 2 }} />
                </div>
              </Dropdown>
            ) : (
              <Flex align="center" gap={8} style={{ marginLeft: 4 }}>
                <Link to={Routes.login}>
                  <Button type="default" style={{ borderRadius: radii.md, fontWeight: 600 }}>
                    Login
                  </Button>
                </Link>
                <Link to={Routes.register}>
                  <Button
                    type="primary"
                    style={{
                      borderRadius: radii.md,
                      fontWeight: 700,
                      background: colors.primary,
                      borderColor: colors.primary,
                      color: '#ffffff',
                    }}
                  >
                    Register
                  </Button>
                </Link>
              </Flex>
            )}
          </>
        )}

        {/* Mobile View Quick User Indicator */}
        {isMobile && isLoggedIn && (
          <Avatar
            size={32}
            icon={<UserOutlined />}
            onClick={() => (open ? handleClose() : handleOpen())}
            style={{
              cursor: 'pointer',
              backgroundColor: isMerchant ? colors.cobalt : colors.primary,
            }}
          />
        )}

        {/* Mobile View Hamburger Menu Trigger (< 768px) */}
        {isMobile && (
          <Button
            type="text"
            shape="circle"
            size="large"
            icon={<MenuOutlined style={{ fontSize: 20, color: '#0f172a' }} />}
            onClick={() => (open ? handleClose() : handleOpen())}
            style={{ borderRadius: 8 }}
            aria-label="Toggle Menu"
          />
        )}
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
