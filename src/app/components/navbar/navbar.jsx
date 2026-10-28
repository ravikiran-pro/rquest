import React, { useState, useEffect } from 'react';
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
import './index.css';
import {
  MenuOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  ShopOutlined,
  AppstoreOutlined,
  LogoutOutlined,
  HomeOutlined,
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

  const { isAdmin, isMerchant, role } = checkUserRole(user_data);
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
        setUnreadNotifCount(res.unreadCount || res.data.filter((n) => !n.is_read).length);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadNotifications();
    }
  }, [isLoggedIn, user_data?.user_id]);

  useEffect(() => {
    const unsub = chatSocket.onPushNotification(() => {
      setUnreadNotifCount((prev) => prev + 1);
      loadNotifications();
    });
    return () => unsub();
  }, []);

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
    } catch (e) {}
  };

  const logout = () => {
    update_user_data({});
    sessionStorage.clear();
    history.push(Routes.login);
  };

  const currentPath = location.pathname;

  const logoDestination = !isLoggedIn
    ? Routes.landing
    : isAdmin
    ? Routes.admin
    : isMerchant
    ? Routes.client
    : Routes.app;

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
            icon: <ShopOutlined style={{ color: '#4f46e5' }} />,
            label: (
              <span style={{ color: '#4f46e5', fontWeight: 700 }}>
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
            icon: <SafetyCertificateOutlined style={{ color: '#7c3aed' }} />,
            label: (
              <span style={{ color: '#7c3aed', fontWeight: 700 }}>
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

  return (
    <header className="navBar">
      {/* Brand Logo - Navigates dynamically based on role */}
      <Link to={logoDestination} className="navbar-brand">
        <div className="navbar-logo-icon">R</div>
        <div className="navbar-brand-text">
          <span className="navbar-brand-name">Rquest</span>
          <span className="navbar-badge">Direct</span>
        </div>
      </Link>

      {/* Desktop Navigation Links (≥ 992px) */}
      <nav className="navbar-desktop-nav">
        {/* Guest: Show Home, Explore App, Sell with Us */}
        {!isLoggedIn && (
          <>
            <Link to={Routes.landing}>
              <Button
                type="text"
                icon={<HomeOutlined />}
                className={`nav-item-btn ${currentPath === Routes.landing ? 'active' : ''}`}
              >
                Home
              </Button>
            </Link>

            <Link to={Routes.app}>
              <Button
                type="text"
                icon={<CompassOutlined />}
                className={`nav-item-btn ${currentPath === Routes.app || currentPath === '/home' ? 'active' : ''}`}
              >
                Explore App
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
                style={{ color: '#4f46e5', fontWeight: 700 }}
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
              color="#4f46e5"
              size={screens.xs ? 'small' : 'default'}
            >
              <Button
                shape="circle"
                size={screens.xs ? 'middle' : 'large'}
                icon={<ShoppingCartOutlined style={{ fontSize: screens.xs ? 17 : 19 }} />}
                onClick={openCart}
                style={{
                  border: '1px solid #e2e8f0',
                  color: cartItemCount > 0 ? '#4f46e5' : '#64748b',
                  background: cartItemCount > 0 ? '#eef2ff' : '#ffffff',
                  boxShadow: cartItemCount > 0 ? '0 2px 8px rgba(79, 70, 229, 0.2)' : 'none',
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
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                    Notifications {unreadNotifCount > 0 && <Badge count={unreadNotifCount} style={{ backgroundColor: '#4f46e5' }} />}
                  </span>
                  {unreadNotifCount > 0 && (
                    <Button
                      type="link"
                      size="small"
                      onClick={handleMarkAllRead}
                      style={{ padding: 0, fontSize: 11, height: 'auto', color: '#4f46e5' }}
                    >
                      Mark all read
                    </Button>
                  )}
                </div>

                {!isPushEnabled && (
                  <div
                    style={{
                      padding: '8px 14px',
                      background: '#eef2ff',
                      borderBottom: '1px solid #e0e7ff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 11, color: '#3730a3', fontWeight: 500 }}>
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
                        borderRadius: 6,
                        background: '#4f46e5',
                        borderColor: '#4f46e5',
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
                  border: '1px solid #e2e8f0',
                  color: unreadNotifCount > 0 ? '#4f46e5' : '#64748b',
                  background: unreadNotifCount > 0 ? '#eef2ff' : '#ffffff',
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
                      backgroundColor: isMerchant ? '#7c3aed' : '#4f46e5',
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
                  <Button type="default" style={{ borderRadius: 8, fontWeight: 600 }}>
                    Login
                  </Button>
                </Link>
                <Link to={Routes.register}>
                  <Button
                    type="primary"
                    style={{
                      borderRadius: 8,
                      fontWeight: 700,
                      background: '#0f172a',
                      borderColor: '#0f172a',
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
              backgroundColor: isMerchant ? '#7c3aed' : '#4f46e5',
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

export default Navbar;
