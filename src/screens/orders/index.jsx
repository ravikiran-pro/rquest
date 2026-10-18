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
  Tooltip,
  Badge,
} from 'antd';
import {
  OrderedListOutlined,
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
import { useHistory } from 'react-router-dom';
import Routes from '../../app/routes/routes';
import AdminOrdersAccounts from '../admin/orders_accounts';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const OrdersScreen = () => {
  const history = useHistory();
  const { user_data } = useGlobalStore((state) => state);
  const { handleChatOpen } = useChatStore((state) => state);

  const { isAdmin, isMerchant: initialIsMerchant } = checkUserRole(user_data);

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

  // Customer Orders UI filter
  const [customerOrderFilter, setCustomerOrderFilter] = useState('all'); // 'all', 'active', 'completed'

  // Expandable items state
  const [expandedOrders, setExpandedOrders] = useState({});
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const isStoreOwner = myShops.length > 0 || initialIsMerchant;

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

  // Status badge helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'order_prepare':
      case 'preparing':
        return (
          <Tag color="processing" style={{ borderRadius: 9999, fontWeight: 700, margin: 0 }}>
            <SyncOutlined spin /> Preparing
          </Tag>
        );
      case 'accepted':
        return (
          <Tag color="processing" style={{ borderRadius: 9999, fontWeight: 700, margin: 0 }}>
            <SyncOutlined spin /> Accepted
          </Tag>
        );
      case 'packed':
      case 'ready_for_pickup':
        return (
          <Tag color="cyan" style={{ borderRadius: 9999, fontWeight: 700, margin: 0 }}>
            <CheckCircleFilled /> Ready for Pickup
          </Tag>
        );
      case 'open_to_delivery':
        return (
          <Tag color="gold" style={{ borderRadius: 9999, fontWeight: 700, margin: 0 }}>
            <ClockCircleOutlined /> Open to Delivery
          </Tag>
        );
      case 'out_for_delivery':
        return (
          <Tag color="purple" style={{ borderRadius: 9999, fontWeight: 700, margin: 0 }}>
            <CarOutlined /> Out for Delivery
          </Tag>
        );
      case 'completed':
        return (
          <Tag color="success" style={{ borderRadius: 9999, fontWeight: 700, margin: 0 }}>
            <CheckCircleOutlined /> Completed
          </Tag>
        );
      case 'cancelled':
      case 'rejected':
        return (
          <Tag color="error" style={{ borderRadius: 9999, fontWeight: 700, margin: 0 }}>
            <CloseCircleOutlined /> Cancelled
          </Tag>
        );
      case 'placed':
      default:
        return (
          <Tag color="warning" style={{ borderRadius: 9999, fontWeight: 700, margin: 0 }}>
            <ClockCircleOutlined /> Placed
          </Tag>
        );
    }
  };

  // Progress Bar Steps (Placed -> Accepted/Preparing -> Ready/Dispatched -> Completed)
  const renderProgressTracker = (status) => {
    const isCancelled = status === 'cancelled';
    const isPlaced = status === 'placed' || status === 'pending';
    const isPreparing = status === 'order_prepare' || status === 'preparing' || status === 'accepted';
    const isReadyOrDispatched = status === 'ready_for_pickup' || status === 'open_to_delivery' || status === 'out_for_delivery';
    const isCompleted = status === 'completed';

    if (isCancelled) {
      return (
        <div style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: 8, fontSize: 12, color: '#b91c1c', fontWeight: 600, margin: '10px 0' }}>
          This order was cancelled.
        </div>
      );
    }

    const steps = [
      { key: 'placed', label: 'Placed', done: true, active: isPlaced },
      { key: 'prep', label: 'Preparing', done: isPreparing || isReadyOrDispatched || isCompleted, active: isPreparing },
      { key: 'ready', label: 'Ready / Dispatch', done: isReadyOrDispatched || isCompleted, active: isReadyOrDispatched },
      { key: 'done', label: 'Completed', done: isCompleted, active: isCompleted },
    ];

    let fillPercent = '0%';
    if (isCompleted) fillPercent = 'calc(100% - 32px)';
    else if (isReadyOrDispatched) fillPercent = '66%';
    else if (isPreparing) fillPercent = '33%';

    return (
      <div style={{ margin: '12px 0 14px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '16px',
              right: '16px',
              height: '3px',
              background: '#e2e8f0',
              zIndex: 1,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '16px',
              width: fillPercent,
              height: '3px',
              background: '#10b981',
              zIndex: 2,
              transition: 'width 0.3s ease',
            }}
          />

          {steps.map((step, idx) => (
            <div key={idx} style={{ zIndex: 3, textAlign: 'center', minWidth: 60 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: step.done ? '#10b981' : '#f1f5f9',
                  border: step.active ? '3px solid #6ee7b7' : '2px solid #fff',
                  color: '#fff',
                  fontSize: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 4px auto',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                {step.done ? '✓' : idx + 1}
              </div>
              <span style={{ fontSize: 11, fontWeight: step.active ? 800 : 600, color: step.active ? '#0f172a' : '#64748b' }}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Filtered customer orders
  const filteredCustomerOrders = useMemo(() => {
    return customerOrders.filter((ord) => {
      if (customerOrderFilter === 'active') {
        return ord.status !== 'completed' && ord.status !== 'cancelled';
      }
      if (customerOrderFilter === 'completed') {
        return ord.status === 'completed';
      }
      return true;
    });
  }, [customerOrders, customerOrderFilter]);

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
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '16px 12px 100px 12px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <Title
              level={2}
              style={{
                margin: 0,
                fontWeight: 800,
                color: '#0f172a',
                fontSize: 'clamp(20px, 4vw, 26px)',
                letterSpacing: '-0.5px',
              }}
            >
              {isAdmin
                ? 'Platform Orders & Accounts Console'
                : isStoreOwner
                ? 'Store & Customer Orders'
                : 'My Orders & Quotes'}
            </Title>
            <Text type="secondary" style={{ fontSize: 13, color: '#64748b' }}>
              {isAdmin
                ? 'Super Admin oversight across all stores, customer orders, and financial accounts.'
                : isStoreOwner
                ? 'Manage incoming customer orders across your storefronts and track your personal orders.'
                : 'Track your local orders and service quotation requests.'}
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
      </div>

      {/* Main Tabs Navigation */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ marginBottom: 16 }}
        items={tabItems}
      />

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
                      borderRadius: 16,
                      border: ord.status === 'placed' ? '2px solid #6366f1' : '1px solid #e2e8f0',
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
                            backgroundColor: '#4f46e5',
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
                            <div style={{ fontSize: 11, color: '#4f46e5', fontWeight: 600 }}>
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
                        background: '#faf5ff',
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid #f3e8ff',
                        marginBottom: 12,
                        fontSize: 12,
                      }}
                    >
                      <div style={{ color: '#6b21a8', fontWeight: 600, marginBottom: 2 }}>
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
                            style={{ background: '#2563eb', borderColor: '#2563eb', fontWeight: 700, borderRadius: 8 }}
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
                            style={{ background: '#7c3aed', borderColor: '#7c3aed', fontWeight: 700, borderRadius: 8 }}
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
      {activeTab === 'customer_orders' && (
        <div>
          {/* Quick Filter Pills on Mobile */}
          <div className="horizontal-scroll-container" style={{ gap: 8, marginBottom: 16 }}>
            {[
              { id: 'all', label: `All (${customerOrders.length})` },
              {
                id: 'active',
                label: `Active (${customerOrders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length})`,
              },
              {
                id: 'completed',
                label: `Completed (${customerOrders.filter((o) => o.status === 'completed').length})`,
              },
            ].map((f) => (
              <div
                key={f.id}
                className={`category-filter-pill ${customerOrderFilter === f.id ? 'active' : ''}`}
                style={{ padding: '6px 14px', fontSize: 12 }}
                onClick={() => setCustomerOrderFilter(f.id)}
              >
                {f.label}
              </div>
            ))}
          </div>

          {filteredCustomerOrders.length === 0 ? (
            <Card style={{ borderRadius: 16, textAlign: 'center', padding: '40px 16px', border: '1px solid #e2e8f0' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No personal orders found in this view"
              >
                <Button
                  type="primary"
                  onClick={() => history.push(Routes.home)}
                  style={{ borderRadius: 8, fontWeight: 700 }}
                >
                  Browse Nearby Stores
                </Button>
              </Empty>
            </Card>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              {filteredCustomerOrders.map((ord) => {
                const isExpanded = expandedOrders[ord.id];
                const items = ord.items || [];
                const displayedItems = isExpanded ? items : items.slice(0, 2);

                return (
                  <Card
                    key={ord.id}
                    className="order-card-mobile"
                    style={{
                      borderRadius: 16,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                    }}
                    bodyStyle={{ padding: 16 }}
                  >
                    {/* Header Row: Store Profile + Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <Avatar
                          shape="square"
                          size={46}
                          src={ord.shop?.img_url}
                          icon={<ShopOutlined />}
                          style={{
                            borderRadius: 10,
                            background: '#eef2ff',
                            color: '#4f46e5',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: 15,
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              cursor: 'pointer',
                            }}
                            onClick={() => history.push(`/shop/${ord.shop_id}`)}
                          >
                            {ord.shop?.shop_name || 'Local Store'}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>
                            #{ord.order_number} • {new Date(ord.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        {getStatusBadge(ord.status)}
                      </div>
                    </div>

                    {/* Visual Progress Tracker */}
                    {renderProgressTracker(ord.status)}

                    {/* Receipt Items Box */}
                    <div
                      style={{
                        background: '#f8fafc',
                        borderRadius: 12,
                        padding: '10px 12px',
                        border: '1px solid #f1f5f9',
                        marginBottom: 12,
                      }}
                    >
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
                            ₹{it.subtotal?.toFixed(2)}
                          </span>
                        </div>
                      ))}

                      {items.length > 2 && (
                        <Button
                          type="link"
                          size="small"
                          onClick={() => toggleExpand(ord.id)}
                          style={{ padding: '4px 0', fontSize: 12, fontWeight: 700 }}
                        >
                          {isExpanded ? (
                            <>Show less <UpOutlined /></>
                          ) : (
                            <>+{items.length - 2} more items <DownOutlined /></>
                          )}
                        </Button>
                      )}

                      <Divider style={{ margin: '8px 0' }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                        <span>Rquest Platform Micro-Fee</span>
                        <span>₹{ord.platform_fee?.toFixed(2)}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                        <span>Total Payable</span>
                        <span style={{ color: '#4f46e5', fontSize: 17 }}>
                          ₹{ord.total_amount?.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Delivery & Payment details tag row */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                      <Tag color="cyan" style={{ fontSize: 11, fontWeight: 600 }}>
                        {ord.payment_mode === 'direct_upi' ? '💳 UPI' : '💵 Cash'}
                      </Tag>
                      <Tag color={ord.order_type === 'pickup' ? 'green' : 'purple'} style={{ fontSize: 11, fontWeight: 600 }}>
                        {ord.order_type === 'pickup' ? '🏬 Self-Pickup' : '🛵 Delivery'}
                      </Tag>
                      {ord.order_type === 'delivery' && (
                        <Tag color="geekblue" style={{ fontSize: 11, fontWeight: 600 }}>
                          Delivery Fee: ₹{(parseFloat(ord.delivery_fee) || 30).toFixed(0)}
                        </Tag>
                      )}
                    </div>

                    {/* Delivery status or Self-Pickup fallback banner */}
                    {ord.order_type === 'delivery' && ord.status !== 'completed' && ord.status !== 'cancelled' && (
                      <div
                        style={{
                          background: '#f8fafc',
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1px solid #e2e8f0',
                          marginBottom: 12,
                          fontSize: 12,
                        }}
                      >
                        {ord.delivery_partner ? (
                          <div style={{ color: '#0369a1', fontWeight: 600 }}>
                            🛵 Assigned Runner: {ord.delivery_partner.username}{' '}
                            {ord.delivery_partner.mobile && `(${ord.delivery_partner.mobile})`}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <span style={{ color: '#64748b' }}>
                              Broadcasting to local runners in your area...
                            </span>
                            <Button
                              size="small"
                              type="dashed"
                              onClick={() => handleSwitchToPickup(ord.id)}
                              style={{ borderRadius: 6, color: '#4f46e5', fontWeight: 700 }}
                            >
                              Switch to Self-Pickup
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {ord.order_type === 'pickup' && ord.status !== 'completed' && ord.status !== 'cancelled' && (
                      <div
                        style={{
                          background: '#f0fdf4',
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1px solid #bbf7d0',
                          marginBottom: 12,
                          fontSize: 12,
                          color: '#15803d',
                        }}
                      >
                        🏬 <strong>Ready for counter collection:</strong> Show order #{ord.order_number} to merchant.
                      </div>
                    )}

                    {/* Actions */}
                    <Row gutter={[8, 8]}>
                      <Col xs={12} sm={8}>
                        <Button
                          type="primary"
                          block
                          icon={<MessageOutlined />}
                          onClick={() => handleChatOpen(ord.shop?.owner_id, ord.shop_id, { shop_name: ord.shop?.shop_name })}
                          style={{
                            height: 40,
                            borderRadius: 10,
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                          }}
                        >
                          Chat
                        </Button>
                      </Col>

                      <Col xs={12} sm={8}>
                        <Button
                          block
                          icon={<ShopOutlined />}
                          onClick={() => history.push(`/shop/${ord.shop_id}`)}
                          style={{ height: 40, borderRadius: 10, fontWeight: 700 }}
                        >
                          Store
                        </Button>
                      </Col>

                      {ord.shop?.mobile_number && (
                        <Col xs={24} sm={8}>
                          <Button
                            block
                            icon={<PhoneOutlined />}
                            href={`tel:${ord.shop.mobile_number}`}
                            style={{ height: 40, borderRadius: 10, fontWeight: 700 }}
                          >
                            Call Merchant
                          </Button>
                        </Col>
                      )}
                    </Row>
                  </Card>
                );
              })}
            </Space>
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
                              <div style={{ fontSize: 11, color: '#4f46e5' }}>For: {q.shop.shop_name}</div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: '#4f46e5' }}>
                              ₹{q.estimated_amount?.toFixed(2)}
                            </div>
                            <Tag color="purple">{q.status}</Tag>
                          </div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, margin: '10px 0', fontSize: 12 }}>
                          {q.service_description}
                        </div>

                        <Button
                          type="primary"
                          icon={<MessageOutlined />}
                          onClick={() => handleChatOpen(q.customer_id, q.shop_id, { username: q.customer?.username })}
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
                          border: '1px solid #e2e8f0',
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
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#4f46e5' }}>
                              ₹{q.estimated_amount?.toFixed(2)}
                            </div>
                            <Tag color="purple" style={{ margin: 0, fontWeight: 700, borderRadius: 9999 }}>
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
                            border: '1px solid #f1f5f9',
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
                              style={{ height: 40, borderRadius: 10, fontWeight: 700 }}
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
  );
};

export default OrdersScreen;
