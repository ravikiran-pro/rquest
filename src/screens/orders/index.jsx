import React, { useEffect, useState, useMemo } from 'react';
import {
  Card,
  Tabs,
  Tag,
  Typography,
  Space,
  Button,
  Row,
  Col,
  Spin,
  Empty,
  Divider,
  message,
  Avatar,
  Input,
  Select,
  Grid,
} from 'antd';
import {
  FileDoneOutlined,
  MessageOutlined,
  ShopOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  PhoneOutlined,
  DownOutlined,
  UpOutlined,
  CheckCircleFilled,
  CarOutlined,
  DatabaseOutlined,
  ShoppingOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { netWorkCall, apiConfig, checkUserRole } from '../../app/utils';
import { useGlobalStore, useChatStore } from '../../app/services';
import { colors, typography, radii } from '../../app/styles/theme';
import { useHistory } from 'react-router-dom';
import Routes from '../../app/routes/routes';
import AdminOrdersAccounts from '../admin/orders_accounts';

const { Title, Text } = Typography;
const { Option } = Select;

// Fallback high-fidelity seed datasets matching Stitch hyperlocal orders visual design
const MOCK_ACTIVE_ORDER = {
  id: 'mock-rq-84291',
  order_number: 'RQ-84291',
  status: 'placed',
  total_amount: 523,
  payment_mode: 'direct_upi',
  timeAgo: '12m ago',
  stores_count: 2,
  stores: [
    {
      id: 'mock-shop-1',
      shop_name: 'Sri Krishna Provisio',
      distance: '350m away · Provision Store',
      status_label: 'Pickup Requested',
      status_type: 'amber',
      img_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
      items_text: 'Aavin Fresh Milk (x2), Stone-Pressed Gingelly Oil 500ml (x1)',
      items_count: 2,
      logistics_text: '🛵 Dunzo Valet arriving in 6 mins',
      logistics_price: '₹224',
      phone: '+91 98400 12345',
      action_type: 'order',
      action_label: 'Order',
    },
    {
      id: 'mock-shop-2',
      shop_name: 'Madras Tiffin Room',
      distance: '600m away · South Indian Eatery',
      status_label: 'Placed',
      status_type: 'blue',
      img_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
      items_text: 'Fresh Ghee Podi Idli (x2 plates)',
      items_count: 1,
      otp_code: '4921',
      logistics_price: '₹299',
      phone: '+91 98400 67890',
      action_type: 'request',
      action_label: 'Request',
    },
  ],
  progress: {
    status: 'In Progress',
    steps: [
      { key: 'placed', label: 'Placed', time: '10:14 AM', state: 'done' },
      { key: 'confirmed', label: 'Confirmed', time: '10:16 AM', state: 'done' },
      { key: 'fulfilling', label: 'Fulfilling', time: 'Active', state: 'active' },
      { key: 'delivery', label: 'Delivery', time: '~10:45 AM', state: 'pending' },
    ],
  },
  items: [
    { name: 'Aavin Fresh Milk', quantity: 2, subtotal: 48 },
    { name: 'Stone-Pressed Gingelly Oil 500ml', quantity: 1, subtotal: 176 },
    { name: 'Fresh Ghee Podi Idli (2 pcs)', quantity: 2, subtotal: 120 },
  ],
  platform_fee: 0,
  delivery_fee: 179,
};

const MOCK_PAST_ORDERS = [
  {
    id: 'mock-past-1',
    type: 'service',
    dateStr: 'Yesterday, 8:45 AM • ',
    typeLabel: 'Service',
    statusLabel: 'Completed',
    statusType: 'amber',
    shop_name: 'Indiranagar AC Solutions',
    service_title: 'Split AC Jet Cleaning (1 unit)',
    payment_note: 'Paid directly via UPI',
    price: 299,
    reference_id: 'Service ID: #RQ-79012',
    action_label: 'Request',
    img_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'mock-past-2',
    type: 'bundle',
    dateStr: '2 Nov 2026, 7:15 PM • 2 Stores Bundle',
    statusLabel: 'Completed',
    statusType: 'blue',
    bundle_items: [
      { name: 'Sri Krishna Provisions (Dairy, Snacks)', price: 180 },
      { name: 'Apex Peripheral (GaN 65W Charger)', price: 850 },
    ],
    payment_note: 'Total Paid (Shop UPI)',
    price: 1030,
    action_label: 'Order',
  },
  {
    id: 'mock-past-3',
    type: 'single',
    dateStr: '28 Oct 2026, 11:30 AM • Single Store',
    statusLabel: 'Completed',
    statusType: 'blue',
    shop_name: 'Gramam Organic Store',
    product_title: '100% Pure Gingelly Oil 500ml',
    payment_note: 'UPI Settled direct',
    payment_note_blue: true,
    price: 340,
    reference_id: 'Order ID: #RQ-74198',
    action_label: 'Order',
    img_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80',
  },
];

const OrdersScreen = () => {
  const history = useHistory();
  const { user_data } = useGlobalStore((state) => state);
  const { handleChatOpen } = useChatStore((state) => state);

  const { isAdmin, isMerchant: initialIsMerchant } = checkUserRole(user_data);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');

  // Customer's personal orders placed as a shopper
  const [customerOrders, setCustomerOrders] = useState([]);
  // Merchant's incoming customer orders for their shops
  const [storeOrders, setStoreOrders] = useState([]);
  const [myShops, setMyShops] = useState([]);
  // Quotes
  const [customerQuotes, setCustomerQuotes] = useState([]);
  const [storeQuotes, setStoreQuotes] = useState([]);

  // Store Orders UI filters
  const [selectedShopFilter, setSelectedShopFilter] = useState('all');
  const [storeOrderFilter, setStoreOrderFilter] = useState('all'); // 'all', 'active', 'completed', 'cancelled'
  const [storeSearchTerm, setStoreSearchTerm] = useState('');

  // Customer Orders UI filter: 'all' | 'active' | 'completed'
  const [customerOrderFilter, setCustomerOrderFilter] = useState('active');

  // Expandable items state
  const [expandedOrders, setExpandedOrders] = useState({});
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const isStoreOwner = myShops.length > 0 || initialIsMerchant;
  const isCustomerOnly = !isAdmin && !isStoreOwner;

  const fetchOrdersData = async () => {
    if (!user_data?.user_id) return;
    setLoading(true);

    try {
      const calls = [
        netWorkCall(apiConfig.orders_user, 'GET', null, true),
        netWorkCall(apiConfig.quotes_user, 'GET', null, true),
      ];

      // If user might be merchant or admin, fetch owner store orders
      calls.push(netWorkCall(apiConfig.orders_owner, 'GET', null, true));
      calls.push(netWorkCall(apiConfig.quotes_owner, 'GET', null, true));

      const [userOrdersRes, userQuotesRes, ownerOrdersRes, ownerQuotesRes] =
        await Promise.all(calls);

      if (userOrdersRes?.data) setCustomerOrders(userOrdersRes.data);
      if (userQuotesRes?.data) setCustomerQuotes(userQuotesRes.data);

      const shopsList = ownerOrdersRes?.shops || [];
      const incomingOrders = ownerOrdersRes?.data || [];
      setMyShops(shopsList);
      setStoreOrders(incomingOrders);

      if (ownerQuotesRes?.data) setStoreQuotes(ownerQuotesRes.data);

      // Determine initial active tab if on default 'orders'
      if (isAdmin) {
        setActiveTab((prev) => (prev === 'orders' ? 'admin_all' : prev));
      } else if (shopsList.length > 0 || initialIsMerchant) {
        setActiveTab((prev) => (prev === 'orders' ? 'store_orders' : prev));
      } else {
        setActiveTab((prev) => (prev === 'orders' ? 'customer_orders' : prev));
      }
    } catch (err) {
      console.error('Error fetching orders data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user_data?.user_id) {
      history.push(Routes.login);
      return;
    }
    fetchOrdersData();
  }, [user_data]);

  const toggleExpand = (orderId) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  // Merchant status update action
  const handleUpdateStoreOrderStatus = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await netWorkCall(
        `${apiConfig.orders_status}/${orderId}/status`,
        'PUT',
        JSON.stringify({ status: newStatus }),
        true
      );
      if (res?.success) {
        message.success(`Order status updated to ${newStatus}`);
        // Refresh store orders
        const ownerOrdersRes = await netWorkCall(apiConfig.orders_owner, 'GET', null, true);
        if (ownerOrdersRes?.data) {
          setStoreOrders(ownerOrdersRes.data);
        }
      } else {
        message.error(res?.error || 'Failed to update order status');
      }
    } catch (err) {
      console.error(err);
      message.error('Failed to update status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Customer fallback switch to pickup
  const handleSwitchToPickup = async (orderId) => {
    try {
      const res = await netWorkCall(
        `${apiConfig.orders_switch_pickup}/${orderId}/switch-to-pickup`,
        'PUT',
        null,
        true
      );
      if (res?.success) {
        message.success('Switched to Self-Pickup. You can collect it from the store.');
        const ordersRes = await netWorkCall(apiConfig.orders_user, 'GET', null, true);
        if (ordersRes?.data) setCustomerOrders(ordersRes.data);
      } else {
        message.error(res?.error || 'Failed to switch to pickup');
      }
    } catch (err) {
      console.error('Error switching to pickup:', err);
      message.error('Failed to switch to pickup');
    }
  };

  // Status badge helper aligned with Rquest design system
  const getStatusBadge = (status) => {
    switch (status) {
      case 'order_prepare':
      case 'preparing':
      case 'accepted':
        return (
          <span
            style={{
              background: colors.primaryLight,
              color: colors.cobalt,
              border: `1px solid #bfdbfe`,
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 11,
              padding: '2px 8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <SyncOutlined spin /> Preparing
          </span>
        );
      case 'packed':
      case 'ready_for_pickup':
        return (
          <span
            style={{
              background: '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 11,
              padding: '2px 8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <CheckCircleFilled /> Ready for Pickup
          </span>
        );
      case 'open_to_delivery':
      case 'out_for_delivery':
        return (
          <span
            style={{
              background: colors.primaryLight,
              color: colors.primary,
              border: `1px solid #bfdbfe`,
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 11,
              padding: '2px 8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <CarOutlined /> Out for Delivery
          </span>
        );
      case 'completed':
        return (
          <span
            style={{
              background: '#ecfdf5',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 11,
              padding: '2px 8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <CheckCircleOutlined /> Completed
          </span>
        );
      case 'cancelled':
      case 'rejected':
        return (
          <span
            style={{
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 11,
              padding: '2px 8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <CloseCircleOutlined /> Cancelled
          </span>
        );
      case 'placed':
      default:
        return (
          <span
            style={{
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fde68a',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 11,
              padding: '2px 8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <ClockCircleOutlined /> Placed
          </span>
        );
    }
  };

  // Progress Bar Steps aligned with Hyperlocal Track mockup
  const renderProgressTracker = (status, createdAt) => {
    const isCancelled = status === 'cancelled';
    const isPlaced = status === 'placed' || status === 'pending';
    const isPreparing = status === 'order_prepare' || status === 'preparing' || status === 'accepted';
    const isReadyOrDispatched = status === 'ready_for_pickup' || status === 'open_to_delivery' || status === 'out_for_delivery';
    const isCompleted = status === 'completed';

    if (isCancelled) {
      return (
        <div style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: radii.md, fontSize: 12, color: '#b91c1c', fontWeight: 600, margin: '10px 0' }}>
          This order was cancelled.
        </div>
      );
    }

    const timeStr = createdAt
      ? new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '10:14 AM';

    const steps = [
      { key: 'placed', label: 'Placed', sub: timeStr, done: true, active: isPlaced },
      { key: 'prep', label: 'Confirmed', sub: isPreparing || isReadyOrDispatched || isCompleted ? '10:16 AM' : 'Pending', done: isPreparing || isReadyOrDispatched || isCompleted, active: isPreparing },
      { key: 'ready', label: 'Fulfilling', sub: isReadyOrDispatched ? 'Active' : isCompleted ? 'Done' : 'Active', done: isCompleted, active: isReadyOrDispatched || isPreparing },
      { key: 'done', label: 'Delivery', sub: isCompleted ? 'Delivered' : '~10:45 AM', done: isCompleted, active: isCompleted },
    ];

    let fillPercent = '66%';
    if (isCompleted) fillPercent = '100%';
    else if (isReadyOrDispatched) fillPercent = '66%';
    else if (isPreparing) fillPercent = '66%';
    else if (isPlaced) fillPercent = '33%';

    return (
      <div style={{ background: '#F9F8F5', border: '1px solid #ECE7DF', borderRadius: 16, padding: '14px 14px', margin: '12px 0 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1D2939' }}>Order Progress</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0056bd', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0056bd', display: 'inline-block' }} />
            {isCompleted ? 'Completed' : '● In Progress'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', margin: '4px 0 12px 0' }}>
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '20px',
              right: '20px',
              height: '2px',
              background: '#E5E7EB',
              zIndex: 1,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '20px',
              width: fillPercent,
              height: '2px',
              background: '#0056bd',
              zIndex: 2,
              transition: 'width 0.3s ease',
            }}
          />

          {steps.map((step, idx) => {
            const isBeacon = step.key === 'ready' && !isCompleted;
            return (
              <div key={idx} style={{ zIndex: 3, textAlign: 'center', minWidth: 60 }}>
                {isBeacon ? (
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: '#ffffff',
                      border: '3px solid #0056bd',
                      boxShadow: '0 0 0 3px rgba(46, 111, 219, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 4px auto',
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0056bd' }} />
                  </div>
                ) : (
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: step.done ? '#0056bd' : '#F2F4F7',
                      border: step.done ? 'none' : '2px solid #D0D5DD',
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 4px auto',
                      boxShadow: step.done ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    {step.done ? '✓' : <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#98A2B3' }} />}
                  </div>
                )}
                <div style={{ fontSize: 11, fontWeight: isBeacon || step.done ? 700 : 600, color: isBeacon ? '#0056bd' : step.done ? '#1D2939' : '#667085' }}>
                  {step.label}
                </div>
                {step.sub && (
                  <div style={{ fontSize: 10, color: isBeacon ? '#0056bd' : '#667085', fontWeight: isBeacon ? 700 : 500 }}>
                    {step.sub}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Active vs Past customer orders
  const activeCustomerOrders = useMemo(() => {
    return customerOrders.filter((ord) => ord.status !== 'completed' && ord.status !== 'cancelled');
  }, [customerOrders]);

  const pastCustomerOrders = useMemo(() => {
    return customerOrders.filter((ord) => ord.status === 'completed' || ord.status === 'cancelled');
  }, [customerOrders]);

  // Filtered store orders (for shop owner)
  const filteredStoreOrders = useMemo(() => {
    return storeOrders.filter((ord) => {
      // Store filter
      if (selectedShopFilter !== 'all' && ord.shop_id !== selectedShopFilter) {
        return false;
      }
      // Status filter
      if (storeOrderFilter === 'active') {
        if (ord.status === 'completed' || ord.status === 'cancelled') return false;
      } else if (storeOrderFilter === 'completed') {
        if (ord.status !== 'completed') return false;
      } else if (storeOrderFilter === 'cancelled') {
        if (ord.status !== 'cancelled') return false;
      }
      // Search term
      if (storeSearchTerm.trim()) {
        const q = storeSearchTerm.toLowerCase().trim();
        const num = (ord.order_number || '').toLowerCase();
        const cust = (ord.customer?.username || '').toLowerCase();
        const phone = (ord.customer_phone || ord.customer?.mobile || '').toLowerCase();
        const address = (ord.delivery_address || '').toLowerCase();
        return num.includes(q) || cust.includes(q) || phone.includes(q) || address.includes(q);
      }
      return true;
    });
  }, [storeOrders, selectedShopFilter, storeOrderFilter, storeSearchTerm]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" tip="Loading Store & Customer Orders..." />
      </div>
    );
  }

  // Construct dynamic navigation tabs based on user capabilities
  const tabItems = [];

  if (isAdmin) {
    tabItems.push({
      key: 'admin_all',
      label: (
        <span style={{ fontWeight: 700, fontSize: 14 }}>
          <DatabaseOutlined /> Platform All Shops & Accounts
        </span>
      ),
    });
  }

  if (isStoreOwner || myShops.length > 0) {
    tabItems.push({
      key: 'store_orders',
      label: (
        <span style={{ fontWeight: 700, fontSize: 14 }}>
          <ShopOutlined /> Store Customer Orders ({storeOrders.length})
        </span>
      ),
    });
  }

  tabItems.push({
    key: 'customer_orders',
    label: (
      <span style={{ fontWeight: 700, fontSize: 14 }}>
        <ShoppingOutlined /> {isStoreOwner ? 'My Personal Purchases' : 'My Orders'} ({customerOrders.length})
      </span>
    ),
  });

  tabItems.push({
    key: 'quotes',
    label: (
      <span style={{ fontWeight: 700, fontSize: 14 }}>
        <FileDoneOutlined /> Service Quotes ({customerQuotes.length + storeQuotes.length})
      </span>
    ),
  });

  return (
    <div style={{ minHeight: '100vh', background: '#F8F4EF', paddingBottom: 100 }}>
      <div
        style={{
          maxWidth: isCustomerOnly ? 640 : activeTab === 'admin_all' ? 1200 : 1040,
          margin: '0 auto',
          padding: isMobile ? '12px 14px 100px 14px' : '20px 16px 100px 16px',
        }}
      >
        {/* If Admin or Store Owner, render console header and tab navigation */}
        {!isCustomerOnly && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <Title
                  level={2}
                  style={{
                    margin: 0,
                    fontWeight: 800,
                    color: '#0B2D6B',
                    fontSize: 'clamp(20px, 4vw, 26px)',
                    letterSpacing: '-0.5px',
                  }}
                >
                  {isAdmin
                    ? 'Platform Orders & Accounts Console'
                    : 'Store & Customer Orders'}
                </Title>
                <Text type="secondary" style={{ fontSize: 13, color: '#64748b' }}>
                  {isAdmin
                    ? 'Super Admin oversight across all stores, customer orders, and financial accounts.'
                    : 'Manage incoming customer orders across your storefronts and track your personal orders.'}
                </Text>
              </div>

              <Space>
                {isStoreOwner && (
                  <Button
                    icon={<ShopOutlined />}
                    onClick={() => history.push(Routes.client)}
                    style={{ borderRadius: 9999, fontWeight: 700 }}
                  >
                    Store Dashboard
                  </Button>
                )}
                <Button
                  type="primary"
                  onClick={() => history.push(Routes.home)}
                  style={{ borderRadius: 9999, fontWeight: 700 }}
                >
                  Explore Stores
                </Button>
              </Space>
            </div>

            {/* Main Tabs Navigation */}
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              style={{ marginTop: 14 }}
              items={tabItems}
            />
          </div>
        )}

        {/* Regular Customer: Quick toggle for Quotes if user has requested service quotes */}
        {isCustomerOnly && customerQuotes.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <Button
              type="link"
              onClick={() => setActiveTab(activeTab === 'quotes' ? 'customer_orders' : 'quotes')}
              style={{ color: '#0056bd', fontWeight: 700, padding: 0 }}
            >
              {activeTab === 'quotes' ? '← Back to Orders' : `View Service Quotes (${customerQuotes.length})`}
            </Button>
          </div>
        )}

      {/* ========================================================= */}
      {/* TAB 1: PLATFORM ADMIN ORDERS & ACCOUNTS                   */}
      {/* ========================================================= */}
      {activeTab === 'admin_all' && isAdmin && (
        <AdminOrdersAccounts />
      )}

      {/* ========================================================= */}
      {/* TAB 2: STORE ORDERS (Customer orders placed at user's shops) */}
      {/* ========================================================= */}
      {activeTab === 'store_orders' && (
        <div>
          {/* Store switcher & Filter bar */}
          <Card
            style={{ borderRadius: 14, border: '1px solid #e2e8f0', marginBottom: 16 }}
            bodyStyle={{ padding: 14 }}
          >
            <Row gutter={[10, 10]} align="middle" justify="space-between">
              <Col xs={24} md={14}>
                <Space wrap style={{ width: '100%' }}>
                  <Input
                    placeholder="Search Order #, Customer, Phone..."
                    prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                    value={storeSearchTerm}
                    onChange={(e) => setStoreSearchTerm(e.target.value)}
                    style={{ width: 220, borderRadius: 8 }}
                    allowClear
                  />
                  {myShops.length > 1 && (
                    <Select
                      value={selectedShopFilter}
                      onChange={setSelectedShopFilter}
                      style={{ width: 170 }}
                    >
                      <Option value="all">All My Stores ({myShops.length})</Option>
                      {myShops.map((s) => (
                        <Option key={s.id} value={s.id}>
                          {s.shop_name}
                        </Option>
                      ))}
                    </Select>
                  )}
                  <Select
                    value={storeOrderFilter}
                    onChange={setStoreOrderFilter}
                    style={{ width: 150 }}
                  >
                    <Option value="all">All Statuses ({storeOrders.length})</Option>
                    <Option value="active">
                      Active / Action Needed (
                      {storeOrders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length}
                      )
                    </Option>
                    <Option value="completed">
                      Completed ({storeOrders.filter((o) => o.status === 'completed').length})
                    </Option>
                    <Option value="cancelled">
                      Cancelled ({storeOrders.filter((o) => o.status === 'cancelled').length})
                    </Option>
                  </Select>
                </Space>
              </Col>

              <Col xs={24} md={10} style={{ textAlign: 'right' }}>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchOrdersData}
                  loading={loading}
                  style={{ borderRadius: 8 }}
                >
                  Refresh Live Orders
                </Button>
              </Col>
            </Row>
          </Card>

          {filteredStoreOrders.length === 0 ? (
            <Card style={{ borderRadius: 16, textAlign: 'center', padding: '40px 16px', border: '1px solid #e2e8f0' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No customer orders received in this filter"
              >
                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                  Share your storefront link with local customers on WhatsApp or social media to start receiving direct orders.
                </Text>
                <Button
                  type="primary"
                  onClick={() => history.push(Routes.client)}
                  style={{ borderRadius: 8, fontWeight: 700 }}
                >
                  Go to Store Management
                </Button>
              </Empty>
            </Card>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              {filteredStoreOrders.map((ord) => {
                const isExpanded = expandedOrders[ord.id];
                const items = ord.items || [];
                const displayedItems = isExpanded ? items : items.slice(0, 3);
                const isActionBusy = updatingOrderId === ord.id;

                return (
                  <Card
                    key={ord.id}
                    className="order-card-mobile"
                    style={{
                      borderRadius: radii.xl,
                      border: ord.status === 'placed' ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                      boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                    }}
                    bodyStyle={{ padding: 16 }}
                  >
                    {/* Header: Customer Info + Store Name + Live Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <Avatar
                          size={46}
                          style={{
                            backgroundColor: colors.primary,
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {(ord.customer?.username || 'C').charAt(0).toUpperCase()}
                        </Avatar>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>
                            Customer: {ord.customer?.username || 'Guest Customer'}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>
                            #{ord.order_number} • {new Date(ord.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {ord.shop?.shop_name && (
                            <div style={{ fontSize: 11, color: colors.primary, fontWeight: 600 }}>
                              🏪 Outlet: {ord.shop.shop_name}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        {getStatusBadge(ord.status)}
                        <div style={{ marginTop: 4 }}>
                          <Tag
                            color={ord.order_type === 'delivery' ? 'purple' : ord.order_type === 'service' ? 'cyan' : 'green'}
                            style={{ fontSize: 11, fontWeight: 700, margin: 0 }}
                          >
                            {ord.order_type === 'delivery' ? '🚚 Delivery' : ord.order_type === 'service' ? '🛠️ Service' : '🏬 Counter Pickup'}
                          </Tag>
                        </div>
                      </div>
                    </div>

                    {/* Progress Tracker */}
                    {renderProgressTracker(ord.status)}

                    {/* Items Receipt Box */}
                    <div
                      style={{
                        background: '#f8fafc',
                        borderRadius: 12,
                        padding: '10px 12px',
                        border: '1px solid #f1f5f9',
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#475569', marginBottom: 6 }}>
                        ORDER ITEMS ({items.length})
                      </div>
                      {displayedItems.map((it, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: 13,
                            color: '#334155',
                            padding: '4px 0',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                background: '#e2e8f0',
                                color: '#0f172a',
                                fontWeight: 800,
                                fontSize: 11,
                                padding: '1px 6px',
                                borderRadius: 4,
                              }}
                            >
                              {it.quantity}x
                            </span>
                            <span style={{ fontWeight: 600 }}>{it.item_name}</span>
                          </div>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>
                            ₹{it.subtotal ? it.subtotal.toFixed(2) : (it.unit_price * it.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}

                      {items.length > 3 && (
                        <Button
                          type="link"
                          size="small"
                          onClick={() => toggleExpand(ord.id)}
                          style={{ padding: '4px 0', fontSize: 12, fontWeight: 700 }}
                        >
                          {isExpanded ? (
                            <>Show less <UpOutlined /></>
                          ) : (
                            <>+{items.length - 3} more items <DownOutlined /></>
                          )}
                        </Button>
                      )}

                      <Divider style={{ margin: '8px 0' }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#64748b' }}>
                          Customer Payment ({ord.payment_mode === 'direct_upi' ? '💳 Direct UPI' : '💵 Cash'})
                        </span>
                        <span style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                          ₹{ord.total_amount?.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Customer Contact & Delivery Info */}
                    <div
                      style={{
                        background: colors.surfaceContainerLow,
                        padding: '10px 12px',
                        borderRadius: radii.md,
                        border: `1px solid ${colors.borderLight}`,
                        marginBottom: 12,
                        fontSize: 12,
                      }}
                    >
                      <div style={{ color: colors.primary, fontWeight: 600, marginBottom: 2 }}>
                        📞 Customer Phone: <strong>{ord.customer_phone || ord.customer?.mobile || 'Provided via Chat'}</strong>
                      </div>
                      {ord.delivery_address && (
                        <div style={{ color: '#475569' }}>
                          📍 Delivery Address: <strong>{ord.delivery_address}</strong>
                        </div>
                      )}
                      {ord.notes && (
                        <div style={{ color: '#b45309', marginTop: 2 }}>
                          📝 Customer Note: &quot;{ord.notes}&quot;
                        </div>
                      )}
                    </div>

                    {/* MERCHANT ACTION TOOLBAR */}
                    <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                      {/* Status Transition Action Buttons */}
                      <Space wrap>
                        {(ord.status === 'placed' || ord.status === 'pending') && (
                          <Button
                            type="primary"
                            icon={<SyncOutlined />}
                            loading={isActionBusy}
                            onClick={() => handleUpdateStoreOrderStatus(ord.id, 'order_prepare')}
                            style={{ background: colors.primary, borderColor: colors.primary, fontWeight: 700, borderRadius: 8 }}
                          >
                            Start Preparing
                          </Button>
                        )}

                        {(ord.status === 'order_prepare' || ord.status === 'preparing') && ord.order_type === 'pickup' && (
                          <Button
                            type="primary"
                            icon={<CheckCircleFilled />}
                            loading={isActionBusy}
                            onClick={() => handleUpdateStoreOrderStatus(ord.id, 'ready_for_pickup')}
                            style={{ background: '#059669', borderColor: '#059669', fontWeight: 700, borderRadius: 8 }}
                          >
                            Ready for Counter Pickup
                          </Button>
                        )}

                        {(ord.status === 'order_prepare' || ord.status === 'preparing') && ord.order_type === 'delivery' && (
                          <Button
                            type="primary"
                            icon={<CarOutlined />}
                            loading={isActionBusy}
                            onClick={() => handleUpdateStoreOrderStatus(ord.id, 'open_to_delivery')}
                            style={{ background: colors.cobalt, borderColor: colors.cobalt, fontWeight: 700, borderRadius: 8 }}
                          >
                            Open to Delivery Runner
                          </Button>
                        )}

                        {ord.status === 'ready_for_pickup' && (
                          <Button
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            loading={isActionBusy}
                            onClick={() => handleUpdateStoreOrderStatus(ord.id, 'completed')}
                            style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 700, borderRadius: 8 }}
                          >
                            Handover & Complete Order
                          </Button>
                        )}

                        {(ord.status === 'open_to_delivery' || ord.status === 'out_for_delivery') && (
                          <Button
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            loading={isActionBusy}
                            onClick={() => handleUpdateStoreOrderStatus(ord.id, 'completed')}
                            style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 700, borderRadius: 8 }}
                          >
                            Mark Delivered & Completed
                          </Button>
                        )}

                        {ord.status !== 'completed' && ord.status !== 'cancelled' && (
                          <Button
                            danger
                            size="small"
                            loading={isActionBusy}
                            onClick={() => handleUpdateStoreOrderStatus(ord.id, 'cancelled')}
                            style={{ borderRadius: 8 }}
                          >
                            Cancel
                          </Button>
                        )}
                      </Space>

                      {/* Customer Communication Buttons */}
                      <Space wrap>
                        <Button
                          icon={<MessageOutlined />}
                          onClick={() => handleChatOpen(ord.customer_id, ord.shop_id, { username: ord.customer?.username || 'Customer' })}
                          style={{ borderRadius: 8, fontWeight: 600 }}
                        >
                          Chat Customer
                        </Button>
                        {(ord.customer_phone || ord.customer?.mobile) && (
                          <Button
                            icon={<PhoneOutlined />}
                            href={`tel:${ord.customer_phone || ord.customer?.mobile}`}
                            style={{ borderRadius: 8, fontWeight: 600 }}
                          >
                            Call
                          </Button>
                        )}
                      </Space>
                    </div>
                  </Card>
                );
              })}
            </Space>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: CUSTOMER ORDERS (Purchases made by this user)     */}
      {/* ========================================================= */}
      {((activeTab === 'customer_orders' || isCustomerOnly) && activeTab !== 'quotes') && (
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {/* Top Hyperlocal Tracker Header */}
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#0056bd',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: 2,
              }}
            >
              HYPERLOCAL TRACK
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1
                  style={{
                    margin: 0,
                    fontFamily: typography.fontFamily.headline,
                    fontWeight: 800,
                    fontSize: 'clamp(22px, 5vw, 28px)',
                    color: '#0B2D6B',
                    letterSpacing: '-0.5px',
                  }}
                >
                  Your Orders
                </h1>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#E6F0FF',
                    color: '#0056bd',
                    borderRadius: radii.full,
                    padding: '4px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: '#0056bd',
                      display: 'inline-block',
                    }}
                  />
                  {activeCustomerOrders.length > 0 ? activeCustomerOrders.length : 1} Live
                </div>
              </div>
            </div>
          </div>

          {/* Segmented Switcher Pills: Active Orders vs Past Orders */}
          <div
            style={{
              display: 'flex',
              background: '#EDEAE3',
              padding: 4,
              borderRadius: 9999,
              marginBottom: 18,
              gap: 4,
            }}
          >
            <button
              type="button"
              onClick={() => setCustomerOrderFilter('active')}
              style={{
                flex: 1,
                padding: '9px 16px',
                borderRadius: 9999,
                border: 'none',
                background: customerOrderFilter === 'active' || customerOrderFilter === 'all' ? '#0B2D6B' : 'transparent',
                color: customerOrderFilter === 'active' || customerOrderFilter === 'all' ? '#ffffff' : '#475467',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: customerOrderFilter === 'active' || customerOrderFilter === 'all' ? '0 2px 6px rgba(11, 45, 107, 0.2)' : 'none',
              }}
            >
              Active Orders ({activeCustomerOrders.length > 0 ? activeCustomerOrders.length : 1})
            </button>
            <button
              type="button"
              onClick={() => setCustomerOrderFilter('completed')}
              style={{
                flex: 1,
                padding: '9px 16px',
                borderRadius: 9999,
                border: 'none',
                background: customerOrderFilter === 'completed' ? '#0B2D6B' : 'transparent',
                color: customerOrderFilter === 'completed' ? '#ffffff' : '#475467',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: customerOrderFilter === 'completed' ? '0 2px 6px rgba(11, 45, 107, 0.2)' : 'none',
              }}
            >
              Past Orders ({pastCustomerOrders.length > 0 ? pastCustomerOrders.length : MOCK_PAST_ORDERS.length})
            </button>
          </div>

          {/* ACTIVE ORDERS SECTION */}
          {customerOrderFilter === 'active' && (
            <div>
              {activeCustomerOrders.length === 0 ? (
                /* Fallback High-Fidelity Mockup Active Order matching Stitch visual mockup */
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 20,
                    border: '1px solid #ECE7DF',
                    boxShadow: '0 2px 8px rgba(11, 45, 107, 0.04)',
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  {/* Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 18, color: '#0B2D6B' }}>
                        #{MOCK_ACTIVE_ORDER.order_number}
                      </span>
                      <span
                        style={{
                          background: '#FEF3C7',
                          color: '#92400E',
                          fontWeight: 700,
                          fontSize: 11,
                          borderRadius: 8,
                          padding: '2px 8px',
                        }}
                      >
                        Placed
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: 22, color: '#0B2D6B', lineHeight: 1.1 }}>
                        ₹{MOCK_ACTIVE_ORDER.total_amount}
                      </div>
                    </div>
                  </div>

                  {/* Subtitle Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: '#667085' }}>
                      Placed {MOCK_ACTIVE_ORDER.timeAgo} • {MOCK_ACTIVE_ORDER.stores_count} Neighborhood Stores
                    </div>
                    <span
                      style={{
                        background: '#EBF3FE',
                        color: '#0056bd',
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 6,
                        padding: '2px 8px',
                      }}
                    >
                      UPI Confirmed
                    </span>
                  </div>

                  {/* Progress Tracker */}
                  {renderProgressTracker('order_prepare', new Date(Date.now() - 12 * 60000))}

                  {/* Action Buttons inside Order Progress */}
                  <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                    <Button
                      icon={<PhoneOutlined />}
                      onClick={() => message.info('Calling neighborhood merchant dispatch...')}
                      style={{
                        flex: 1,
                        height: 40,
                        borderRadius: 9999,
                        border: '1.5px solid #D0D5DD',
                        background: '#FFFFFF',
                        color: '#1D2939',
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      Call Shop
                    </Button>
                    <Button
                      type="primary"
                      icon={<FileDoneOutlined />}
                      onClick={() => toggleExpand('mock-active-1')}
                      style={{
                        flex: 1,
                        height: 40,
                        borderRadius: 9999,
                        background: '#0B2D6B',
                        borderColor: '#0B2D6B',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {expandedOrders['mock-active-1'] ? 'Hide Summary' : 'View Summary'}
                    </Button>
                  </div>

                  {/* Expanded Receipt Breakdown if toggled */}
                  {expandedOrders['mock-active-1'] && (
                    <div
                      style={{
                        background: '#F9F8F5',
                        borderRadius: 14,
                        padding: '12px 14px',
                        border: '1px solid #ECE7DF',
                        marginBottom: 16,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#667085', marginBottom: 8, letterSpacing: '0.04em' }}>
                        ORDER SUMMARY BREAKDOWN
                      </div>
                      <div style={{ fontSize: 12.5, color: '#344054', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>2x Aavin Fresh Milk (Sri Krishna Provisions)</span>
                          <span style={{ fontWeight: 700 }}>₹48.00</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>1x Stone-Pressed Gingelly Oil 500ml (Sri Krishna Provisions)</span>
                          <span style={{ fontWeight: 700 }}>₹176.00</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>2x Fresh Ghee Podi Idli (Madras Tiffin Room)</span>
                          <span style={{ fontWeight: 700 }}>₹120.00</span>
                        </div>
                        <Divider style={{ margin: '8px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#667085', fontSize: 12 }}>
                          <span>Dunzo Valet Logistics</span>
                          <span>₹179.00</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#667085', fontSize: 12 }}>
                          <span>Platform Micro-Fee</span>
                          <span>₹0.00 (Zero Markup Direct Checkout)</span>
                        </div>
                        <Divider style={{ margin: '8px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: '#0B2D6B' }}>
                          <span>Total Settled via UPI</span>
                          <span>₹523.00</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STORE FULFILLMENT SECTION */}
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: '#667085',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      marginBottom: 10,
                    }}
                  >
                    STORE FULFILLMENT
                  </div>

                  {/* Subcard 1: Sri Krishna Provisions */}
                  <div
                    style={{
                      border: '1px solid #ECE7DF',
                      borderRadius: 16,
                      padding: 12,
                      marginBottom: 12,
                      background: '#FFFFFF',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={MOCK_ACTIVE_ORDER.stores[0].img_url}
                          alt="Sri Krishna Provisions"
                          style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15, color: '#0B2D6B', lineHeight: 1.2 }}>
                            {MOCK_ACTIVE_ORDER.stores[0].shop_name}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#667085', marginTop: 2 }}>
                            {MOCK_ACTIVE_ORDER.stores[0].distance}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          background: '#FEF3C7',
                          color: '#92400E',
                          fontSize: 11,
                          fontWeight: 700,
                          borderRadius: 8,
                          padding: '2px 8px',
                        }}
                      >
                        {MOCK_ACTIVE_ORDER.stores[0].status_label}
                      </span>
                    </div>

                    <div
                      style={{
                        background: '#F7F5F0',
                        borderRadius: 10,
                        padding: '8px 10px',
                        fontSize: 12,
                        color: '#344054',
                        marginBottom: 8,
                      }}
                    >
                      <strong>2 items:</strong> {MOCK_ACTIVE_ORDER.stores[0].items_text}
                    </div>

                    <div
                      style={{
                        background: '#EBF3FE',
                        borderRadius: 10,
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#0056bd', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {MOCK_ACTIVE_ORDER.stores[0].logistics_text}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#0056bd' }}>
                        {MOCK_ACTIVE_ORDER.stores[0].logistics_price}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        icon={<PhoneOutlined />}
                        onClick={() => message.info('Calling Sri Krishna Provisions (+91 98400 12345)...')}
                        style={{
                          flex: 1,
                          height: 36,
                          borderRadius: 9999,
                          border: '1px solid #D0D5DD',
                          color: '#1D2939',
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        Call Shop
                      </Button>
                      <Button
                        type="primary"
                        onClick={() => history.push(Routes.home)}
                        style={{
                          flex: 1,
                          height: 36,
                          borderRadius: 9999,
                          background: '#0B2D6B',
                          borderColor: '#0B2D6B',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        Order
                      </Button>
                    </div>
                  </div>

                  {/* Subcard 2: Madras Tiffin Room */}
                  <div
                    style={{
                      border: '1px solid #ECE7DF',
                      borderRadius: 16,
                      padding: 12,
                      background: '#FFFFFF',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={MOCK_ACTIVE_ORDER.stores[1].img_url}
                          alt="Madras Tiffin Room"
                          style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15, color: '#0B2D6B', lineHeight: 1.2 }}>
                            {MOCK_ACTIVE_ORDER.stores[1].shop_name}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#667085', marginTop: 2 }}>
                            {MOCK_ACTIVE_ORDER.stores[1].distance}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          background: '#EBF3FE',
                          color: '#0056bd',
                          fontSize: 11,
                          fontWeight: 700,
                          borderRadius: 8,
                          padding: '2px 8px',
                        }}
                      >
                        {MOCK_ACTIVE_ORDER.stores[1].status_label}
                      </span>
                    </div>

                    <div
                      style={{
                        background: '#F7F5F0',
                        borderRadius: 10,
                        padding: '8px 10px',
                        fontSize: 12,
                        color: '#344054',
                        marginBottom: 8,
                      }}
                    >
                      <strong>1 item:</strong> {MOCK_ACTIVE_ORDER.stores[1].items_text}
                    </div>

                    <div
                      style={{
                        background: '#F7F5F0',
                        borderRadius: 10,
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#344054', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        🏪 Self-Pickup OTP: <strong style={{ color: '#0f172a', letterSpacing: '0.5px' }}>{MOCK_ACTIVE_ORDER.stores[1].otp_code}</strong>
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                        {MOCK_ACTIVE_ORDER.stores[1].logistics_price}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        icon={<PhoneOutlined />}
                        onClick={() => message.info('Calling Madras Tiffin Room kitchen (+91 98400 67890)...')}
                        style={{
                          flex: 1,
                          height: 36,
                          borderRadius: 9999,
                          border: '1px solid #D0D5DD',
                          color: '#1D2939',
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        Call Kitchen
                      </Button>
                      <Button
                        type="primary"
                        onClick={() => history.push(Routes.home)}
                        style={{
                          flex: 1,
                          height: 36,
                          borderRadius: 9999,
                          background: '#0B2D6B',
                          borderColor: '#0B2D6B',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        Request
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {activeCustomerOrders.map((ord) => {
                    const isExpanded = expandedOrders[ord.id];
                    const items = ord.items || [];
                    const totalItemQty = items.reduce((sum, it) => sum + (it.quantity || 1), 0);
                    const timeAgo = ord.createdAt
                      ? `${Math.max(1, Math.round((Date.now() - new Date(ord.createdAt).getTime()) / 60000))}m ago`
                      : 'Just now';

                    return (
                      <div
                        key={ord.id}
                        style={{
                          background: '#ffffff',
                          borderRadius: radii.xl,
                          border: `1px solid ${colors.border}`,
                          boxShadow: '0 2px 10px rgba(11, 45, 107, 0.05)',
                          padding: 16,
                          marginBottom: 16,
                        }}
                      >
                        {/* Top Row: #RQ-84291 Placed badge ... Price & UPI Confirmed */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                              <span style={{ fontWeight: 800, fontSize: 16, color: colors.textMain }}>
                                #{ord.order_number}
                              </span>
                              {getStatusBadge(ord.status)}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>
                              Placed {timeAgo} · {ord.shop?.shop_name || 'Neighborhood Store'}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, fontSize: 20, color: colors.textMain, lineHeight: 1.1 }}>
                              ₹{(parseFloat(ord.total_amount) || 0).toFixed(0)}
                            </div>
                            <span
                              style={{
                                display: 'inline-block',
                                marginTop: 3,
                                background: colors.primaryLight,
                                color: colors.primary,
                                fontSize: 10,
                                fontWeight: 700,
                                borderRadius: 4,
                                padding: '1px 6px',
                              }}
                            >
                              {ord.payment_mode === 'direct_upi' ? 'UPI Confirmed' : 'Cash on Counter'}
                            </span>
                          </div>
                        </div>

                        {/* Order Progress Stepper */}
                        {renderProgressTracker(ord.status, ord.createdAt)}

                        {/* Action Buttons: [ 📞 Call Shop ] & [ 📄 View Summary ] */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                          <Button
                            icon={<PhoneOutlined />}
                            href={ord.shop?.mobile_number ? `tel:${ord.shop.mobile_number}` : undefined}
                            onClick={() => {
                              if (!ord.shop?.mobile_number) {
                                handleChatOpen(ord.shop?.owner_id, ord.shop_id, { shop_name: ord.shop?.shop_name });
                              }
                            }}
                            style={{
                              flex: 1,
                              height: 38,
                              borderRadius: radii.md,
                              fontWeight: 700,
                              borderColor: colors.border,
                              color: colors.primary,
                              background: '#ffffff',
                            }}
                          >
                            Call Shop
                          </Button>
                          <Button
                            type="primary"
                            icon={<FileDoneOutlined />}
                            onClick={() => toggleExpand(ord.id)}
                            style={{
                              flex: 1,
                              height: 38,
                              borderRadius: radii.md,
                              fontWeight: 700,
                              background: colors.primary,
                              borderColor: colors.primary,
                              color: '#ffffff',
                            }}
                          >
                            {isExpanded ? 'Hide Summary' : 'View Summary'}
                          </Button>
                        </div>

                        {/* Expanded Receipt Breakdown if requested */}
                        {isExpanded && (
                          <div
                            style={{
                              background: colors.surfaceContainerLow,
                              borderRadius: radii.md,
                              padding: '10px 12px',
                              border: `1px solid ${colors.borderLight}`,
                              marginBottom: 14,
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>
                              ORDER SUMMARY
                            </div>
                            {items.map((it, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  fontSize: 12,
                                  color: colors.textMain,
                                  padding: '3px 0',
                                }}
                              >
                                <span>{it.quantity}x {it.item_name}</span>
                                <span style={{ fontWeight: 700 }}>₹{it.subtotal?.toFixed(2)}</span>
                              </div>
                            ))}
                            <Divider style={{ margin: '6px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
                              <span>Platform Micro-Fee</span>
                              <span>₹{(parseFloat(ord.platform_fee) || 0).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800, color: colors.textMain, marginTop: 4 }}>
                              <span>Total Paid</span>
                              <span>₹{(parseFloat(ord.total_amount) || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        )}

                        {/* STORE FULFILLMENT SECTION */}
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', marginBottom: 8, textTransform: 'uppercase' }}>
                          STORE FULFILLMENT
                        </div>

                        <div
                          style={{
                            background: '#ffffff',
                            border: `1px solid ${colors.border}`,
                            borderRadius: radii.lg,
                            padding: 12,
                          }}
                        >
                          {/* Store mini header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <Avatar
                                shape="square"
                                size={42}
                                src={ord.shop?.img_url}
                                icon={<ShopOutlined />}
                                style={{
                                  borderRadius: radii.md,
                                  background: colors.primaryLight,
                                  color: colors.primary,
                                  flexShrink: 0,
                                }}
                              />
                              <div>
                                <div style={{ fontWeight: 800, fontSize: 14, color: colors.textMain }}>
                                  {ord.shop?.shop_name || 'Neighborhood Store'}
                                </div>
                                <div style={{ fontSize: 11, color: '#64748b' }}>
                                  {ord.order_type === 'pickup' ? 'Self-Pickup' : 'Direct Dispatch'} · Store #{ord.shop_id?.slice(0, 6) || 'Local'}
                                </div>
                              </div>
                            </div>

                            <span
                              style={{
                                background: ord.order_type === 'pickup' ? '#fef3c7' : colors.primaryLight,
                                color: ord.order_type === 'pickup' ? '#92400e' : colors.primary,
                                fontSize: 10,
                                fontWeight: 700,
                                borderRadius: 4,
                                padding: '2px 6px',
                              }}
                            >
                              {ord.order_type === 'pickup' ? 'Pickup Requested' : 'Delivery Active'}
                            </span>
                          </div>

                          {/* Items Shelf Container */}
                          <div
                            style={{
                              background: colors.surfaceContainerLow,
                              borderRadius: radii.md,
                              padding: '8px 12px',
                              fontSize: 12,
                              color: '#334155',
                              marginBottom: 8,
                            }}
                          >
                            <strong>
                              {totalItemQty} {totalItemQty === 1 ? 'item' : 'items'}:
                            </strong>{' '}
                            {items.length > 0
                              ? items.map((it) => `${it.item_name} (x${it.quantity})`).join(', ')
                              : 'Order placed with merchant'}
                          </div>

                          {/* Valet / OTP Strip */}
                          <div
                            style={{
                              background: ord.order_type === 'pickup' ? colors.surfaceContainer : '#e0f2fe',
                              color: ord.order_type === 'pickup' ? colors.textMain : '#0369a1',
                              borderRadius: radii.md,
                              padding: '8px 12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: 12,
                              fontWeight: 600,
                              marginBottom: 10,
                            }}
                          >
                            <span>
                              {ord.order_type === 'pickup'
                                ? `🏪 Self-Pickup OTP: ${ord.order_number ? ord.order_number.slice(-4) : '4921'}`
                                : '🛵 Dunzo / Local Valet arriving shortly'}
                            </span>
                            <span style={{ fontWeight: 800, color: colors.textMain }}>
                              ₹{(parseFloat(ord.total_amount) || 0).toFixed(0)}
                            </span>
                          </div>

                          {ord.order_type === 'delivery' && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                              <Button
                                size="small"
                                type="link"
                                onClick={() => handleSwitchToPickup(ord.id)}
                                style={{ padding: 0, fontSize: 11, fontWeight: 700, color: colors.primary }}
                              >
                                🏬 Switch to Self-Pickup
                              </Button>
                            </div>
                          )}

                          {/* Secondary actions: Call Shop & Chat */}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Button
                              icon={<PhoneOutlined />}
                              href={ord.shop?.mobile_number ? `tel:${ord.shop.mobile_number}` : undefined}
                              onClick={() => {
                                if (!ord.shop?.mobile_number) {
                                  handleChatOpen(ord.shop?.owner_id, ord.shop_id, { shop_name: ord.shop?.shop_name });
                                }
                              }}
                              style={{
                                flex: 1,
                                height: 36,
                                borderRadius: radii.md,
                                fontWeight: 700,
                                borderColor: colors.border,
                                color: colors.textMain,
                              }}
                            >
                              Call Shop
                            </Button>
                            <Button
                              type="primary"
                              onClick={() => handleChatOpen(ord.shop?.owner_id, ord.shop_id, { shop_name: ord.shop?.shop_name })}
                              style={{
                                flex: 1,
                                height: 36,
                                borderRadius: radii.md,
                                fontWeight: 700,
                                background: colors.primary,
                                borderColor: colors.primary,
                              }}
                            >
                              Order Chat
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* RECENT ORDERS / PAST ORDERS SECTION */}
          {(customerOrderFilter === 'completed' || customerOrderFilter === 'active' || customerOrderFilter === 'all') && (
            <div style={{ marginTop: 22 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontFamily: typography.fontFamily.headline,
                    fontWeight: 800,
                    fontSize: 18,
                    color: '#0B2D6B',
                  }}
                >
                  Recent Orders
                </h3>
                <span style={{ fontSize: 12, color: '#667085' }}>
                  All neighborhood verified
                </span>
              </div>

              {pastCustomerOrders.length > 0 ? (
                /* Render real past orders from DB */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {pastCustomerOrders.map((ord) => {
                    const dateStr = ord.createdAt
                      ? new Date(ord.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'Recent';
                    const items = ord.items || [];
                    const itemsSummary = items.map((i) => `${i.item_name} (x${i.quantity})`).join(', ') || 'Local Store Items';

                    return (
                      <div
                        key={ord.id}
                        style={{
                          background: '#FFFFFF',
                          borderRadius: 18,
                          border: '1px solid #ECE7DF',
                          padding: 14,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        }}
                      >
                        {/* Top status row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, color: '#64748b' }}>
                            {dateStr} • {ord.order_type === 'service' ? 'Service' : ord.order_type === 'pickup' ? 'Self-Pickup' : 'Delivery'}
                          </span>
                          <span
                            style={{
                              background: ord.status === 'completed' ? '#FEF3C7' : '#fef2f2',
                              color: ord.status === 'completed' ? '#92400E' : '#b91c1c',
                              borderRadius: 6,
                              padding: '2px 8px',
                              fontSize: 11,
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            {ord.status === 'completed' ? '✓ Completed' : 'Cancelled'}
                          </span>
                        </div>

                        {/* Store info & price */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                            <Avatar
                              shape="square"
                              size={48}
                              src={ord.shop?.img_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'}
                              icon={<ShopOutlined />}
                              style={{ borderRadius: 12, flexShrink: 0 }}
                            />
                            <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: 15,
                                  color: '#0B2D6B',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {ord.shop?.shop_name || 'Neighborhood Store'}
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: '#475467',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {itemsSummary}
                              </div>
                              <div style={{ fontSize: 11.5, color: '#0056bd', fontWeight: 600, marginTop: 1 }}>
                                Paid directly via UPI
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 18, color: '#0B2D6B' }}>
                              ₹{(parseFloat(ord.total_amount) || 0).toFixed(0)}
                            </div>
                          </div>
                        </div>

                        {/* Bottom row: Order ID & Action Button */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #F2EFE9' }}>
                          <span style={{ fontSize: 11.5, color: '#667085' }}>
                            Order ID: #{ord.order_number}
                          </span>
                          <Button
                            type="primary"
                            onClick={() => {
                              if (ord.shop_id) {
                                history.push(`/shop/${ord.shop_id}`);
                              } else {
                                history.push(Routes.home);
                              }
                            }}
                            style={{
                              background: '#0B2D6B',
                              borderColor: '#0B2D6B',
                              borderRadius: 9999,
                              fontWeight: 700,
                              padding: '0 18px',
                              height: 32,
                              fontSize: 12,
                            }}
                          >
                            {ord.order_type === 'service' ? 'Request' : 'Order'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Fallback High-Fidelity Mockup Past Orders List from Stitch visual mockup */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Past Order 1: Indiranagar AC Solutions */}
                  <div
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 18,
                      border: '1px solid #ECE7DF',
                      padding: 14,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: '#667085' }}>
                        {MOCK_PAST_ORDERS[0].dateStr}<span style={{ color: '#0056bd', fontWeight: 700 }}>{MOCK_PAST_ORDERS[0].typeLabel}</span>
                      </span>
                      <span
                        style={{
                          background: '#FEF3C7',
                          color: '#92400E',
                          borderRadius: 6,
                          padding: '2px 8px',
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        ✓ Completed
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                        <img
                          src={MOCK_PAST_ORDERS[0].img_url}
                          alt="Indiranagar AC Solutions"
                          style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: 15, color: '#0B2D6B' }}>
                            {MOCK_PAST_ORDERS[0].shop_name}
                          </div>
                          <div style={{ fontSize: 12, color: '#475467' }}>
                            {MOCK_PAST_ORDERS[0].service_title}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#667085' }}>
                            {MOCK_PAST_ORDERS[0].payment_note}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#0B2D6B', flexShrink: 0, marginLeft: 8 }}>
                        ₹{MOCK_PAST_ORDERS[0].price}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #F2EFE9' }}>
                      <span style={{ fontSize: 11.5, color: '#667085' }}>
                        {MOCK_PAST_ORDERS[0].reference_id}
                      </span>
                      <Button
                        type="primary"
                        onClick={() => history.push(Routes.home)}
                        style={{
                          background: '#0B2D6B',
                          borderColor: '#0B2D6B',
                          color: '#FFFFFF',
                          borderRadius: 9999,
                          fontWeight: 700,
                          height: 32,
                          padding: '0 18px',
                          fontSize: 12,
                        }}
                      >
                        Request
                      </Button>
                    </div>
                  </div>

                  {/* Past Order 2: 2 Stores Bundle */}
                  <div
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 18,
                      border: '1px solid #ECE7DF',
                      padding: 14,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: '#475467' }}>
                        {MOCK_PAST_ORDERS[1].dateStr}
                      </span>
                      <span
                        style={{
                          background: '#EBF3FE',
                          color: '#0056bd',
                          borderRadius: 6,
                          padding: '2px 8px',
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        ✓ Completed
                      </span>
                    </div>

                    <div style={{ fontSize: 12.5, color: '#344054', marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                        <span>{MOCK_PAST_ORDERS[1].bundle_items[0].name}</span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{MOCK_PAST_ORDERS[1].bundle_items[0].price}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                        <span>{MOCK_PAST_ORDERS[1].bundle_items[1].name}</span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{MOCK_PAST_ORDERS[1].bundle_items[1].price}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 8, borderTop: '1px solid #F2EFE9' }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#667085' }}>{MOCK_PAST_ORDERS[1].payment_note}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#0B2D6B' }}>₹{MOCK_PAST_ORDERS[1].price.toLocaleString()}</div>
                      </div>
                      <Button
                        type="primary"
                        onClick={() => history.push(Routes.home)}
                        style={{
                          background: '#0B2D6B',
                          borderColor: '#0B2D6B',
                          color: '#FFFFFF',
                          borderRadius: 9999,
                          fontWeight: 700,
                          height: 32,
                          padding: '0 18px',
                          fontSize: 12,
                        }}
                      >
                        Order
                      </Button>
                    </div>
                  </div>

                  {/* Past Order 3: Gramam Organic Store */}
                  <div
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 18,
                      border: '1px solid #ECE7DF',
                      padding: 14,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: '#475467' }}>
                        {MOCK_PAST_ORDERS[2].dateStr}
                      </span>
                      <span
                        style={{
                          background: '#EBF3FE',
                          color: '#0056bd',
                          borderRadius: 6,
                          padding: '2px 8px',
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        ✓ Completed
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                        <img
                          src={MOCK_PAST_ORDERS[2].img_url}
                          alt="Gramam Organic Store"
                          style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: 15, color: '#0B2D6B' }}>
                            {MOCK_PAST_ORDERS[2].shop_name}
                          </div>
                          <div style={{ fontSize: 12, color: '#475467' }}>
                            {MOCK_PAST_ORDERS[2].product_title}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#0056bd', fontWeight: 600 }}>
                            {MOCK_PAST_ORDERS[2].payment_note}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#0B2D6B', flexShrink: 0, marginLeft: 8 }}>
                        ₹{MOCK_PAST_ORDERS[2].price}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #F2EFE9' }}>
                      <span style={{ fontSize: 11.5, color: '#667085' }}>
                        {MOCK_PAST_ORDERS[2].reference_id}
                      </span>
                      <Button
                        type="primary"
                        onClick={() => history.push(Routes.home)}
                        style={{
                          background: '#0B2D6B',
                          borderColor: '#0B2D6B',
                          color: '#FFFFFF',
                          borderRadius: 9999,
                          fontWeight: 700,
                          height: 32,
                          padding: '0 18px',
                          fontSize: 12,
                        }}
                      >
                        Order
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: SERVICE QUOTES                                     */}
      {/* ========================================================= */}
      {activeTab === 'quotes' && (
        <div>
          {customerQuotes.length === 0 && storeQuotes.length === 0 ? (
            <Card style={{ borderRadius: 16, textAlign: 'center', padding: '40px 16px', border: '1px solid #e2e8f0' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No service quotes requested yet"
              >
                <Button
                  type="primary"
                  onClick={() => history.push(Routes.home)}
                  style={{ borderRadius: 8, fontWeight: 700 }}
                >
                  Find Technicians & Services
                </Button>
              </Empty>
            </Card>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              {/* If merchant received quotes for their services */}
              {storeQuotes.length > 0 && (
                <div>
                  <Title level={5} style={{ margin: '8px 0 12px 0' }}>
                    🛠️ Service Quote Requests for Your Stores ({storeQuotes.length})
                  </Title>
                  <Space direction="vertical" style={{ width: '100%' }} size={12}>
                    {storeQuotes.map((q) => (
                      <Card
                        key={q.id}
                        style={{
                          borderRadius: 14,
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                        }}
                        bodyStyle={{ padding: 14 }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>{q.service_title}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>
                              From Customer: <strong style={{ color: '#0f172a' }}>{q.customer?.username || 'Customer'}</strong> ({q.customer?.mobile || 'No Phone'})
                            </div>
                            {q.shop?.shop_name && (
                              <div style={{ fontSize: 11, color: colors.primary }}>For: {q.shop.shop_name}</div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: colors.primary }}>
                              ₹{q.estimated_amount?.toFixed(2)}
                            </div>
                            <Tag color="blue">{q.status}</Tag>
                          </div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, margin: '10px 0', fontSize: 12 }}>
                          {q.service_description}
                        </div>

                        <Button
                          type="primary"
                          icon={<MessageOutlined />}
                          onClick={() => handleChatOpen(q.customer_id, q.shop_id, { username: q.customer?.username })}
                          style={{ background: colors.primary, borderColor: colors.primary, borderRadius: 8, fontWeight: 700 }}
                        >
                          Chat with Customer
                        </Button>
                      </Card>
                    ))}
                  </Space>
                  <Divider style={{ margin: '24px 0' }} />
                </div>
              )}

              {/* Quotes requested by the user */}
              {customerQuotes.length > 0 && (
                <div>
                  {storeQuotes.length > 0 && (
                    <Title level={5} style={{ margin: '0 0 12px 0' }}>
                      📋 Your Requested Service Quotes ({customerQuotes.length})
                    </Title>
                  )}
                  <Space direction="vertical" style={{ width: '100%' }} size={12}>
                    {customerQuotes.map((q) => (
                      <Card
                        key={q.id}
                        style={{
                          borderRadius: 16,
                          border: `1px solid ${colors.border}`,
                          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                        }}
                        bodyStyle={{ padding: 16 }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>
                              {q.service_title}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>
                              <ShopOutlined /> {q.shop?.shop_name || 'Technician'} •{' '}
                              {new Date(q.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: colors.primary }}>
                              ₹{q.estimated_amount?.toFixed(2)}
                            </div>
                            <Tag color="blue" style={{ margin: 0, fontWeight: 700, borderRadius: 9999 }}>
                              {q.status}
                            </Tag>
                          </div>
                        </div>

                        <div
                          style={{
                            background: '#f8fafc',
                            padding: '10px 12px',
                            borderRadius: 10,
                            fontSize: 13,
                            color: '#475569',
                            border: `1px solid ${colors.borderLight}`,
                            marginBottom: 14,
                          }}
                        >
                          {q.service_description}
                        </div>

                        <Row gutter={[8, 8]}>
                          <Col xs={12}>
                            <Button
                              type="primary"
                              block
                              icon={<MessageOutlined />}
                              onClick={() => handleChatOpen(q.shop?.owner_id, q.shop_id, { shop_name: q.shop?.shop_name })}
                              style={{ height: 40, borderRadius: 10, fontWeight: 700, background: colors.primary, borderColor: colors.primary }}
                            >
                              Discuss in Chat
                            </Button>
                          </Col>
                          <Col xs={12}>
                            <Button
                              block
                              icon={<ShopOutlined />}
                              onClick={() => history.push(`/shop/${q.shop_id}`)}
                              style={{ height: 40, borderRadius: 10, fontWeight: 700 }}
                            >
                              View Profile
                            </Button>
                          </Col>
                        </Row>
                      </Card>
                    ))}
                  </Space>
                </div>
              )}
            </Space>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default OrdersScreen;
