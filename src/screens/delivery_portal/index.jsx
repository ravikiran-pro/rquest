import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Tag,
  Typography,
  Button,
  Row,
  Col,
  Space,
  Badge,
  Switch,
  message,
  Spin,
  Empty,
  Divider,
  Flex,
} from 'antd';
import {
  EnvironmentOutlined,
  ShopOutlined,
  PhoneOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { netWorkCall, apiConfig } from '../../app/utils';
import { useGlobalStore } from '../../app/services';
import { useHistory } from 'react-router-dom';
import Routes from '../../app/routes/routes';

const { Title, Text, Paragraph } = Typography;

const DeliveryPortalScreen = () => {
  const history = useHistory();
  const { user_data } = useGlobalStore((state) => state);

  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [availableFeed, setAvailableFeed] = useState([]);
  const [activeTab, setActiveTab] = useState('available');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const res = await netWorkCall(apiConfig.orders_delivery_feed, 'GET', null, true);
      if (res?.data) {
        setAvailableFeed(res.data);
      }
    } catch (err) {
      console.error('Error fetching delivery feed:', err);
      message.error('Failed to load delivery feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user_data?.user_id) {
      history.push(Routes.login);
      return;
    }
    fetchFeed();
  }, [user_data]);

  const handleClaim = async (orderId) => {
    setActionLoading(true);
    try {
      const res = await netWorkCall(
        `${apiConfig.orders_claim_delivery}/${orderId}/claim-delivery`,
        'PUT',
        null,
        true
      );
      if (res?.success) {
        message.success('Delivery task claimed! Please coordinate with the shop for pickup.');
        fetchFeed();
        setActiveTab('my_tasks');
      } else {
        message.error(res?.error || 'Failed to claim delivery');
      }
    } catch (err) {
      console.error('Error claiming delivery:', err);
      message.error('Failed to claim delivery task');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkDelivered = async (orderId) => {
    setActionLoading(true);
    try {
      const res = await netWorkCall(
        `${apiConfig.orders_status}/${orderId}/status`,
        'PUT',
        JSON.stringify({ status: 'completed' }),
        true
      );
      if (res?.success) {
        message.success('Order marked as delivered! Collect delivery fee directly from customer.');
        fetchFeed();
      } else {
        message.error(res?.error || 'Failed to update order status');
      }
    } catch (err) {
      console.error('Error completing delivery:', err);
      message.error('Failed to update delivery');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter tasks
  const openTasks = availableFeed.filter(
    (o) => !o.delivery_partner_id && o.status !== 'completed' && o.status !== 'cancelled'
  );
  const myTasks = availableFeed.filter(
    (o) => o.delivery_partner_id === user_data?.user_id && o.status !== 'completed'
  );
  const completedTasks = availableFeed.filter(
    (o) => o.delivery_partner_id === user_data?.user_id && o.status === 'completed'
  );

  const totalEarned = completedTasks.reduce((sum, o) => sum + (parseFloat(o.delivery_fee) || 30.0), 0);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header Banner */}
      <Card
        style={{
          borderRadius: 18,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          border: '1px solid #312e81',
          marginBottom: 20,
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)',
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
          <div>
            <Space size={8} style={{ marginBottom: 6 }}>
              <Tag color="purple" style={{ borderRadius: 9999, fontWeight: 700, border: 'none' }}>
                0% COMMISSION SAAS
              </Tag>
              <Tag color="green" style={{ borderRadius: 9999, fontWeight: 700, border: 'none' }}>
                ACTIVE PARTNER PASS
              </Tag>
            </Space>
            <Title level={2} style={{ color: '#ffffff', margin: 0, fontWeight: 800 }}>
              Delivery Partner Portal
            </Title>
            <Paragraph style={{ color: '#94a3b8', margin: '4px 0 0', fontSize: 13 }}>
              Available pickup and delivery requests in your area.
            </Paragraph>
          </div>

          <Flex align="center" gap={16} wrap="wrap">
            <div style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '10px 16px', borderRadius: 12 }}>
              <Text style={{ color: '#cbd5e1', fontSize: 12, display: 'block', fontWeight: 600 }}>
                Availability Status
              </Text>
              <Space align="center" style={{ marginTop: 2 }}>
                <Switch
                  checked={isOnline}
                  onChange={(checked) => {
                    setIsOnline(checked);
                    message.info(checked ? 'You are now ONLINE' : 'You are now OFFLINE');
                  }}
                  checkedChildren="ONLINE"
                  unCheckedChildren="OFFLINE"
                />
                <Badge status={isOnline ? 'success' : 'default'} />
              </Space>
            </div>
            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={fetchFeed}
              style={{
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              Refresh Feed
            </Button>
          </Flex>
        </Flex>

        {/* Quick Earnings Bar */}
        <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.1)', margin: '18px 0 12px' }} />
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8}>
            <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>AVAILABLE IN LOCALITY</div>
            <div style={{ color: '#38bdf8', fontSize: 20, fontWeight: 800 }}>{openTasks.length} Tasks</div>
          </Col>
          <Col xs={12} sm={8}>
            <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>MY ACTIVE DELIVERIES</div>
            <div style={{ color: '#a855f7', fontSize: 20, fontWeight: 800 }}>{myTasks.length} Assigned</div>
          </Col>
          <Col xs={24} sm={8}>
            <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>TODAY&apos;S ESTIMATED EARNINGS</div>
            <div style={{ color: '#4ade80', fontSize: 20, fontWeight: 800 }}>
              ₹{totalEarned.toFixed(0)}
            </div>
          </Col>
        </Row>
      </Card>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        style={{ marginBottom: 20 }}
        items={[
          {
            key: 'available',
            label: `Available Tasks (${openTasks.length})`,
            children: (
              <div>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '50px 0' }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 12, color: '#64748b' }}>Scanning neighborhood tasks...</div>
                  </div>
                ) : openTasks.length === 0 ? (
                  <Empty
                    description="No open delivery requests in your 2 km zone right now"
                    style={{ margin: '60px 0' }}
                  >
                    <Button onClick={fetchFeed} type="primary" style={{ borderRadius: 8 }}>
                      Check Again
                    </Button>
                  </Empty>
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }} size={16}>
                    {openTasks.map((order) => {
                      const deliveryFee = parseFloat(order.delivery_fee) || 30.0;
                      return (
                        <Card
                          key={order.id}
                          style={{
                            borderRadius: 14,
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                          }}
                          bodyStyle={{ padding: 18 }}
                        >
                          <Flex justify="space-between" align="flex-start" wrap="wrap" gap={12}>
                            <div>
                              <Space size={8}>
                                <Text strong style={{ fontSize: 16, color: '#0f172a' }}>
                                  Order #{order.order_number}
                                </Text>
                                <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600 }}>
                                  READY FOR PICKUP
                                </Tag>
                              </Space>

                              <div style={{ marginTop: 10, fontSize: 13, color: '#334155' }}>
                                <div style={{ marginBottom: 4 }}>
                                  <ShopOutlined style={{ color: '#4f46e5', marginRight: 6 }} />
                                  <strong>Pickup:</strong> {order.shop?.shop_name || 'Local Store'}
                                  {order.shop?.address && (
                                    <span style={{ color: '#64748b', fontSize: 12 }}> ({order.shop.address})</span>
                                  )}
                                </div>
                                <div>
                                  <EnvironmentOutlined style={{ color: '#ef4444', marginRight: 6 }} />
                                  <strong>Delivery Drop:</strong>{' '}
                                  {order.delivery_address || 'Address provided to driver'}
                                </div>
                              </div>

                              <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                                Items: {order.items?.length || 1} • Store Bill: ₹{order.total_amount}{' '}
                                (Direct UPI to shop)
                              </div>
                            </div>

                            <Flex align="center" gap={16} wrap="wrap">
                              <div style={{ textAlign: 'right' }}>
                                <Text style={{ fontSize: 11, color: '#64748b', display: 'block', fontWeight: 600 }}>
                                  YOU COLLECT
                                </Text>
                                <Text strong style={{ fontSize: 22, color: '#10b981', fontWeight: 800 }}>
                                  ₹{deliveryFee.toFixed(0)}
                                </Text>
                              </div>

                              <Space>
                                <Button
                                  type="primary"
                                  loading={actionLoading}
                                  onClick={() => handleClaim(order.id)}
                                  style={{
                                    borderRadius: 8,
                                    background: '#4f46e5',
                                    fontWeight: 700,
                                    height: 38,
                                    padding: '0 20px',
                                  }}
                                >
                                  Claim Delivery
                                </Button>
                              </Space>
                            </Flex>
                          </Flex>
                        </Card>
                      );
                    })}
                  </Space>
                )}
              </div>
            ),
          },
          {
            key: 'my_tasks',
            label: `My Active Tasks (${myTasks.length})`,
            children: (
              <div>
                {myTasks.length === 0 ? (
                  <Empty description="You have no active claimed deliveries" style={{ margin: '60px 0' }} />
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }} size={16}>
                    {myTasks.map((order) => {
                      const deliveryFee = parseFloat(order.delivery_fee) || 30.0;
                      return (
                        <Card
                          key={order.id}
                          style={{
                            borderRadius: 14,
                            border: '1px solid #c7d2fe',
                            background: '#faf5ff',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.08)',
                          }}
                          bodyStyle={{ padding: 20 }}
                        >
                          <Flex justify="space-between" align="flex-start" wrap="wrap" gap={12}>
                            <div>
                              <Space size={8}>
                                <Text strong style={{ fontSize: 16, color: '#0f172a' }}>
                                  Order #{order.order_number}
                                </Text>
                                <Tag color="purple" style={{ borderRadius: 6, fontWeight: 700 }}>
                                  ASSIGNED TO YOU
                                </Tag>
                              </Space>

                              <div style={{ marginTop: 12, fontSize: 13, color: '#334155' }}>
                                <div style={{ marginBottom: 6 }}>
                                  <ShopOutlined style={{ color: '#4f46e5', marginRight: 6 }} />
                                  <strong>Store Contact:</strong> {order.shop?.shop_name} (
                                  {order.shop?.mobile_number || 'No phone'})
                                </div>
                                <div style={{ marginBottom: 6 }}>
                                  <PhoneOutlined style={{ color: '#10b981', marginRight: 6 }} />
                                  <strong>Customer Phone:</strong>{' '}
                                  <a href={`tel:${order.customer_phone || order.customer?.mobile}`}>
                                    {order.customer_phone || order.customer?.mobile || 'N/A'}
                                  </a>
                                </div>
                                <div>
                                  <EnvironmentOutlined style={{ color: '#ef4444', marginRight: 6 }} />
                                  <strong>Delivery Address:</strong> {order.delivery_address}
                                </div>
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <Text style={{ fontSize: 12, color: '#64748b', display: 'block', fontWeight: 600 }}>
                                Fee to Collect from Customer
                              </Text>
                              <Text strong style={{ fontSize: 24, color: '#10b981', fontWeight: 800 }}>
                                ₹{deliveryFee.toFixed(0)}
                              </Text>
                              <div style={{ marginTop: 12 }}>
                                <Button
                                  type="primary"
                                  loading={actionLoading}
                                  onClick={() => handleMarkDelivered(order.id)}
                                  style={{
                                    borderRadius: 8,
                                    background: '#10b981',
                                    borderColor: '#10b981',
                                    fontWeight: 700,
                                    height: 40,
                                    padding: '0 24px',
                                  }}
                                >
                                  ✓ Mark Delivered & Fee Collected
                                </Button>
                              </div>
                            </div>
                          </Flex>
                        </Card>
                      );
                    })}
                  </Space>
                )}
              </div>
            ),
          },
          {
            key: 'history',
            label: `Completed (${completedTasks.length})`,
            children: (
              <div>
                {completedTasks.length === 0 ? (
                  <Empty description="No completed deliveries recorded yet" style={{ margin: '60px 0' }} />
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }} size={12}>
                    {completedTasks.map((order) => (
                      <Card key={order.id} style={{ borderRadius: 12, border: '1px solid #e2e8f0' }} bodyStyle={{ padding: 14 }}>
                        <Flex justify="space-between" align="center">
                          <div>
                            <Text strong>#{order.order_number}</Text> - {order.shop?.shop_name}
                            <div style={{ fontSize: 12, color: '#64748b' }}>{order.delivery_address}</div>
                          </div>
                          <Tag color="success" style={{ fontWeight: 700 }}>
                            + ₹{(parseFloat(order.delivery_fee) || 30).toFixed(0)} Earned
                          </Tag>
                        </Flex>
                      </Card>
                    ))}
                  </Space>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

export default DeliveryPortalScreen;

