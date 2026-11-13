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
  Descriptions,
  Divider,
} from 'antd';
import {
  DownloadOutlined,
  ReloadOutlined,
  SearchOutlined,
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
import { colors, radii, typography } from '../../app/styles/theme';

const { Text } = Typography;
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
    const baseStyle = { borderRadius: radii.full, fontWeight: 600, fontSize: 12, padding: '2px 10px', fontFamily: typography.fontFamily.body };
    switch (status) {
      case 'order_prepare':
      case 'preparing':
        return (
          <Tag style={{ ...baseStyle, background: colors.secondaryLight, color: colors.secondary, borderColor: 'rgba(1, 89, 197, 0.25)' }} icon={<SyncOutlined spin />}>
            Preparing
          </Tag>
        );
      case 'ready_for_pickup':
        return (
          <Tag style={{ ...baseStyle, background: colors.primaryLight, color: colors.primary, borderColor: 'rgba(11, 45, 107, 0.2)' }} icon={<CheckCircleOutlined />}>
            Ready Pickup
          </Tag>
        );
      case 'open_to_delivery':
        return (
          <Tag style={{ ...baseStyle, background: colors.secondaryLight, color: colors.secondary, borderColor: 'rgba(1, 89, 197, 0.25)' }} icon={<ClockCircleOutlined />}>
            Open to Delivery
          </Tag>
        );
      case 'out_for_delivery':
        return (
          <Tag style={{ ...baseStyle, background: colors.secondaryLight, color: colors.secondary, borderColor: 'rgba(1, 89, 197, 0.25)' }} icon={<CarOutlined />}>
            Out for Delivery
          </Tag>
        );
      case 'completed':
        return (
          <Tag style={{ ...baseStyle, background: colors.semantic.successLight, color: colors.semantic.success, borderColor: colors.semantic.successBorder }} icon={<CheckCircleOutlined />}>
            Completed
          </Tag>
        );
      case 'cancelled':
        return (
          <Tag style={{ ...baseStyle, background: colors.semantic.errorLight, color: colors.semantic.error, borderColor: colors.semantic.errorBorder }} icon={<CloseCircleOutlined />}>
            Cancelled
          </Tag>
        );
      case 'placed':
      case 'pending':
      default:
        return (
          <Tag style={{ ...baseStyle, background: colors.surfaceContainerLow, color: colors.textMuted, borderColor: colors.border }} icon={<ClockCircleOutlined />}>
            Placed / Pending
          </Tag>
        );
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
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Order Details
        </span>
      ),
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
            style={{ padding: 0, fontWeight: 700, fontSize: 13, color: colors.primary, fontFamily: typography.fontFamily.headline }}
          >
            #{record.order_number}
          </Button>
          <div style={{ fontSize: 11, color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
            {new Date(record.createdAt).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          <div style={{ marginTop: 2 }}>
            <Tag
              style={{
                fontSize: 10,
                padding: '1px 6px',
                margin: 0,
                borderRadius: radii.full,
                fontWeight: 600,
                background:
                  record.order_type === 'delivery'
                    ? colors.verifiedChipBg
                    : record.order_type === 'service'
                    ? colors.serviceChipBg
                    : colors.primaryLight,
                color:
                  record.order_type === 'delivery'
                    ? colors.verifiedChipText
                    : record.order_type === 'service'
                    ? colors.serviceChipText
                    : colors.primary,
                borderColor:
                  record.order_type === 'delivery'
                    ? colors.verifiedChipBorder
                    : record.order_type === 'service'
                    ? colors.serviceChipBorder
                    : 'rgba(11, 45, 107, 0.2)',
              }}
            >
              {record.order_type === 'delivery' ? '🚚 Delivery' : record.order_type === 'service' ? '🛠️ Service' : '🛍️ Pickup'}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Store & Owner
        </span>
      ),
      key: 'shop_info',
      width: 180,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 700, color: colors.textMain, fontFamily: typography.fontFamily.headline }}>
            {record.shop?.shop_name || 'Store'}
          </div>
          <div style={{ fontSize: 12, color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
            Owner: <span style={{ fontWeight: 600, color: colors.textMain }}>{record.shop?.owner?.username || 'Owner'}</span>
          </div>
          {record.shop?.owner?.mobile && (
            <div style={{ fontSize: 11, color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
              📞 {record.shop.owner.mobile}
            </div>
          )}
        </div>
      ),
    },
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Customer
        </span>
      ),
      key: 'customer_info',
      width: 160,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: colors.textMain, fontFamily: typography.fontFamily.body }}>
            {record.customer?.username || 'Customer'}
          </div>
          <div style={{ fontSize: 12, color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
            📞 {record.customer_phone || record.customer?.mobile || 'No Phone'}
          </div>
          {record.delivery_address && (
            <Tooltip title={record.delivery_address}>
              <div
                style={{
                  fontSize: 11,
                  color: colors.textLight,
                  maxWidth: 150,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontFamily: typography.fontFamily.body,
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
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Items
        </span>
      ),
      key: 'items',
      width: 180,
      render: (_, record) => {
        const items = record.items || [];
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 12, color: colors.textMain, fontFamily: typography.fontFamily.body }}>
              {items.length} item{items.length !== 1 ? 's' : ''}
            </div>
            {items.slice(0, 2).map((it, idx) => (
              <div key={idx} style={{ fontSize: 11, color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
                • {it.quantity}x {it.item_name}
              </div>
            ))}
            {items.length > 2 && (
              <div style={{ fontSize: 10, color: colors.textLight, fontFamily: typography.fontFamily.body }}>
                +{items.length - 2} more...
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Financials & Accounts
        </span>
      ),
      key: 'financials',
      width: 160,
      render: (_, record) => {
        const total = parseFloat(record.total_amount) || 0;
        const pFee = parseFloat(record.platform_fee) || 0;
        const netStore = total - pFee;
        return (
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: colors.primary, fontFamily: typography.fontFamily.headline }}>
              ₹{total.toFixed(2)}
            </div>
            <div style={{ fontSize: 11, color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
              Fee: <span style={{ color: colors.semantic.success, fontWeight: 600 }}>₹{pFee.toFixed(2)}</span>
            </div>
            <div style={{ fontSize: 11, color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
              Store: <span style={{ fontWeight: 600, color: colors.textMain }}>₹{netStore.toFixed(2)}</span>
            </div>
            <div style={{ fontSize: 10, color: colors.textLight, fontFamily: typography.fontFamily.body }}>
              {record.payment_mode || 'direct_upi'}
            </div>
          </div>
        );
      },
    },
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Status
        </span>
      ),
      key: 'status',
      width: 130,
      render: (_, record) => (
        <div>
          {getStatusTag(record.status)}
          <Select
            size="small"
            value={record.status}
            style={{ width: '100%', marginTop: 6, borderRadius: radii.md }}
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
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Actions
        </span>
      ),
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Button
            size="small"
            type="default"
            onClick={() => {
              setSelectedOrder(record);
              setDetailModalVisible(true);
            }}
            style={{
              borderRadius: radii.md,
              borderColor: colors.border,
              color: colors.secondary,
              fontWeight: 600,
              fontFamily: typography.fontFamily.body,
            }}
          >
            Details
          </Button>
          {record.shop?.owner_id && (
            <Button
              size="small"
              icon={<MessageOutlined />}
              onClick={() => handleChatOpen(record.shop.owner_id, record.shop_id, { shop_name: record.shop?.shop_name })}
              style={{
                borderRadius: radii.md,
                borderColor: colors.border,
                color: colors.primary,
                fontWeight: 600,
                fontFamily: typography.fontFamily.body,
              }}
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
        <Col xs={12} sm={8} lg={4}>
          <Card size="small" style={{ borderRadius: radii.lg, border: `1px solid ${colors.border}`, background: colors.surface }}>
            <Statistic
              title={<span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, fontFamily: typography.fontFamily.headline }}>Platform GMV</span>}
              value={accounts.totalGMV}
              precision={2}
              prefix="₹"
              valueStyle={{ color: colors.primary, fontWeight: 800, fontSize: 18, fontFamily: typography.fontFamily.headline }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card size="small" style={{ borderRadius: radii.lg, border: `1px solid ${colors.semantic.successBorder}`, background: colors.surface }}>
            <Statistic
              title={<span style={{ fontSize: 12, fontWeight: 600, color: colors.semantic.successHover, fontFamily: typography.fontFamily.headline }}>Platform Revenue</span>}
              value={accounts.totalPlatformFees}
              precision={2}
              prefix="₹"
              valueStyle={{ color: colors.semantic.success, fontWeight: 800, fontSize: 18, fontFamily: typography.fontFamily.headline }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card size="small" style={{ borderRadius: radii.lg, border: `1px solid ${colors.border}`, background: colors.surface }}>
            <Statistic
              title={<span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, fontFamily: typography.fontFamily.headline }}>Store Payouts</span>}
              value={accounts.netStorePayouts}
              precision={2}
              prefix="₹"
              valueStyle={{ color: colors.textMain, fontWeight: 800, fontSize: 18, fontFamily: typography.fontFamily.headline }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card size="small" style={{ borderRadius: radii.lg, border: `1px solid ${colors.verifiedChipBorder}`, background: colors.primaryLight }}>
            <Statistic
              title={<span style={{ fontSize: 12, fontWeight: 600, color: colors.primary, fontFamily: typography.fontFamily.headline }}>Delivery Fees</span>}
              value={accounts.totalDeliveryFees}
              precision={2}
              prefix="₹"
              valueStyle={{ color: colors.secondary, fontWeight: 800, fontSize: 18, fontFamily: typography.fontFamily.headline }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card size="small" style={{ borderRadius: radii.lg, border: `1px solid ${colors.serviceChipBorder}`, background: colors.serviceChipBg }}>
            <Statistic
              title={<span style={{ fontSize: 12, fontWeight: 600, color: colors.serviceChipText, fontFamily: typography.fontFamily.headline }}>Total Orders</span>}
              value={accounts.totalOrders}
              valueStyle={{ color: colors.tertiary, fontWeight: 800, fontSize: 18, fontFamily: typography.fontFamily.headline }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card size="small" style={{ borderRadius: radii.lg, border: `1px solid ${colors.border}`, background: colors.surfaceContainerLow }}>
            <Statistic
              title={<span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, fontFamily: typography.fontFamily.headline }}>Completed</span>}
              value={accounts.statusCounts?.completed || 0}
              valueStyle={{ color: colors.semantic.success, fontWeight: 800, fontSize: 18, fontFamily: typography.fontFamily.headline }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filter and Backup Export Header */}
      <Card
        style={{
          borderRadius: radii.xl,
          border: `1px solid ${colors.border}`,
          marginBottom: 16,
          background: colors.surface,
        }}
        styles={{ body: { padding: 16 } }}
      >
        <Row gutter={[12, 12]} align="middle" justify="space-between">
          <Col xs={24} md={12}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, width: '100%' }}>
              <Input
                placeholder="Search Order #, Shop, Owner, Customer, Phone..."
                prefix={<SearchOutlined style={{ color: colors.textLight }} />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', maxWidth: 280, borderRadius: radii.md }}
                allowClear
              />
              <Select
                value={selectedShopFilter}
                onChange={setSelectedShopFilter}
                style={{ width: '100%', maxWidth: 170, borderRadius: radii.md }}
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
                style={{ width: '100%', maxWidth: 150, borderRadius: radii.md }}
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
            </div>
          </Col>

          <Col xs={24} md={12} className="admin-orders-actions-col">
            <Space wrap>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchAdminOrders}
                loading={loading}
                style={{
                  borderRadius: radii.md,
                  borderColor: colors.border,
                  color: colors.textMain,
                  fontWeight: 600,
                  fontFamily: typography.fontFamily.body,
                }}
              >
                Refresh
              </Button>
              <Button
                type="default"
                icon={<FileTextOutlined />}
                onClick={handleExportAccountsCSV}
                style={{
                  borderColor: colors.secondary,
                  color: colors.secondary,
                  fontWeight: 600,
                  borderRadius: radii.md,
                  fontFamily: typography.fontFamily.body,
                }}
              >
                Export Accounts (CSV)
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExportBackupJSON}
                style={{
                  background: colors.primary,
                  borderColor: colors.primary,
                  fontWeight: 600,
                  borderRadius: radii.md,
                  fontFamily: typography.fontFamily.body,
                  boxShadow: '0 2px 8px rgba(11, 45, 107, 0.18)',
                }}
              >
                Backup Orders (JSON)
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Orders Table */}
      <div
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: radii.lg,
          overflow: 'hidden',
          background: colors.surface,
        }}
      >
        <Table
          columns={columns}
          dataSource={filteredOrders}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1100 }}
          pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '25', '50', '100'] }}
        />
      </div>

      {/* Order Detail Modal */}
      <Modal
        title={
          <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
            Order #{selectedOrder?.order_number || ''} Audit & Accounts Details
          </span>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button
            key="close"
            onClick={() => setDetailModalVisible(false)}
            style={{ borderRadius: radii.md, borderColor: colors.border, color: colors.textMain }}
          >
            Close
          </Button>,
        ]}
        width={700}
        style={{ maxWidth: 'calc(100vw - 24px)' }}
      >
        {selectedOrder && (
          <div>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Order Number">
                <Text strong style={{ color: colors.primary, fontFamily: typography.fontFamily.headline }}>
                  {selectedOrder.order_number}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {getStatusTag(selectedOrder.status)}
              </Descriptions.Item>
              <Descriptions.Item label="Order Type">
                <Tag
                  style={{
                    borderRadius: radii.full,
                    fontWeight: 600,
                    background: colors.secondaryLight,
                    color: colors.secondary,
                    borderColor: 'rgba(1, 89, 197, 0.25)',
                  }}
                >
                  {selectedOrder.order_type}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Date & Time">
                {new Date(selectedOrder.createdAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Store Name">
                <Text strong style={{ color: colors.textMain, fontFamily: typography.fontFamily.headline }}>
                  {selectedOrder.shop?.shop_name}
                </Text>
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
                <Text strong style={{ fontSize: 16, color: colors.primary, fontFamily: typography.fontFamily.headline, fontWeight: 800 }}>
                  ₹{parseFloat(selectedOrder.total_amount || 0).toFixed(2)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Platform Fee">
                <Text style={{ color: colors.semantic.success, fontWeight: 600 }}>
                  ₹{parseFloat(selectedOrder.platform_fee || 0).toFixed(2)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Delivery Fee">
                ₹{parseFloat(selectedOrder.delivery_fee || 0).toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="Net Merchant Payout">
                <Text strong style={{ color: colors.textMain, fontWeight: 700 }}>
                  ₹{(parseFloat(selectedOrder.total_amount || 0) - parseFloat(selectedOrder.platform_fee || 0)).toFixed(2)}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" style={{ margin: '16px 0 8px 0', fontSize: 13, fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
              Ordered Items ({selectedOrder.items?.length || 0})
            </Divider>
            <div style={{ background: colors.surfaceContainerLow, padding: 12, borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
              {(selectedOrder.items || []).map((it, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: idx !== selectedOrder.items.length - 1 ? `1px dashed ${colors.border}` : 'none',
                  }}
                >
                  <div>
                    <Text strong style={{ color: colors.textMain, fontFamily: typography.fontFamily.body }}>{it.item_name}</Text>
                    <div style={{ fontSize: 11, color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
                      Qty: {it.quantity} × ₹{it.unit_price}
                    </div>
                  </div>
                  <Text strong style={{ color: colors.primary, fontFamily: typography.fontFamily.headline, fontWeight: 700 }}>
                    ₹{it.subtotal || it.quantity * it.unit_price}
                  </Text>
                </div>
              ))}
            </div>

            <Divider orientation="left" style={{ margin: '16px 0 8px 0', fontSize: 13, fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
              Admin Override Status
            </Divider>
            <Space wrap>
              {['placed', 'order_prepare', 'ready_for_pickup', 'open_to_delivery', 'out_for_delivery', 'completed', 'cancelled'].map(
                (st) => {
                  const isCurrent = selectedOrder.status === st;
                  let bg = undefined;
                  let border = colors.border;
                  let textColor = colors.textMain;

                  if (isCurrent) {
                    if (st === 'order_prepare' || st === 'open_to_delivery' || st === 'out_for_delivery') {
                      bg = colors.secondary;
                      border = colors.secondary;
                      textColor = colors.white;
                    } else if (st === 'ready_for_pickup') {
                      bg = colors.primary;
                      border = colors.primary;
                      textColor = colors.white;
                    } else if (st === 'completed') {
                      bg = colors.semantic.success;
                      border = colors.semantic.success;
                      textColor = colors.white;
                    } else if (st === 'cancelled') {
                      bg = colors.semantic.error;
                      border = colors.semantic.error;
                      textColor = colors.white;
                    } else {
                      bg = colors.primary;
                      border = colors.primary;
                      textColor = colors.white;
                    }
                  } else if (st === 'cancelled') {
                    textColor = colors.semantic.error;
                  }

                  return (
                    <Button
                      key={st}
                      size="small"
                      onClick={() => handleAdminStatusChange(selectedOrder.id, st)}
                      loading={updatingStatus}
                      style={{
                        borderRadius: radii.md,
                        fontWeight: isCurrent ? 700 : 500,
                        background: bg,
                        borderColor: border,
                        color: textColor,
                        fontFamily: typography.fontFamily.body,
                      }}
                    >
                      {st.replace(/_/g, ' ')}
                    </Button>
                  );
                }
              )}
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminOrdersAccounts;
