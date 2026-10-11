import React from 'react';
import Routes from '../../routes/routes';
import {
  Button,
  Avatar,
  Divider,
  Drawer,
  Badge,
  Flex,
  Typography,
  Grid,
} from 'antd';
import { useGlobalStore, useCartStore, useChatStore } from '../../services';
import { useHistory, useLocation } from 'react-router-dom';
import { storageKeys, checkUserRole } from '../../utils';
import './index.css';
import {
  CloseOutlined,
  HomeOutlined,
  OrderedListOutlined,
  ShopOutlined,
  AppstoreOutlined,
  UserOutlined,
  LogoutOutlined,
  LoginOutlined,
  UserAddOutlined,
  ShoppingCartOutlined,
  MessageOutlined,
  RightOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const SideBar = ({ open, handleClose }) => {
  const history = useHistory();
  const location = useLocation();
  const screens = Grid.useBreakpoint();

  const { user_data, update_user_data } = useGlobalStore((state) => state);
  const { cart, openCart } = useCartStore((state) => state);
  const { handleChatOpen } = useChatStore((state) => state);

  const cartItemCount =
    cart?.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 0;

  const { isAdmin, isMerchant, role } = checkUserRole(user_data);
  const isLoggedIn = !!(
    user_data?.user_id && sessionStorage?.[storageKeys.auth_token]
  );

  const currentPath = location.pathname;

  const logout = () => {
    update_user_data({});
    sessionStorage.clear();
    handleClose();
    history.push(Routes.login);
  };

  const handleNavigate = (path) => {
    history.push(path);
    handleClose();
  };

  const handleCartClick = () => {
    handleClose();
    openCart();
  };

  const handleChatClick = () => {
    handleClose();
    handleChatOpen(null, null);
  };

  return (
    <Drawer
      rootClassName="sidebar-root"
      placement="right"
      onClose={handleClose}
      open={open}
      width={screens.xs ? '86vw' : 320}
      styles={{
        body: {
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        },
      }}
    >
      {/* Top Drawer Header with Brand & Close */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Flex align="center" gap={10}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: 18,
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.28)',
            }}
          >
            R
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              Rquest Direct
            </div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>
              Hyper-Local Marketplace
            </div>
          </div>
        </Flex>

        <Button
          type="text"
          shape="circle"
          icon={<CloseOutlined style={{ fontSize: 16, color: '#64748b' }} />}
          onClick={handleClose}
        />
      </Flex>

      {/* User Info Capsule (If Logged In) */}
      {isLoggedIn ? (
        <div
          style={{
            padding: 12,
            background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            marginBottom: 16,
          }}
        >
          <Flex align="center" gap={10}>
            <Avatar
              size={42}
              icon={<UserOutlined />}
              style={{
                backgroundColor: isAdmin ? '#ef4444' : isMerchant ? '#7c3aed' : '#4f46e5',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 15,
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user_data?.username || 'User'}
              </div>
              <div style={{ marginTop: 3 }}>
                {isAdmin && <span className="role-pill role-pill-admin">Admin</span>}
                {isMerchant && <span className="role-pill role-pill-merchant">Merchant</span>}
                {!isAdmin && !isMerchant && <span className="role-pill role-pill-user">Customer</span>}
              </div>
            </div>
          </Flex>
        </div>
      ) : (
        /* Guest Welcome & Auth Actions (If Not Logged In) */
        <div
          style={{
            padding: 14,
            background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
            borderRadius: 14,
            border: '1px solid #e0e7ff',
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 2 }}>
            Welcome to Rquest 👋
          </div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
            Sign in to track orders, direct message sellers, and get neighborhood deals.
          </Text>
          <Flex gap={8}>
            <Button
              type="primary"
              icon={<LoginOutlined />}
              block
              style={{
                borderRadius: 8,
                fontWeight: 700,
                height: 38,
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              }}
              onClick={() => handleNavigate(Routes.login)}
            >
              Sign In
            </Button>
            <Button
              block
              icon={<UserAddOutlined />}
              style={{ borderRadius: 8, fontWeight: 600, height: 38 }}
              onClick={() => handleNavigate(Routes.register)}
            >
              Register
            </Button>
          </Flex>
        </div>
      )}

      {/* Navigation List Menu */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {/* Explore Market */}
        <Button
          type="text"
          icon={<HomeOutlined style={{ fontSize: 17 }} />}
          className={`drawer-nav-item ${currentPath === Routes.home ? 'active' : ''}`}
          onClick={() => handleNavigate(Routes.home)}
        >
          <span style={{ flex: 1, textAlign: 'left' }}>Explore Market</span>
          <RightOutlined style={{ fontSize: 11, color: '#94a3b8' }} />
        </Button>

        {/* My Cart Item with Live Counter */}
        <Button
          type="text"
          icon={<ShoppingCartOutlined style={{ fontSize: 17 }} />}
          className="drawer-nav-item"
          onClick={handleCartClick}
        >
          <span style={{ flex: 1, textAlign: 'left' }}>My Shopping Cart</span>
          {cartItemCount > 0 ? (
            <Badge
              count={`${cartItemCount} item${cartItemCount > 1 ? 's' : ''}`}
              style={{ backgroundColor: '#4f46e5', fontWeight: 700, fontSize: 11 }}
            />
          ) : (
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Empty</span>
          )}
        </Button>

        {/* My Orders (for logged-in users) */}
        {isLoggedIn && (
          <Button
            type="text"
            icon={<OrderedListOutlined style={{ fontSize: 17 }} />}
            className={`drawer-nav-item ${currentPath === Routes.orders ? 'active' : ''}`}
            onClick={() => handleNavigate(Routes.orders)}
          >
            <span style={{ flex: 1, textAlign: 'left' }}>My Orders & Quotes</span>
            <RightOutlined style={{ fontSize: 11, color: '#94a3b8' }} />
          </Button>
        )}

        {/* Direct Chat / Messages (for logged-in users) */}
        {isLoggedIn && (
          <Button
            type="text"
            icon={<MessageOutlined style={{ fontSize: 17 }} />}
            className="drawer-nav-item"
            onClick={handleChatClick}
          >
            <span style={{ flex: 1, textAlign: 'left' }}>Direct Chat / Messages</span>
            <RightOutlined style={{ fontSize: 11, color: '#94a3b8' }} />
          </Button>
        )}

        {/* Role-Specific Sections */}
        {isLoggedIn && (isMerchant || isAdmin) && (
          <Button
            type="text"
            icon={<ShopOutlined style={{ fontSize: 17, color: '#4f46e5' }} />}
            className={`drawer-nav-item ${currentPath.startsWith('/client') ? 'active' : ''}`}
            style={{ color: '#4f46e5' }}
            onClick={() => handleNavigate(Routes.client)}
          >
            <span style={{ flex: 1, textAlign: 'left', fontWeight: 700 }}>
              Merchant Hub (My Stores)
            </span>
            <span
              style={{
                fontSize: 10,
                background: '#ede9fe',
                color: '#6d28d9',
                padding: '1px 6px',
                borderRadius: 9999,
                fontWeight: 700,
              }}
            >
              Manage
            </span>
          </Button>
        )}

        {isLoggedIn && isAdmin && (
          <Button
            type="text"
            icon={<AppstoreOutlined style={{ fontSize: 17, color: '#dc2626' }} />}
            className={`drawer-nav-item ${currentPath.startsWith('/admin') ? 'active' : ''}`}
            style={{ color: '#dc2626' }}
            onClick={() => handleNavigate(Routes.admin)}
          >
            <span style={{ flex: 1, textAlign: 'left', fontWeight: 700 }}>
              Admin Control Panel
            </span>
            <span
              style={{
                fontSize: 10,
                background: '#fee2e2',
                color: '#b91c1c',
                padding: '1px 6px',
                borderRadius: 9999,
                fontWeight: 700,
              }}
            >
              Root
            </span>
          </Button>
        )}

        {/* Partner with us / Register shop (if Customer or Guest) */}
        {(!isLoggedIn || (!isMerchant && !isAdmin)) && (
          <Button
            type="text"
            icon={<ShopOutlined style={{ fontSize: 17, color: '#059669' }} />}
            className="drawer-nav-item"
            style={{ color: '#059669' }}
            onClick={() => handleNavigate(Routes.client)}
          >
            <span style={{ flex: 1, textAlign: 'left', fontWeight: 600 }}>
              Sell on Rquest (Register Shop)
            </span>
            <span
              style={{
                fontSize: 10,
                background: '#ecfdf5',
                color: '#047857',
                padding: '1px 6px',
                borderRadius: 9999,
                fontWeight: 700,
              }}
            >
              0% Fee
            </span>
          </Button>
        )}
      </div>

      {/* Bottom Drawer Actions */}
      <div style={{ marginTop: 'auto', paddingTop: 12 }}>
        <Divider style={{ margin: '8px 0 12px 0' }} />

        {isLoggedIn ? (
          <Button
            type="text"
            danger
            block
            icon={<LogoutOutlined />}
            style={{
              height: 44,
              borderRadius: 10,
              fontWeight: 700,
              justifyContent: 'flex-start',
              padding: '0 14px',
            }}
            onClick={logout}
          >
            Log Out ({user_data?.username || 'User'})
          </Button>
        ) : (
          <div style={{ textAlign: 'center', padding: '4px 0' }}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Rquest Direct • Zero Aggregator Markups • v1.0.8
            </Text>
          </div>
        )}
      </div>
    </Drawer>
  );
};

export default SideBar;

