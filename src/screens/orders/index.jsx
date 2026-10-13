import React, { useEffect, useState } from 'react';
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
  Collapse,
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
  EnvironmentOutlined,
  DownOutlined,
  UpOutlined,
  ArrowRightOutlined,
  CheckCircleFilled,
  CompassOutlined,
} from '@ant-design/icons';
import { netWorkCall, apiConfig } from '../../app/utils';
import { useGlobalStore, useChatStore } from '../../app/services';
import { useHistory } from 'react-router-dom';
import Routes from '../../app/routes/routes';

const { Title, Text, Paragraph } = Typography;

const OrdersScreen = () => {
  const history = useHistory();
  const { user_data } = useGlobalStore((state) => state);
  const { handleChatOpen } = useChatStore((state) => state);

  const [ordersList, setOrdersList] = useState([]);
  const [quotesList, setQuotesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');
  const [orderFilter, setOrderFilter] = useState('all'); // 'all', 'active', 'completed'
  const [expandedOrders, setExpandedOrders] = useState({});

  useEffect(() => {
    if (!user_data?.user_id) {
      history.push(Routes.login);
      return;
    }

    let isMounted = true;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const [ordersRes, quotesRes] = await Promise.all([
          netWorkCall(apiConfig.orders_user, 'GET', null, false),
          netWorkCall(apiConfig.quotes_user, 'GET', null, false),
        ]);

        if (isMounted) {
          if (ordersRes?.data) setOrdersList(ordersRes.data);
          if (quotesRes?.data) setQuotesList(quotesRes.data);
        }
      } catch (err) {
        console.error('Error fetching order history:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [user_data]);

  const toggleExpand = (orderId) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'accepted':
        return (
          <Tag color="processing" style={{ borderRadius: 9999, fontWeight: 700, margin: 0 }}>
            <SyncOutlined spin /> In Progress
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
      default:
        return (
          <Tag color="warning" style={{ borderRadius: 9999, fontWeight: 700, margin: 0 }}>
            <ClockCircleOutlined /> Pending Acceptance
          </Tag>
        );
    }
  };

  // Progress Bar Steps (Placed -> Accepted -> Completed)
  const renderProgressTracker = (status) => {
    const isCancelled = status === 'cancelled';
    const isPending = status === 'pending';
    const isAccepted = status === 'accepted';
    const isCompleted = status === 'completed';

    if (isCancelled) {
      return (
        <div style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: 8, fontSize: 12, color: '#b91c1c', fontWeight: 600 }}>
          This order was cancelled.
        </div>
      );
    }

    const steps = [
      { key: 'placed', label: 'Placed', done: true, active: isPending },
      { key: 'accepted', label: 'Accepted', done: isAccepted || isCompleted, active: isAccepted },
      { key: 'completed', label: 'Completed', done: isCompleted, active: isCompleted },
    ];

    return (
      <div style={{ margin: '12px 0 14px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          {/* Connecting line */}
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
              width: isCompleted ? 'calc(100% - 32px)' : isAccepted ? '50%' : '0%',
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

  const filteredOrders = ordersList.filter((ord) => {
    if (orderFilter === 'active') return ord.status === 'pending' || ord.status === 'accepted';
    if (orderFilter === 'completed') return ord.status === 'completed';
    return true;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" tip="Loading Your Orders & Quotes..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '16px 12px 100px 12px' }}>
      {/* Mobile Top Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              My Orders & Quotes
            </Title>
            <Text type="secondary" style={{ fontSize: 13, color: '#64748b' }}>
              Direct connections • 0% middleman markups
            </Text>
          </div>

          <Button
            type="primary"
            size="small"
            onClick={() => history.push(Routes.home)}
            style={{ borderRadius: 9999, fontWeight: 700 }}
          >
            Explore Stores
          </Button>
        </div>
      </div>

      {/* Main Tabs (Orders vs Quotes) */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ marginBottom: 12 }}
        items={[
          {
            key: 'orders',
            label: (
              <span style={{ fontWeight: 700, fontSize: 15 }}>
                <OrderedListOutlined /> Direct Orders ({ordersList.length})
              </span>
            ),
          },
          {
            key: 'quotes',
            label: (
              <span style={{ fontWeight: 700, fontSize: 15 }}>
                <FileDoneOutlined /> Service Quotes ({quotesList.length})
              </span>
            ),
          },
        ]}
      />

      {/* ORDERS TAB CONTENT */}
      {activeTab === 'orders' && (
        <div>
          {/* Quick Filter Pills on Mobile */}
          <div className="horizontal-scroll-container" style={{ gap: 8, marginBottom: 16 }}>
            {[
              { id: 'all', label: `All (${ordersList.length})` },
              {
                id: 'active',
                label: `Active (${ordersList.filter((o) => o.status === 'pending' || o.status === 'accepted').length})`,
              },
              {
                id: 'completed',
                label: `Completed (${ordersList.filter((o) => o.status === 'completed').length})`,
              },
            ].map((f) => (
              <div
                key={f.id}
                className={`category-filter-pill ${orderFilter === f.id ? 'active' : ''}`}
                style={{ padding: '6px 14px', fontSize: 12 }}
                onClick={() => setOrderFilter(f.id)}
              >
                {f.label}
              </div>
            ))}
          </div>

          {filteredOrders.length === 0 ? (
            <Card style={{ borderRadius: 16, textAlign: 'center', padding: '40px 16px', border: '1px solid #e2e8f0' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No orders found in this view"
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
              {filteredOrders.map((ord) => {
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

                    {/* Visual Progress Tracker on Mobile */}
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

                      {/* Financial breakdown */}
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
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                      <Tag color="cyan" style={{ fontSize: 11, fontWeight: 600 }}>
                        {ord.payment_mode === 'direct_upi' ? '💳 Direct UPI' : '💵 Cash on Delivery'}
                      </Tag>
                      <Tag color="purple" style={{ fontSize: 11, fontWeight: 600 }}>
                        📍 {ord.order_type === 'delivery' ? 'Home Delivery' : ord.order_type === 'pickup' ? 'Store Pickup' : 'Service Visit'}
                      </Tag>
                    </div>

                    {/* High-Touch Target Mobile Action Buttons */}
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

      {/* QUOTES TAB CONTENT */}
      {activeTab === 'quotes' && (
        <div>
          {quotesList.length === 0 ? (
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
              {quotesList.map((q) => (
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
          )}
        </div>
      )}
    </div>
  );
};

export default OrdersScreen;
