import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Button,
  Input,
  Select,
  Space,
  Typography,
  Modal,
  message,
  Tooltip,
  Badge,
  Descriptions,
  Divider,
} from 'antd';
import {
  DownloadOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShopOutlined,
  DollarOutlined,
  ShoppingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CarOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { apiConfig, netWorkCall } from '../../app/utils';
import { useChatStore } from '../../app/services';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const AdminOrdersAccounts = () => {
  const { handleChatOpen } = useChatStore((state) => state);

  const [orders, setOrders] = useState([]);
  const [accounts, setAccounts] = useState({
    totalOrders: 0,
    totalGMV: 0,
    totalPlatformFees: 0,
    totalDeliveryFees: 0,
    netStorePayouts: 0,
    statusCounts: {},
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShopFilter, setSelectedShopFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchAdminOrders = async () => {
    setLoading(true);
    try {
      const res = await netWorkCall(apiConfig.orders_admin, 'GET', null, true);
      if (res?.success && res?.data) {
        setOrders(res.data);
        if (res.accounts) {
          setAccounts(res.accounts);
        }
      } else {
        message.error(res?.error || 'Failed to load platform orders');
      }
    } catch (err) {
      console.error('Error fetching admin orders:', err);
      message.error('Failed to load platform orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminOrders();
  }, []);

  // Distinct shops for filter dropdown
  const uniqueShops = useMemo(() => {
    const map = new Map();
    orders.forEach((ord) => {
      if (ord.shop?.id && !map.has(ord.shop.id)) {
        map.set(ord.shop.id, ord.shop.shop_name || 'Store #' + ord.shop.id.slice(0, 6));
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      // Shop filter
      if (selectedShopFilter !== 'all' && ord.shop_id !== selectedShopFilter) {
        return false;
      }
      // Status filter
      if (selectedStatusFilter !== 'all' && ord.status !== selectedStatusFilter) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const num = (ord.order_number || '').toLowerCase();
        const shop = (ord.shop?.shop_name || '').toLowerCase();
        const owner = (ord.shop?.owner?.username || '').toLowerCase();
        const ownerPhone = (ord.shop?.owner?.mobile || '').toLowerCase();
        const customer = (ord.customer?.username || '').toLowerCase();
        const customerPhone = (ord.customer_phone || ord.customer?.mobile || '').toLowerCase();
        const address = (ord.delivery_address || '').toLowerCase();

        return (
          num.includes(q) ||
          shop.includes(q) ||
          owner.includes(q) ||
          ownerPhone.includes(q) ||
          customer.includes(q) ||
          customerPhone.includes(q) ||
          address.includes(q)
        );
      }
      return true;
    });
  }, [orders, selectedShopFilter, selectedStatusFilter, searchTerm]);

  // Status Badge Helper
  const getStatusTag = (status) => {
    switch (status) {
      case 'order_prepare':
      case 'preparing':
        return <Tag color="blue" icon={<SyncOutlined spin />}>Preparing</Tag>;
      case 'ready_for_pickup':
        return <Tag color="cyan" icon={<CheckCircleOutlined />}>Ready Pickup</Tag>;
      case 'open_to_delivery':
        return <Tag color="gold" icon={<ClockCircleOutlined />}>Open to Delivery</Tag>;
      case 'out_for_delivery':
        return <Tag color="purple" icon={<CarOutlined />}>Out for Delivery</Tag>;
      case 'completed':
        return <Tag color="success" icon={<CheckCircleOutlined />}>Completed</Tag>;
      case 'cancelled':
        return <Tag color="error" icon={<CloseCircleOutlined />}>Cancelled</Tag>;
      case 'placed':
      case 'pending':
      default:
        return <Tag color="warning" icon={<ClockCircleOutlined />}>Placed / Pending</Tag>;
    }
  };

  // Status update by admin
  const handleAdminStatusChange = async (orderId, newStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await netWorkCall(
        `${apiConfig.orders_status}/${orderId}/status`,
        'PUT',
        JSON.stringify({ status: newStatus }),
        true
      );
      if (res?.success) {
        message.success(`Order status updated to ${newStatus}`);
        fetchAdminOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
        }
      } else {
        message.error(res?.error || 'Failed to update order status');
      }
    } catch (err) {
      console.error(err);
      message.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Backup Orders as full JSON
  const handleExportBackupJSON = () => {
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        totalCount: orders.length,
        accountsSummary: accounts,
        orders: orders,
      };
      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rquest_orders_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('Orders JSON backup generated and downloaded successfully!');
    } catch (err) {
      console.error('Error generating backup:', err);
      message.error('Failed to export backup');
    }
  };

  // Export Accounts Ledger as CSV
  const handleExportAccountsCSV = () => {
    try {
      const headers = [
        'Order Number',
        'Date & Time',
        'Store Name',
        'Store ID',
        'Store Owner Username',
        'Store Owner Mobile',
        'Customer Username',
        'Customer Mobile',
        'Order Type',
        'Total Amount (INR)',
        'Platform Fee (INR)',
        'Delivery Fee (INR)',
        'Net Store Payout (INR)',
        'Payment Mode',
        'Status',
        'Items Count',
        'Items Breakdown',
        'Delivery Address',
      ];

      const rows = orders.map((ord) => {
        const itemsBreakdown = (ord.items || [])
          .map((it) => `${it.quantity}x ${it.item_name} (@₹${it.unit_price})`)
          .join('; ');
        const total = parseFloat(ord.total_amount) || 0;
        const pFee = parseFloat(ord.platform_fee) || 0;
        const dFee = parseFloat(ord.delivery_fee) || 0;
        const netStore = total - pFee;

        return [
          `"${ord.order_number || ''}"`,
          `"${new Date(ord.createdAt).toLocaleString()}"`,
          `"${(ord.shop?.shop_name || '').replace(/"/g, '""')}"`,
          `"${ord.shop_id || ''}"`,
          `"${(ord.shop?.owner?.username || '').replace(/"/g, '""')}"`,
          `"${ord.shop?.owner?.mobile || ''}"`,
          `"${(ord.customer?.username || '').replace(/"/g, '""')}"`,
          `"${ord.customer_phone || ord.customer?.mobile || ''}"`,
          `"${ord.order_type || ''}"`,
          total,
          pFee,
          dFee,
          netStore,
          `"${ord.payment_mode || ''}"`,
          `"${ord.status || ''}"`,
          ord.items?.length || 0,
          `"${itemsBreakdown.replace(/"/g, '""')}"`,
          `"${(ord.delivery_address || '').replace(/"/g, '""')}"`,
        ];
      });

      const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rquest_accounts_ledger_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('Accounts CSV ledger exported successfully!');
    } catch (err) {
      console.error('Error generating CSV ledger:', err);
      message.error('Failed to export accounts CSV');
    }
  };

  const columns = [
    {
      title: 'Order Details',
      key: 'order_details',
      width: 140,
      render: (_, record) => (
        <div>
          <Button
            type="link"
            onClick={() => {
              setSelectedOrder(record);
              setDetailModalVisible(true);
            }}
            style={{ padding: 0, fontWeight: 700, fontSize: 13, color: '#4f46e5' }}
          >
            #{record.order_number}
          </Button>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            {new Date(record.createdAt).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          <div style={{ marginTop: 2 }}>
            <Tag
              color={record.order_type === 'delivery' ? 'purple' : record.order_type === 'service' ? 'cyan' : 'blue'}
              style={{ fontSize: 10, padding: '0 4px', margin: 0 }}
            >
              {record.order_type === 'delivery' ? '🚚 Delivery' : record.order_type === 'service' ? '🛠️ Service' : '🛍️ Pickup'}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: 'Store & Owner',
      key: 'shop_info',
      width: 180,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 700, color: '#0f172a' }}>{record.shop?.shop_name || 'Store'}</div>
          <div style={{ fontSize: 12, color: '#475569' }}>
            Owner: <span style={{ fontWeight: 600 }}>{record.shop?.owner?.username || 'Owner'}</span>
          </div>
          {record.shop?.owner?.mobile && (
            <div style={{ fontSize: 11, color: '#64748b' }}>📞 {record.shop.owner.mobile}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Customer',
      key: 'customer_info',
      width: 160,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>
            {record.customer?.username || 'Customer'}
          </div>
          <div style={{ fontSize: 12, color: '#475569' }}>
            📞 {record.customer_phone || record.customer?.mobile || 'No Phone'}
          </div>
          {record.delivery_address && (
            <Tooltip title={record.delivery_address}>
              <div
                style={{
                  fontSize: 11,
                  color: '#94a3b8',
                  maxWidth: 150,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                📍 {record.delivery_address}
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Items',
      key: 'items',
      width: 180,
      render: (_, record) => {
        const items = record.items || [];
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 12 }}>
              {items.length} item{items.length !== 1 ? 's' : ''}
            </div>
            {items.slice(0, 2).map((it, idx) => (
              <div key={idx} style={{ fontSize: 11, color: '#475569' }}>
                • {it.quantity}x {it.item_name}
              </div>
            ))}
            {items.length > 2 && (
              <div style={{ fontSize: 10, color: '#94a3b8' }}>+{items.length - 2} more...</div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Financials & Accounts',
      key: 'financials',
      width: 160,
      render: (_, record) => {
        const total = parseFloat(record.total_amount) || 0;
        const pFee = parseFloat(record.platform_fee) || 0;
        const netStore = total - pFee;
        return (
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>₹{total.toFixed(2)}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              Fee: <span style={{ color: '#059669', fontWeight: 600 }}>₹{pFee.toFixed(2)}</span>
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              Store: <span style={{ fontWeight: 600 }}>₹{netStore.toFixed(2)}</span>
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>{record.payment_mode || 'direct_upi'}</div>
          </div>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 130,
      render: (_, record) => (
        <div>
          {getStatusTag(record.status)}
          <Select
            size="small"
            value={record.status}
            style={{ width: '100%', marginTop: 6 }}
            onChange={(val) => handleAdminStatusChange(record.id, val)}
            loading={updatingStatus}
          >
            <Option value="placed">Placed</Option>
            <Option value="order_prepare">Order Prepare</Option>
            <Option value="ready_for_pickup">Ready for Pickup</Option>
            <Option value="open_to_delivery">Open to Delivery</Option>
            <Option value="out_for_delivery">Out for Delivery</Option>
            <Option value="completed">Completed</Option>
            <Option value="cancelled">Cancelled</Option>
          </Select>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Button
            size="small"
            type="primary"
            ghost
            onClick={() => {
              setSelectedOrder(record);
              setDetailModalVisible(true);
            }}
          >
            Details
          </Button>
          {record.shop?.owner_id && (
            <Button
              size="small"
              icon={<MessageOutlined />}
              onClick={() => handleChatOpen(record.shop.owner_id, record.shop_id, { shop_name: record.shop?.shop_name })}
            >
              Chat Store
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Financial Accounts KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <Statistic
              title={<span style={{ fontSize: 12, fontWeight: 600 }}>Platform GMV</span>}
              value={accounts.totalGMV}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#0f172a', fontWeight: 800, fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: '#ecfdf5' }}>
            <Statistic
              title={<span style={{ fontSize: 12, fontWeight: 600, color: '#065f46' }}>Platform Revenue</span>}
              value={accounts.totalPlatformFees}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#047857', fontWeight: 800, fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: '#f0fdf4' }}>
            <Statistic
              title={<span style={{ fontSize: 12, fontWeight: 600, color: '#166534' }}>Store Payouts</span>}
              value={accounts.netStorePayouts}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#15803d', fontWeight: 800, fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: '#f5f3ff' }}>
            <Statistic
              title={<span style={{ fontSize: 12, fontWeight: 600, color: '#5b21b6' }}>Delivery Fees</span>}
              value={accounts.totalDeliveryFees}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#6d28d9', fontWeight: 800, fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: '#fffbeb' }}>
            <Statistic
              title={<span style={{ fontSize: 12, fontWeight: 600, color: '#92400e' }}>Total Orders</span>}
              value={accounts.totalOrders}
              valueStyle={{ color: '#b45309', fontWeight: 800, fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: '#eff6ff' }}>
            <Statistic
              title={<span style={{ fontSize: 12, fontWeight: 600, color: '#1e40af' }}>Completed</span>}
              value={accounts.statusCounts?.completed || 0}
              valueStyle={{ color: '#2563eb', fontWeight: 800, fontSize: 18 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filter and Backup Export Header */}
      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          marginBottom: 16,
        }}
        bodyStyle={{ padding: 16 }}
      >
        <Row gutter={[12, 12]} align="middle" justify="space-between">
          <Col xs={24} md={12}>
            <Space wrap style={{ width: '100%' }}>
              <Input
                placeholder="Search Order #, Shop, Owner, Customer, Phone..."
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: 280, borderRadius: 8 }}
                allowClear
              />
              <Select
                value={selectedShopFilter}
                onChange={setSelectedShopFilter}
                style={{ width: 170 }}
              >
                <Option value="all">All Stores ({uniqueShops.length})</Option>
                {uniqueShops.map((s) => (
                  <Option key={s.id} value={s.id}>
                    {s.name}
                  </Option>
                ))}
              </Select>
              <Select
                value={selectedStatusFilter}
                onChange={setSelectedStatusFilter}
                style={{ width: 150 }}
              >
                <Option value="all">All Statuses</Option>
                <Option value="placed">Placed / Pending</Option>
                <Option value="order_prepare">Order Prepare</Option>
                <Option value="ready_for_pickup">Ready for Pickup</Option>
                <Option value="open_to_delivery">Open to Delivery</Option>
                <Option value="out_for_delivery">Out for Delivery</Option>
                <Option value="completed">Completed</Option>
                <Option value="cancelled">Cancelled</Option>
              </Select>
            </Space>
          </Col>

          <Col xs={24} md={12} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchAdminOrders}
                loading={loading}
              >
                Refresh
              </Button>
              <Button
                type="default"
                icon={<FileTextOutlined />}
                onClick={handleExportAccountsCSV}
                style={{ borderColor: '#10b981', color: '#047857', fontWeight: 600 }}
              >
                Export Accounts (CSV)
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExportBackupJSON}
                style={{ background: '#4f46e5', borderColor: '#4f46e5', fontWeight: 600 }}
              >
                Backup Orders (JSON)
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Orders Table */}
      <Table
        columns={columns}
        dataSource={filteredOrders}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1100 }}
        pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '25', '50', '100'] }}
      />

      {/* Order Detail Modal */}
      <Modal
        title={`Order #${selectedOrder?.order_number || ''} Audit & Accounts Details`}
        visible={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={700}
      >
        {selectedOrder && (
          <div>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Order Number">
                <Text strong>{selectedOrder.order_number}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {getStatusTag(selectedOrder.status)}
              </Descriptions.Item>
              <Descriptions.Item label="Order Type">
                <Tag color="purple">{selectedOrder.order_type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Date & Time">
                {new Date(selectedOrder.createdAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Store Name">
                <Text strong>{selectedOrder.shop?.shop_name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Store Owner">
                {selectedOrder.shop?.owner?.username} ({selectedOrder.shop?.owner?.mobile || 'No Phone'})
              </Descriptions.Item>
              <Descriptions.Item label="Customer">
                {selectedOrder.customer?.username || 'Customer'}
              </Descriptions.Item>
              <Descriptions.Item label="Customer Phone">
                {selectedOrder.customer_phone || selectedOrder.customer?.mobile || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Delivery Address" span={2}>
                {selectedOrder.delivery_address || 'Counter Pickup'}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Mode">
                {selectedOrder.payment_mode || 'direct_upi'}
              </Descriptions.Item>
              <Descriptions.Item label="Shop UPI ID">
                {selectedOrder.shop_upi_id || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Total Amount">
                <Text strong style={{ fontSize: 16, color: '#0f172a' }}>
                  ₹{parseFloat(selectedOrder.total_amount || 0).toFixed(2)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Platform Fee">
                <Text style={{ color: '#059669', fontWeight: 600 }}>
                  ₹{parseFloat(selectedOrder.platform_fee || 0).toFixed(2)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Delivery Fee">
                ₹{parseFloat(selectedOrder.delivery_fee || 0).toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="Net Merchant Payout">
                <Text strong style={{ color: '#2563eb' }}>
                  ₹{(parseFloat(selectedOrder.total_amount || 0) - parseFloat(selectedOrder.platform_fee || 0)).toFixed(2)}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" style={{ margin: '16px 0 8px 0', fontSize: 13 }}>
              Ordered Items ({selectedOrder.items?.length || 0})
            </Divider>
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>
              {(selectedOrder.items || []).map((it, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: idx !== selectedOrder.items.length - 1 ? '1px dashed #e2e8f0' : 'none',
                  }}
                >
                  <div>
                    <Text strong>{it.item_name}</Text>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      Qty: {it.quantity} × ₹{it.unit_price}
                    </div>
                  </div>
                  <Text strong style={{ color: '#0f172a' }}>
                    ₹{it.subtotal || it.quantity * it.unit_price}
                  </Text>
                </div>
              ))}
            </div>

            <Divider orientation="left" style={{ margin: '16px 0 8px 0', fontSize: 13 }}>
              Admin Override Status
            </Divider>
            <Space wrap>
              {['placed', 'order_prepare', 'ready_for_pickup', 'open_to_delivery', 'out_for_delivery', 'completed', 'cancelled'].map(
                (st) => (
                  <Button
                    key={st}
                    size="small"
                    type={selectedOrder.status === st ? 'primary' : 'default'}
                    danger={st === 'cancelled'}
                    onClick={() => handleAdminStatusChange(selectedOrder.id, st)}
                    loading={updatingStatus}
                  >
                    {st}
                  </Button>
                )
              )}
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminOrdersAccounts;
