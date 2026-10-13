import React from 'react';
import Routes from '../../routes/routes';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { storageKeys, checkUserRole } from '../../utils';
import {
  Avatar,
  Button,
  Badge,
  Tooltip,
  Dropdown,
  Flex,
  Grid,
} from 'antd';
import { useGlobalStore, useCartStore, useChatStore } from '../../services';
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

  const { isMerchant, role } = checkUserRole(user_data);
  const isLoggedIn = !!(
    user_data?.user_id && sessionStorage?.[storageKeys.auth_token]
  );

  const logout = () => {
    update_user_data({});
    sessionStorage.clear();
    history.push(Routes.login);
  };

  const currentPath = location.pathname;

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
            {isMerchant ? (
              <span className="role-pill role-pill-merchant">Shop Owner</span>
            ) : (
              <span className="role-pill role-pill-user">Customer</span>
            )}
          </div>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'explore',
      icon: <HomeOutlined />,
      label: 'Explore Market',
      onClick: () => history.push(Routes.home),
    },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'My Profile & Addresses',
      onClick: () => history.push(Routes.profile),
    },
    {
      key: 'orders',
      icon: <OrderedListOutlined />,
      label: 'My Orders & Quotes',
      onClick: () => history.push(Routes.orders),
    },
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
            key: 'merchant',
            icon: <ShopOutlined style={{ color: '#4f46e5' }} />,
            label: (
              <span style={{ color: '#4f46e5', fontWeight: 600 }}>
                Merchant Hub (Manage Shops)
              </span>
            ),
            onClick: () => history.push(Routes.client),
          },
        ]
      : [
          {
            key: 'partner',
            icon: <ShopOutlined style={{ color: '#059669' }} />,
            label: (
              <span style={{ color: '#059669', fontWeight: 600 }}>
                Sell on Rquest (Register Shop)
              </span>
            ),
            onClick: () => history.push(Routes.client),
          },
        ]),
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
      {/* Brand Logo */}
      <Link to={Routes.home} className="navbar-brand">
        <div className="navbar-logo-icon">R</div>
        <div className="navbar-brand-text">
          <span className="navbar-brand-name">Rquest</span>
          <span className="navbar-badge">Direct</span>
        </div>
      </Link>

      {/* Desktop Navigation Links (≥ 992px) */}
      <nav className="navbar-desktop-nav">
        <Link to={Routes.home}>
          <Button
            type="text"
            icon={<HomeOutlined />}
            className={`nav-item-btn ${currentPath === Routes.home ? 'active' : ''}`}
          >
            Explore
          </Button>
        </Link>

        {isLoggedIn && (
          <Link to={Routes.orders}>
            <Button
              type="text"
              icon={<OrderedListOutlined />}
              className={`nav-item-btn ${currentPath === Routes.orders ? 'active' : ''}`}
            >
              My Orders
            </Button>
          </Link>
        )}

        {isLoggedIn && isMerchant && (
          <Link to={Routes.client}>
            <Button
              type="text"
              icon={<ShopOutlined />}
              className={`nav-item-btn ${currentPath.startsWith('/client') ? 'active' : ''}`}
              style={{ color: '#4f46e5' }}
            >
              Merchant Hub
            </Button>
          </Link>
        )}

        {!isLoggedIn && (
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
        )}
      </nav>

      {/* Right Actions Container: Cart, Profile/Auth, Hamburger */}
      <Flex align="center" gap={screens.xs ? 6 : 10}>
        {/* Cart Button: ALWAYS visible on ALL viewports (Mobile, Tab, Desktop) */}
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
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
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
