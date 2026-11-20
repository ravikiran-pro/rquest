import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Table,
  Row,
  Col,
  Tag,
  Button,
  Input,
  Select,
  Typography,
  Modal,
  message,
  Tooltip,
  Descriptions,
  Grid,
  DatePicker,
  Alert,
  Empty,
  Pagination,
  Skeleton,
  Flex,
  Spin,
} from 'antd';
import {
  DownloadOutlined,
  ReloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CarOutlined,
  CloseCircleOutlined,
  ExclamationCircleFilled,
  FileTextOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  ShopOutlined,
  ToolOutlined,
  FireOutlined,
  InboxOutlined,
  LikeOutlined,
  UserOutlined,
  WalletOutlined,
  RiseOutlined,
  BankOutlined,
} from '@ant-design/icons';
import ChatIcon from '../../app/components/common/ChatIcon';
import { apiConfig, netWorkCall } from '../../app/utils';
import { useChatStore } from '../../app/services';
import { colors, radii, typography } from '../../app/styles/theme';

const { Text } = Typography;
const { RangePicker } = DatePicker;

/* ------------------------------------------------------------------ */
/* Formatting & money helpers                                          */
/* ------------------------------------------------------------------ */

// Any value the API sends (number, numeric string, null, undefined) -> finite number
const toNum = (value) => {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n) => Math.round((toNum(n) + Number.EPSILON) * 100) / 100;

const formatINR = (value, decimals = 2) =>
  `₹${toNum(value).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

// Short form for the narrow KPI tiles on phones (full value stays in the tooltip)
const formatINRShort = (value) => {
  const n = toNum(value);
  const abs = Math.abs(n);
  if (abs >= 1e7) return `₹${(n / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
  if (abs >= 1000) return formatINR(n, 0);
  return formatINR(n, 2);
};

const toDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDateTime = (value) => {
  const d = toDate(value);
  return d
    ? d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';
};

const formatShortDateTime = (value) => {
  const d = toDate(value);
  return d
    ? d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : 'Date unknown';
};

// Local calendar date for export file names (toISOString would give the UTC date)
const localDateStamp = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const humanize = (value) =>
  value ? String(value).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '';

const lineTotal = (item) => {
  const sub = parseFloat(item?.subtotal);
  if (Number.isFinite(sub)) return sub;
  const qtyRaw = parseFloat(item?.quantity);
  const qty = Number.isFinite(qtyRaw) ? qtyRaw : 1;
  return toNum(item?.unit_price) * qty;
};

/**
 * Money for one order, matching how POST /orders stores it:
 *   total_amount = items subtotal + platform_fee   (delivery_fee is stored separately)
 *   store payout = total_amount - platform_fee
 * Missing or non-numeric values count as 0 so nothing renders as NaN.
 */
const getOrderMoney = (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  const itemsSubtotal = items.reduce((sum, it) => sum + lineTotal(it), 0);
  const platformFee = toNum(order?.platform_fee);
  const deliveryFee = toNum(order?.delivery_fee);
  const rawTotal = parseFloat(order?.total_amount);
  const total = Number.isFinite(rawTotal) ? rawTotal : itemsSubtotal + platformFee;
  return {
    itemsSubtotal: round2(itemsSubtotal),
    platformFee: round2(platformFee),
    deliveryFee: round2(deliveryFee),
    total: round2(total),
    storePayout: round2(Math.max(total - platformFee, 0)),
  };
};

/* ------------------------------------------------------------------ */
/* Status & order type vocabulary                                      */
/* ------------------------------------------------------------------ */

const TONES = {
  neutral: { bg: colors.surfaceContainerLow, fg: colors.textMuted, border: colors.border, solid: colors.textMuted },
  info: { bg: colors.semantic.infoLight, fg: colors.semantic.info, border: colors.semantic.infoBorder, solid: colors.secondary },
  navy: { bg: colors.primaryLight, fg: colors.primary, border: colors.verifiedChipBorder, solid: colors.primary },
  amber: { bg: colors.serviceChipBg, fg: colors.serviceChipText, border: colors.serviceChipBorder, solid: colors.tertiary },
  violet: { bg: colors.hyperBadgeBg, fg: colors.hyperBadgeText, border: colors.hyperBadgeBg, solid: colors.hyperBadgeDot },
  success: {
    bg: colors.semantic.successLight,
    fg: colors.semantic.successHover,
    border: colors.semantic.successBorder,
    solid: colors.semantic.successHover,
  },
  error: { bg: colors.semantic.errorLight, fg: colors.semantic.error, border: colors.semantic.errorBorder, solid: colors.semantic.error },
};

// Every status the backend accepts (PUT /orders/:id/status), one colour per stage.
// `group` folds aliases together for the status filter.
const STATUS_META = {
  placed: { label: 'Placed', tone: 'neutral', Icon: ClockCircleOutlined, group: 'placed' },
  pending: { label: 'Pending', tone: 'neutral', Icon: ClockCircleOutlined, group: 'placed' },
  accepted: { label: 'Accepted', tone: 'info', Icon: LikeOutlined, group: 'accepted' },
  order_prepare: { label: 'Preparing', tone: 'info', Icon: FireOutlined, group: 'order_prepare' },
  preparing: { label: 'Preparing', tone: 'info', Icon: FireOutlined, group: 'order_prepare' },
  packed: { label: 'Packed', tone: 'info', Icon: InboxOutlined, group: 'packed' },
  ready_for_pickup: { label: 'Ready for pickup', tone: 'navy', Icon: ShopOutlined, group: 'ready_for_pickup' },
  open_to_delivery: { label: 'Open to delivery', tone: 'amber', Icon: ClockCircleOutlined, group: 'open_to_delivery' },
  out_for_delivery: { label: 'Out for delivery', tone: 'violet', Icon: CarOutlined, group: 'out_for_delivery' },
  completed: { label: 'Completed', tone: 'success', Icon: CheckCircleOutlined, group: 'completed' },
  cancelled: { label: 'Cancelled', tone: 'error', Icon: CloseCircleOutlined, group: 'cancelled' },
};

const getStatusMeta = (status) =>
  STATUS_META[status] || {
    label: humanize(status) || 'Unknown',
    tone: 'neutral',
    Icon: ClockCircleOutlined,
    group: status || 'unknown',
  };

// Statuses the admin can set (same set as before)
const ADMIN_STATUSES = [
  'placed',
  'order_prepare',
  'ready_for_pickup',
  'open_to_delivery',
  'out_for_delivery',
  'completed',
  'cancelled',
];

// Filter groups, in workflow order. Groups outside the admin set only show when orders use them.
const STATUS_GROUP_ORDER = [
  'placed',
  'accepted',
  'order_prepare',
  'packed',
  'ready_for_pickup',
  'open_to_delivery',
  'out_for_delivery',
  'completed',
  'cancelled',
];

const ORDER_TYPES = {
  delivery: { label: 'Delivery', Icon: CarOutlined },
  pickup: { label: 'Pickup', Icon: ShopOutlined },
  service: { label: 'Service', Icon: ToolOutlined },
};
const getTypeMeta = (type) => ORDER_TYPES[type] || ORDER_TYPES.pickup;

const PAYMENT_LABELS = { direct_upi: 'Direct UPI', cod: 'Cash / COD' };
const paymentLabel = (mode) => PAYMENT_LABELS[mode || 'direct_upi'] || humanize(mode);

/* ------------------------------------------------------------------ */
/* CSV / download helpers                                              */
/* ------------------------------------------------------------------ */

const csvCell = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  let str = String(value);
  // Keep spreadsheet apps from running cell text as a formula (phone numbers like +91… stay as they are)
  if (/^[=@\t\r]/.test(str) || (/^[+-]/.test(str) && !/^[+-][\d\s-]+$/.test(str))) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
};

const downloadFile = (content, mimeType, fileName) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoking straight away can cancel the download in some browsers
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

const orderMatchesSearch = (ord, q) => {
  const haystack = [
    ord.order_number,
    ord.shop?.shop_name,
    ord.shop?.owner?.username,
    ord.shop?.owner?.mobile,
    ord.shop?.mobile_number,
    ord.customer?.username,
    ord.customer_phone,
    ord.customer?.mobile,
    ord.delivery_address,
  ];
  return haystack.some((v) => v && String(v).toLowerCase().includes(q));
};

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

const headFont = typography.fontFamily.headline;
const bodyFont = typography.fontFamily.body;
const numStyle = { fontVariantNumeric: 'tabular-nums' };

const StatusTag = ({ status, size }) => {
  const meta = getStatusMeta(status);
  const tone = TONES[meta.tone];
  const { Icon } = meta;
  return (
    <Tag
      icon={<Icon />}
      style={{
        margin: 0,
        borderRadius: radii.full,
        fontWeight: 600,
        fontSize: size === 'small' ? 11 : 12,
        lineHeight: size === 'small' ? '18px' : '20px',
        padding: size === 'small' ? '0 8px' : '1px 10px',
        background: tone.bg,
        color: tone.fg,
        borderColor: tone.border,
        fontFamily: bodyFont,
        whiteSpace: 'nowrap',
      }}
    >
      {meta.label}
    </Tag>
  );
};
StatusTag.propTypes = { status: PropTypes.string, size: PropTypes.string };

const TypeTag = ({ type }) => {
  const meta = getTypeMeta(type);
  const { Icon } = meta;
  return (
    <Tag
      icon={<Icon />}
      style={{
        margin: 0,
        borderRadius: radii.full,
        fontWeight: 600,
        fontSize: 11,
        lineHeight: '18px',
        padding: '0 8px',
        background: colors.surface,
        color: colors.textMuted,
        borderColor: colors.border,
        fontFamily: bodyFont,
      }}
    >
      {meta.label}
    </Tag>
  );
};
TypeTag.propTypes = { type: PropTypes.string };

const KpiCard = ({ label, value, fullValue, hint, accent, icon, loading, compact }) => (
  <div
    style={{
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: compact ? 12 : 16,
      border: `1px solid ${colors.border}`,
      borderRadius: radii.lg,
      background: colors.surface,
    }}
  >
    <Flex align="center" gap={8} style={{ minWidth: 0 }}>
      <span
        aria-hidden
        style={{
          width: 26,
          height: 26,
          flex: '0 0 26px',
          borderRadius: radii.md,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.surfaceContainerLow,
          color: accent,
          fontSize: 13,
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: colors.textMuted,
          fontFamily: headFont,
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </Flex>
    {loading ? (
      <Skeleton.Input active size="small" style={{ width: 110, minWidth: 0 }} />
    ) : (
      <Tooltip title={fullValue !== value ? fullValue : undefined}>
        <div
          style={{
            ...numStyle,
            fontSize: compact ? 19 : 22,
            fontWeight: 800,
            lineHeight: 1.2,
            color: accent,
            fontFamily: headFont,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {value}
        </div>
      </Tooltip>
    )}
    <div style={{ fontSize: 12, color: colors.textLight, fontFamily: bodyFont, lineHeight: 1.35, marginTop: 'auto' }}>
      {hint}
    </div>
  </div>
);
KpiCard.propTypes = {
  label: PropTypes.node,
  value: PropTypes.node,
  fullValue: PropTypes.node,
  hint: PropTypes.node,
  accent: PropTypes.string,
  icon: PropTypes.node,
  loading: PropTypes.bool,
  compact: PropTypes.bool,
};

const MoneyLine = ({ label, value, strong, muted, accent }) => (
  <Flex justify="space-between" align="baseline" gap={12} style={{ padding: '4px 0' }}>
    <span style={{ fontSize: 13, color: muted ? colors.textLight : colors.textMuted, fontFamily: bodyFont }}>{label}</span>
    <span
      style={{
        ...numStyle,
        fontSize: strong ? 15 : 13,
        fontWeight: strong ? 800 : 600,
        color: accent || colors.textMain,
        fontFamily: strong ? headFont : bodyFont,
        whiteSpace: 'nowrap',
      }}
    >
      {value}
    </span>
  </Flex>
);
MoneyLine.propTypes = {
  label: PropTypes.node,
  value: PropTypes.node,
  strong: PropTypes.bool,
  muted: PropTypes.bool,
  accent: PropTypes.string,
};

const panelStyle = {
  border: `1px solid ${colors.border}`,
  borderRadius: radii.lg,
  background: colors.surface,
};

const EMPTY_ACCOUNTS = {
  totalOrders: 0,
  totalGMV: 0,
  totalPlatformFees: 0,
  totalDeliveryFees: 0,
  netStorePayouts: 0,
  statusCounts: {},
};

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

const AdminOrdersAccounts = () => {
  const { handleChatOpen } = useChatStore((state) => state);
  const screens = Grid.useBreakpoint();
  // useBreakpoint is empty on the very first render; fall back to the window width
  const isPhone =
    screens.md === undefined ? typeof window !== 'undefined' && window.innerWidth < 768 : !screens.md;
  const [modal, modalContextHolder] = Modal.useModal();

  const aliveRef = useRef(true);
  useEffect(
    () => () => {
      aliveRef.current = false;
    },
    []
  );

  const [orders, setOrders] = useState([]);
  const [accounts, setAccounts] = useState(EMPTY_ACCOUNTS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShopFilter, setSelectedShopFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState([null, null]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchAdminOrders = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await netWorkCall(apiConfig.orders_admin, 'GET', null, true);
      if (!aliveRef.current) return;
      if (res?.success && Array.isArray(res.data)) {
        setOrders(res.data);
        setAccounts(res.accounts || EMPTY_ACCOUNTS);
        setLoadError(null);
      } else {
        const msg = res?.error || 'Failed to load platform orders';
        setLoadError(msg);
        if (!silent) message.error(msg);
      }
    } catch (err) {
      console.error('Error fetching admin orders:', err);
      if (!aliveRef.current) return;
      setLoadError('Could not reach the server. Check your connection and try again.');
      if (!silent) message.error('Failed to load platform orders');
    } finally {
      if (aliveRef.current && !silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminOrders();
  }, [fetchAdminOrders]);

  // Back to page 1 whenever the filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedShopFilter, selectedStatusFilter, dateRange]);

  // Always show the freshest copy of the open order (status changes, refreshes)
  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || selectedSnapshot,
    [orders, selectedOrderId, selectedSnapshot]
  );

  const openOrder = (record) => {
    setSelectedOrderId(record.id);
    setSelectedSnapshot(record);
    setDetailModalVisible(true);
  };

  // Distinct shops for filter dropdown
  const uniqueShops = useMemo(() => {
    const map = new Map();
    orders.forEach((ord) => {
      const id = ord.shop?.id || ord.shop_id;
      if (id && !map.has(id)) {
        map.set(id, ord.shop?.shop_name || `Store #${String(id).slice(0, 6)}`);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);

  const [dateFrom, dateTo] = dateRange || [];

  // Every filter except status, so the status options can show counts
  const baseFiltered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const fromTs = dateFrom ? dateFrom.startOf('day').valueOf() : null;
    const toTs = dateTo ? dateTo.endOf('day').valueOf() : null;
    return orders.filter((ord) => {
      if (selectedShopFilter !== 'all' && (ord.shop_id || ord.shop?.id) !== selectedShopFilter) return false;
      if (fromTs !== null || toTs !== null) {
        const d = toDate(ord.createdAt);
        if (!d) return false;
        const t = d.getTime();
        if (fromTs !== null && t < fromTs) return false;
        if (toTs !== null && t > toTs) return false;
      }
      if (q && !orderMatchesSearch(ord, q)) return false;
      return true;
    });
  }, [orders, selectedShopFilter, searchTerm, dateFrom, dateTo]);

  const groupCounts = useMemo(() => {
    const counts = {};
    baseFiltered.forEach((ord) => {
      const g = getStatusMeta(ord.status).group;
      counts[g] = (counts[g] || 0) + 1;
    });
    return counts;
  }, [baseFiltered]);

  const filteredOrders = useMemo(
    () =>
      selectedStatusFilter === 'all'
        ? baseFiltered
        : baseFiltered.filter((ord) => getStatusMeta(ord.status).group === selectedStatusFilter),
    [baseFiltered, selectedStatusFilter]
  );

  const statusFilterOptions = useMemo(() => {
    const groups = STATUS_GROUP_ORDER.filter(
      (g) => ADMIN_STATUSES.includes(g) || groupCounts[g] > 0 || selectedStatusFilter === g
    );
    Object.keys(groupCounts).forEach((g) => {
      if (!groups.includes(g)) groups.push(g);
    });
    return [
      { value: 'all', label: `All statuses (${baseFiltered.length})` },
      ...groups.map((g) => ({ value: g, label: `${getStatusMeta(g).label} (${groupCounts[g] || 0})` })),
    ];
  }, [groupCounts, baseFiltered.length, selectedStatusFilter]);

  // Accounts for what is on screen. Cancelled orders carry no money, so they are left out.
  const stats = useMemo(() => {
    let gmv = 0;
    let fees = 0;
    let payouts = 0;
    let delivery = 0;
    let billable = 0;
    let cancelled = 0;
    let completed = 0;
    let deliveryOrders = 0;
    const stores = new Set();
    filteredOrders.forEach((ord) => {
      if (ord.status === 'cancelled') {
        cancelled += 1;
        return;
      }
      const m = getOrderMoney(ord);
      gmv += m.total;
      fees += m.platformFee;
      payouts += m.storePayout;
      delivery += m.deliveryFee;
      billable += 1;
      if (ord.status === 'completed') completed += 1;
      if (ord.order_type === 'delivery' || m.deliveryFee > 0) deliveryOrders += 1;
      const sid = ord.shop_id || ord.shop?.id;
      if (sid) stores.add(sid);
    });
    return {
      gmv: round2(gmv),
      fees: round2(fees),
      payouts: round2(payouts),
      delivery: round2(delivery),
      billable,
      cancelled,
      completed,
      inProgress: billable - completed,
      deliveryOrders,
      storeCount: stores.size,
    };
  }, [filteredOrders]);

  const filtersActive =
    !!searchTerm.trim() ||
    selectedShopFilter !== 'all' ||
    selectedStatusFilter !== 'all' ||
    !!dateFrom ||
    !!dateTo;

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedShopFilter('all');
    setSelectedStatusFilter('all');
    setDateRange([null, null]);
  };

  /* ---------------- status updates ---------------- */

  const updateOrderStatus = async (record, newStatus) => {
    setUpdatingId(record.id);
    try {
      const res = await netWorkCall(
        `${apiConfig.orders_status}/${record.id}/status`,
        'PUT',
        JSON.stringify({ status: newStatus }),
        true
      );
      if (!aliveRef.current) return;
      if (res?.success) {
        message.success(`Order #${record.order_number} is now ${getStatusMeta(newStatus).label}`);
        setOrders((prev) =>
          prev.map((o) =>
            o.id === record.id ? { ...o, status: newStatus, updatedAt: res.data?.updatedAt || o.updatedAt } : o
          )
        );
        setSelectedSnapshot((prev) => (prev && prev.id === record.id ? { ...prev, status: newStatus } : prev));
        // Refresh in the background so the accounts summary and other fields stay in sync
        fetchAdminOrders({ silent: true });
      } else {
        message.error(res?.error || 'Failed to update order status');
      }
    } catch (err) {
      console.error(err);
      message.error('Failed to update status');
    } finally {
      if (aliveRef.current) setUpdatingId(null);
    }
  };

  const confirmStatusChange = (record, newStatus) => {
    if (!newStatus || newStatus === record.status) return;
    const next = getStatusMeta(newStatus);
    const current = getStatusMeta(record.status);
    const isCancel = newStatus === 'cancelled';
    modal.confirm({
      title: isCancel
        ? `Cancel order #${record.order_number}?`
        : `Mark order #${record.order_number} as ${next.label}?`,
      icon: isCancel ? (
        <CloseCircleOutlined style={{ color: colors.semantic.error }} />
      ) : (
        <ExclamationCircleFilled style={{ color: colors.secondary }} />
      ),
      content: (
        <div style={{ fontFamily: bodyFont, color: colors.textMuted, fontSize: 13 }}>
          It is currently <strong>{current.label}</strong>. The customer is told about the change in chat and by
          push notification.
          {isCancel && ' Cancelled orders are left out of GMV, platform fees and store payouts.'}
        </div>
      ),
      okText: isCancel ? 'Cancel order' : `Mark ${next.label}`,
      cancelText: 'Keep current status',
      okButtonProps: { danger: isCancel },
      onOk: () => updateOrderStatus(record, newStatus),
    });
  };

  const renderStatusSelect = (record, { block = false, size } = {}) => {
    const busy = updatingId === record.id;
    return (
      <Select
        aria-label={`Change status of order ${record.order_number}`}
        size={size}
        value={null}
        placeholder={busy ? 'Updating…' : 'Change status'}
        loading={busy}
        disabled={busy}
        onChange={(val) => confirmStatusChange(record, val)}
        style={{ width: block ? '100%' : 150 }}
        popupMatchSelectWidth={false}
        options={ADMIN_STATUSES.map((st) => ({
          value: st,
          label: getStatusMeta(st).label,
          disabled: st === record.status,
        }))}
      />
    );
  };

  /* ---------------- exports ---------------- */

  // Full JSON backup: every order the API returned, regardless of filters
  const handleExportBackupJSON = () => {
    if (!orders.length) {
      message.warning('There are no orders to back up yet');
      return;
    }
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        totalCount: orders.length,
        accountsSummary: accounts,
        orders,
      };
      downloadFile(
        JSON.stringify(exportData, null, 2),
        'application/json',
        `rquest_orders_backup_${localDateStamp()}.json`
      );
      message.success(`Backup of ${orders.length} orders downloaded`);
    } catch (err) {
      console.error('Error generating backup:', err);
      message.error('Failed to export backup');
    }
  };

  // Accounts ledger CSV: the orders that match the current filters
  const handleExportAccountsCSV = () => {
    if (!filteredOrders.length) {
      message.warning('No orders match the current filters');
      return;
    }
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
        'Items Subtotal (INR)',
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

      const rows = filteredOrders.map((ord) => {
        const m = getOrderMoney(ord);
        const itemsBreakdown = (ord.items || [])
          .map((it) => `${it.quantity ?? 1}x ${it.item_name || 'Item'} (@₹${toNum(it.unit_price).toFixed(2)})`)
          .join('; ');
        const d = toDate(ord.createdAt);
        return [
          csvCell(ord.order_number || ''),
          csvCell(d ? d.toLocaleString('en-IN') : ''),
          csvCell(ord.shop?.shop_name || ''),
          csvCell(ord.shop_id || ''),
          csvCell(ord.shop?.owner?.username || ''),
          csvCell(ord.shop?.owner?.mobile || ''),
          csvCell(ord.customer?.username || ''),
          csvCell(ord.customer_phone || ord.customer?.mobile || ''),
          csvCell(ord.order_type || ''),
          m.itemsSubtotal.toFixed(2),
          m.total.toFixed(2),
          m.platformFee.toFixed(2),
          m.deliveryFee.toFixed(2),
          m.storePayout.toFixed(2),
          csvCell(ord.payment_mode || ''),
          csvCell(ord.status || ''),
          (ord.items || []).length,
          csvCell(itemsBreakdown),
          csvCell(ord.delivery_address || ''),
        ];
      });

      // BOM so Excel reads the file as UTF-8 (₹ and non-Latin names)
      const csvContent = '﻿' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      downloadFile(csvContent, 'text/csv;charset=utf-8;', `rquest_accounts_ledger_${localDateStamp()}.csv`);
      message.success(`Accounts ledger exported (${filteredOrders.length} orders)`);
    } catch (err) {
      console.error('Error generating CSV ledger:', err);
      message.error('Failed to export accounts CSV');
    }
  };

  /* ---------------- table (tablet & desktop) ---------------- */

  const colTitle = (text) => (
    <span style={{ fontFamily: headFont, fontWeight: 700, color: colors.textMain, fontSize: 13 }}>{text}</span>
  );

  const renderChatButton = (record, props = {}) =>
    record.shop?.owner_id ? (
      <Button
        icon={<ChatIcon />}
        onClick={() => handleChatOpen(record.shop.owner_id, record.shop_id, { shop_name: record.shop?.shop_name })}
        style={{ borderRadius: radii.md, borderColor: colors.border, color: colors.primary, fontWeight: 600 }}
        {...props}
      >
        Chat store
      </Button>
    ) : null;

  const columns = [
    {
      title: colTitle('Order'),
      key: 'order_details',
      width: 150,
      fixed: 'left',
      render: (_, record) => (
        <div style={{ minWidth: 0 }}>
          <Button
            type="link"
            onClick={() => openOrder(record)}
            style={{
              padding: 0,
              height: 'auto',
              fontWeight: 700,
              fontSize: 13,
              color: colors.primary,
              fontFamily: headFont,
              maxWidth: '100%',
              whiteSpace: 'normal',
              textAlign: 'left',
              wordBreak: 'break-all',
            }}
          >
            #{record.order_number || '—'}
          </Button>
          <div style={{ fontSize: 12, color: colors.textMuted, margin: '2px 0 6px' }}>
            {formatShortDateTime(record.createdAt)}
          </div>
          <TypeTag type={record.order_type} />
        </div>
      ),
    },
    {
      title: colTitle('Store & owner'),
      key: 'shop_info',
      width: 180,
      render: (_, record) => (
        <div style={{ minWidth: 0 }}>
          <Text strong ellipsis={{ tooltip: record.shop?.shop_name }} style={{ display: 'block', fontFamily: headFont }}>
            {record.shop?.shop_name || 'Store'}
          </Text>
          <div style={{ fontSize: 12, color: colors.textMuted }}>
            <UserOutlined style={{ marginRight: 4 }} />
            {record.shop?.owner?.username || 'Owner'}
          </div>
          {(record.shop?.owner?.mobile || record.shop?.mobile_number) && (
            <div style={{ fontSize: 12, color: colors.textMuted }}>
              <PhoneOutlined style={{ marginRight: 4 }} />
              {record.shop?.owner?.mobile || record.shop?.mobile_number}
            </div>
          )}
        </div>
      ),
    },
    {
      title: colTitle('Customer'),
      key: 'customer_info',
      width: 170,
      render: (_, record) => (
        <div style={{ minWidth: 0 }}>
          <Text strong ellipsis style={{ display: 'block', fontWeight: 600 }}>
            {record.customer?.username || 'Customer'}
          </Text>
          <div style={{ fontSize: 12, color: colors.textMuted }}>
            <PhoneOutlined style={{ marginRight: 4 }} />
            {record.customer_phone || record.customer?.mobile || 'No phone'}
          </div>
          {record.delivery_address && (
            <Tooltip title={record.delivery_address}>
              <div
                style={{
                  fontSize: 12,
                  color: colors.textLight,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <EnvironmentOutlined style={{ marginRight: 4 }} />
                {record.delivery_address}
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: colTitle('Items'),
      key: 'items',
      width: 170,
      render: (_, record) => {
        const items = record.items || [];
        return (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: colors.textMain }}>
              {items.length} item{items.length !== 1 ? 's' : ''}
            </div>
            {items.slice(0, 2).map((it, idx) => (
              <div
                key={it.id || idx}
                style={{ fontSize: 12, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {it.quantity ?? 1}× {it.item_name || 'Item'}
              </div>
            ))}
            {items.length > 2 && <div style={{ fontSize: 11, color: colors.textLight }}>+{items.length - 2} more</div>}
          </div>
        );
      },
    },
    {
      title: colTitle('Amount'),
      key: 'financials',
      width: 140,
      align: 'right',
      render: (_, record) => {
        const m = getOrderMoney(record);
        const isCancelled = record.status === 'cancelled';
        return (
          <div style={{ ...numStyle, fontSize: 12, color: colors.textMuted, lineHeight: 1.55 }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 14,
                color: isCancelled ? colors.textLight : colors.primary,
                fontFamily: headFont,
                textDecoration: isCancelled ? 'line-through' : 'none',
              }}
            >
              {formatINR(m.total)}
            </div>
            <div>
              Fee <span style={{ color: colors.semantic.successHover, fontWeight: 600 }}>{formatINR(m.platformFee)}</span>
            </div>
            <div>
              Store <span style={{ color: colors.textMain, fontWeight: 600 }}>{formatINR(m.storePayout)}</span>
            </div>
            <div style={{ fontSize: 11, color: colors.textLight }}>
              {isCancelled ? 'Not counted' : paymentLabel(record.payment_mode)}
            </div>
          </div>
        );
      },
    },
    {
      title: colTitle('Status'),
      key: 'status',
      width: 170,
      render: (_, record) => (
        <Flex vertical gap={6} align="flex-start">
          <StatusTag status={record.status} />
          {renderStatusSelect(record, { size: 'small' })}
        </Flex>
      ),
    },
    {
      title: colTitle('Actions'),
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Flex vertical gap={6} align="stretch">
          <Button
            size="small"
            onClick={() => openOrder(record)}
            style={{ borderRadius: radii.md, borderColor: colors.border, color: colors.secondary, fontWeight: 600 }}
          >
            Details
          </Button>
          {renderChatButton(record, { size: 'small' })}
        </Flex>
      ),
    },
  ];

  /* ---------------- phone card list ---------------- */

  const pagedOrders = useMemo(() => {
    const maxPage = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
    const current = Math.min(page, maxPage);
    return filteredOrders.slice((current - 1) * pageSize, current * pageSize);
  }, [filteredOrders, page, pageSize]);

  const renderOrderCard = (ord) => {
    const m = getOrderMoney(ord);
    const items = ord.items || [];
    const isCancelled = ord.status === 'cancelled';
    const itemsText = items
      .slice(0, 2)
      .map((it) => `${it.quantity ?? 1}× ${it.item_name || 'Item'}`)
      .join(', ');
    const label = { fontSize: 11, color: colors.textLight, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' };
    return (
      <div key={ord.id} style={{ ...panelStyle, padding: 14 }}>
        <Flex justify="space-between" align="flex-start" gap={8}>
          <div style={{ minWidth: 0 }}>
            <Button
              type="link"
              onClick={() => openOrder(ord)}
              style={{
                padding: 0,
                height: 'auto',
                fontWeight: 800,
                fontSize: 15,
                color: colors.primary,
                fontFamily: headFont,
                whiteSpace: 'normal',
                textAlign: 'left',
                wordBreak: 'break-all',
              }}
            >
              #{ord.order_number || '—'}
            </Button>
            <Flex align="center" gap={6} wrap="wrap" style={{ marginTop: 4 }}>
              <span style={{ fontSize: 12, color: colors.textMuted }}>{formatShortDateTime(ord.createdAt)}</span>
              <TypeTag type={ord.order_type} />
            </Flex>
          </div>
          <StatusTag status={ord.status} />
        </Flex>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: '10px 12px',
            margin: '12px 0',
            paddingTop: 12,
            borderTop: `1px dashed ${colors.border}`,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={label}>Store</div>
            <div style={{ fontWeight: 700, color: colors.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ord.shop?.shop_name || 'Store'}
            </div>
            <div style={{ fontSize: 12, color: colors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ord.shop?.owner?.username || 'Owner'}
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={label}>Customer</div>
            <div style={{ fontWeight: 700, color: colors.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ord.customer?.username || 'Customer'}
            </div>
            <div style={{ fontSize: 12, color: colors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ord.customer_phone || ord.customer?.mobile || 'No phone'}
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1', minWidth: 0 }}>
            <div style={label}>
              {items.length} item{items.length !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 13, color: colors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {itemsText || 'No items'}
              {items.length > 2 ? `, +${items.length - 2} more` : ''}
            </div>
          </div>
        </div>

        <div
          style={{
            ...numStyle,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 8,
            padding: '10px 12px',
            borderRadius: radii.md,
            background: colors.surfaceContainerLow,
            marginBottom: 12,
          }}
        >
          {[
            { k: 'Total', v: m.total, c: isCancelled ? colors.textLight : colors.primary, strong: true },
            { k: 'Platform fee', v: m.platformFee, c: colors.semantic.successHover },
            { k: 'Store payout', v: m.storePayout, c: colors.textMain },
          ].map((cell) => (
            <div key={cell.k} style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: colors.textLight, whiteSpace: 'nowrap' }}>{cell.k}</div>
              <div
                style={{
                  fontSize: cell.strong ? 14 : 13,
                  fontWeight: cell.strong ? 800 : 600,
                  color: cell.c,
                  fontFamily: cell.strong ? headFont : bodyFont,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textDecoration: cell.strong && isCancelled ? 'line-through' : 'none',
                }}
              >
                {formatINR(cell.v)}
              </div>
            </div>
          ))}
        </div>

        {renderStatusSelect(ord, { block: true })}
        <Flex gap={8} style={{ marginTop: 8 }}>
          <Button
            onClick={() => openOrder(ord)}
            style={{ flex: 1, height: 40, borderRadius: radii.md, color: colors.secondary, fontWeight: 600 }}
          >
            Details
          </Button>
          {renderChatButton(ord, { style: { flex: 1, height: 40, borderRadius: radii.md, color: colors.primary, fontWeight: 600 } })}
        </Flex>
      </div>
    );
  };

  /* ---------------- empty state ---------------- */

  const emptyState = (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        loadError && !orders.length
          ? 'Orders could not be loaded'
          : filtersActive
          ? 'No orders match these filters'
          : 'No orders have been placed yet'
      }
    >
      {filtersActive && (
        <Button onClick={clearFilters} style={{ borderRadius: radii.md }}>
          Clear filters
        </Button>
      )}
    </Empty>
  );

  /* ---------------- KPIs ---------------- */

  const initialLoading = loading && !orders.length;
  const kpis = [
    {
      key: 'gmv',
      label: 'Gross order value',
      value: stats.gmv,
      accent: colors.primary,
      icon: <RiseOutlined />,
      hint: `${stats.billable} order${stats.billable !== 1 ? 's' : ''}${
        stats.cancelled ? `, ${stats.cancelled} cancelled not counted` : ''
      }`,
    },
    {
      key: 'fees',
      label: 'Platform revenue',
      value: stats.fees,
      accent: colors.semantic.successHover,
      icon: <WalletOutlined />,
      hint: stats.billable ? `Avg ${formatINR(stats.fees / stats.billable)} per order` : 'No billable orders',
    },
    {
      key: 'payouts',
      label: 'Store payouts',
      value: stats.payouts,
      accent: colors.textMain,
      icon: <BankOutlined />,
      hint: `Owed to ${stats.storeCount} store${stats.storeCount !== 1 ? 's' : ''}`,
    },
    {
      key: 'delivery',
      label: 'Delivery fees',
      value: stats.delivery,
      accent: colors.secondary,
      icon: <CarOutlined />,
      hint: `${stats.deliveryOrders} delivery order${stats.deliveryOrders !== 1 ? 's' : ''}, paid to riders`,
    },
  ];

  /* ---------------- detail modal content ---------------- */

  const renderOrderDetail = (ord) => {
    const m = getOrderMoney(ord);
    const items = ord.items || [];
    const isCancelled = ord.status === 'cancelled';
    const descCols = isPhone ? 1 : 2;
    const sectionTitle = (text) => (
      <div style={{ fontFamily: headFont, fontWeight: 700, fontSize: 14, color: colors.textMain, margin: '18px 0 8px' }}>
        {text}
      </div>
    );
    const optionalStatuses = ADMIN_STATUSES.includes(ord.status) ? ADMIN_STATUSES : [ord.status, ...ADMIN_STATUSES];

    return (
      <div style={{ fontFamily: bodyFont }}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={10} style={{ marginBottom: 14 }}>
          <Flex align="center" gap={6} wrap="wrap">
            <StatusTag status={ord.status} />
            <TypeTag type={ord.order_type} />
            <span style={{ fontSize: 12, color: colors.textMuted }}>{formatDateTime(ord.createdAt)}</span>
          </Flex>
          <span
            style={{
              ...numStyle,
              fontFamily: headFont,
              fontWeight: 800,
              fontSize: 20,
              color: isCancelled ? colors.textLight : colors.primary,
              textDecoration: isCancelled ? 'line-through' : 'none',
            }}
          >
            {formatINR(m.total)}
          </span>
        </Flex>

        {isCancelled && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12, borderRadius: radii.md }}
            message="Cancelled orders are not counted in GMV, platform fees or store payouts."
          />
        )}

        <Descriptions bordered size="small" column={descCols}>
          <Descriptions.Item label="Store">
            <Text strong style={{ fontFamily: headFont }}>
              {ord.shop?.shop_name || 'Store'}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Store owner">
            {ord.shop?.owner?.username || '—'}
            {ord.shop?.owner?.mobile ? ` · ${ord.shop.owner.mobile}` : ''}
          </Descriptions.Item>
          <Descriptions.Item label="Customer">{ord.customer?.username || 'Customer'}</Descriptions.Item>
          <Descriptions.Item label="Customer phone">
            {ord.customer_phone || ord.customer?.mobile || 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Payment mode">{paymentLabel(ord.payment_mode)}</Descriptions.Item>
          <Descriptions.Item label="Shop UPI ID">
            <span style={{ wordBreak: 'break-all' }}>{ord.shop_upi_id || 'N/A'}</span>
          </Descriptions.Item>
          {ord.delivery_partner && (
            <Descriptions.Item label="Delivery partner" span={descCols}>
              {ord.delivery_partner.username || 'Rider'}
              {ord.delivery_partner.mobile ? ` · ${ord.delivery_partner.mobile}` : ''}
            </Descriptions.Item>
          )}
          <Descriptions.Item label={ord.order_type === 'delivery' ? 'Delivery address' : 'Address'} span={descCols}>
            {ord.delivery_address || 'Counter pickup'}
          </Descriptions.Item>
          {ord.notes && (
            <Descriptions.Item label="Customer notes" span={descCols}>
              {ord.notes}
            </Descriptions.Item>
          )}
          {ord.delivery_notes && (
            <Descriptions.Item label="Delivery notes" span={descCols}>
              {ord.delivery_notes}
            </Descriptions.Item>
          )}
        </Descriptions>

        {sectionTitle(`Items (${items.length})`)}
        <div style={{ ...panelStyle, background: colors.surfaceContainerLow, padding: '4px 12px' }}>
          {items.length === 0 && <div style={{ padding: '8px 0', color: colors.textLight, fontSize: 13 }}>No items recorded</div>}
          {items.map((it, idx) => (
            <Flex
              key={it.id || idx}
              justify="space-between"
              align="center"
              gap={12}
              style={{ padding: '8px 0', borderBottom: idx !== items.length - 1 ? `1px dashed ${colors.border}` : 'none' }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: colors.textMain, wordBreak: 'break-word' }}>{it.item_name || 'Item'}</div>
                <div style={{ ...numStyle, fontSize: 12, color: colors.textMuted }}>
                  {it.quantity ?? 1} × {formatINR(it.unit_price)}
                </div>
              </div>
              <span style={{ ...numStyle, fontWeight: 700, color: colors.primary, fontFamily: headFont, whiteSpace: 'nowrap' }}>
                {formatINR(lineTotal(it))}
              </span>
            </Flex>
          ))}
        </div>

        {sectionTitle('Accounts')}
        <div style={{ ...panelStyle, padding: '6px 12px' }}>
          <MoneyLine label="Items subtotal" value={formatINR(m.itemsSubtotal)} />
          <MoneyLine label="Platform fee" value={formatINR(m.platformFee)} accent={colors.semantic.successHover} />
          <div style={{ borderTop: `1px solid ${colors.borderLight}`, margin: '4px 0' }} />
          <MoneyLine label="Order total" value={formatINR(m.total)} strong accent={colors.primary} />
          <MoneyLine label="Store payout (total − platform fee)" value={formatINR(m.storePayout)} strong />
          <MoneyLine label="Delivery fee (to rider, billed separately)" value={formatINR(m.deliveryFee)} muted />
        </div>

        {sectionTitle('Change status')}
        <div
          role="group"
          aria-label="Change order status"
          style={{
            display: 'grid',
            gridTemplateColumns: isPhone ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
            gap: 8,
          }}
        >
          {optionalStatuses.map((st) => {
            const meta = getStatusMeta(st);
            const tone = TONES[meta.tone];
            const isCurrent = ord.status === st;
            const { Icon } = meta;
            return (
              <Button
                key={st}
                aria-pressed={isCurrent}
                icon={isCurrent ? <CheckOutlined /> : <Icon />}
                onClick={() => !isCurrent && confirmStatusChange(ord, st)}
                disabled={updatingId === ord.id && !isCurrent}
                style={{
                  height: 40,
                  borderRadius: radii.md,
                  fontWeight: isCurrent ? 700 : 600,
                  background: isCurrent ? tone.solid : colors.surface,
                  borderColor: isCurrent ? tone.solid : tone.border,
                  color: isCurrent ? colors.white : st === 'cancelled' ? colors.semantic.error : colors.textMain,
                  cursor: isCurrent ? 'default' : 'pointer',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {meta.label}
              </Button>
            );
          })}
        </div>
        {updatingId === ord.id && (
          <Flex align="center" gap={8} style={{ marginTop: 8, color: colors.textMuted, fontSize: 12 }}>
            <Spin size="small" /> Updating status…
          </Flex>
        )}
      </div>
    );
  };

  /* ---------------- layout ---------------- */

  const filterControlStyle = { width: '100%' };
  const resultSummary = `${filteredOrders.length} of ${orders.length} order${orders.length !== 1 ? 's' : ''}`;

  return (
    <div style={{ fontFamily: bodyFont, minWidth: 0 }}>
      {modalContextHolder}

      {/* Accounts KPIs: 2 per row on phones & tablets, 4 per row on desktop, equal heights */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {kpis.map((k) => (
          <Col key={k.key} xs={12} lg={6} style={{ display: 'flex' }}>
            <KpiCard
              label={k.label}
              value={isPhone ? formatINRShort(k.value) : formatINR(k.value)}
              fullValue={formatINR(k.value)}
              hint={k.hint}
              accent={k.accent}
              icon={k.icon}
              loading={initialLoading}
              compact={isPhone}
            />
          </Col>
        ))}
      </Row>

      {/* Toolbar: title, exports and filters */}
      <div style={{ ...panelStyle, padding: isPhone ? 12 : 16, marginBottom: 16 }}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={10} style={{ marginBottom: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: headFont, fontWeight: 800, fontSize: 16, color: colors.textMain }}>
              Platform orders
            </div>
            <div style={{ fontSize: 12, color: colors.textMuted }}>
              {initialLoading
                ? 'Loading orders…'
                : `${resultSummary} · ${stats.completed} completed · ${stats.inProgress} in progress · ${stats.cancelled} cancelled`}
            </div>
          </div>
          <Flex gap={8} wrap="wrap" style={isPhone ? { width: '100%' } : undefined}>
            <Tooltip title="Reload orders">
              <Button
                aria-label="Refresh orders"
                icon={<ReloadOutlined />}
                onClick={() => fetchAdminOrders()}
                loading={loading}
                style={{ borderRadius: radii.md, height: 40, minWidth: 40, flex: isPhone ? '0 0 40px' : undefined }}
              >
                {isPhone ? null : 'Refresh'}
              </Button>
            </Tooltip>
            <Tooltip title={filtersActive ? 'Exports the orders that match the filters' : 'Exports all orders'}>
              <Button
                icon={<FileTextOutlined />}
                onClick={handleExportAccountsCSV}
                disabled={initialLoading}
                style={{
                  borderColor: colors.secondary,
                  color: colors.secondary,
                  fontWeight: 600,
                  borderRadius: radii.md,
                  height: 40,
                  flex: isPhone ? 1 : undefined,
                }}
              >
                Export CSV
              </Button>
            </Tooltip>
            <Tooltip title="Full JSON backup of every order">
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExportBackupJSON}
                disabled={initialLoading}
                style={{ fontWeight: 600, borderRadius: radii.md, height: 40, flex: isPhone ? 1 : undefined }}
              >
                Backup JSON
              </Button>
            </Tooltip>
          </Flex>
        </Flex>

        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} md={12} lg={8}>
            <Input
              aria-label="Search orders"
              placeholder="Order #, store, owner, customer, phone…"
              prefix={<SearchOutlined style={{ color: colors.textLight }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
              style={{ ...filterControlStyle, height: 40 }}
            />
          </Col>
          <Col xs={12} md={6} lg={5}>
            <Select
              aria-label="Filter by store"
              value={selectedShopFilter}
              onChange={setSelectedShopFilter}
              showSearch
              optionFilterProp="label"
              style={{ ...filterControlStyle, height: 40 }}
              popupMatchSelectWidth={false}
              options={[
                { value: 'all', label: `All stores (${uniqueShops.length})` },
                ...uniqueShops.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </Col>
          <Col xs={12} md={6} lg={5}>
            <Select
              aria-label="Filter by status"
              value={selectedStatusFilter}
              onChange={setSelectedStatusFilter}
              style={{ ...filterControlStyle, height: 40 }}
              popupMatchSelectWidth={false}
              options={statusFilterOptions}
            />
          </Col>
          {isPhone ? (
            <>
              <Col xs={12}>
                <DatePicker
                  aria-label="From date"
                  placeholder="From date"
                  value={dateFrom || null}
                  onChange={(d) => setDateRange([d, dateTo || null])}
                  disabledDate={(d) => !!dateTo && d.isAfter(dateTo, 'day')}
                  inputReadOnly
                  format="DD MMM YY"
                  style={{ ...filterControlStyle, height: 40 }}
                />
              </Col>
              <Col xs={12}>
                <DatePicker
                  aria-label="To date"
                  placeholder="To date"
                  value={dateTo || null}
                  onChange={(d) => setDateRange([dateFrom || null, d])}
                  disabledDate={(d) => !!dateFrom && d.isBefore(dateFrom, 'day')}
                  inputReadOnly
                  format="DD MMM YY"
                  placement="bottomRight"
                  style={{ ...filterControlStyle, height: 40 }}
                />
              </Col>
            </>
          ) : (
            <Col xs={24} md={12} lg={6}>
              <RangePicker
                aria-label="Order date range"
                value={[dateFrom || null, dateTo || null]}
                onChange={(vals) => setDateRange(vals || [null, null])}
                allowEmpty={[true, true]}
                format="DD MMM YYYY"
                placeholder={['From date', 'To date']}
                style={{ ...filterControlStyle, height: 40 }}
              />
            </Col>
          )}
          {filtersActive && (
            <Col xs={24} md={12} lg={24}>
              <Button type="link" onClick={clearFilters} style={{ padding: 0, height: 'auto', fontWeight: 600 }}>
                Clear all filters
              </Button>
            </Col>
          )}
        </Row>
      </div>

      {loadError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16, borderRadius: radii.md }}
          message={orders.length ? 'Showing the last orders that loaded' : 'Orders could not be loaded'}
          description={loadError}
          action={
            <Button size="small" danger onClick={() => fetchAdminOrders()} loading={loading}>
              Retry
            </Button>
          }
        />
      )}

      {isPhone ? (
        <Spin spinning={loading && orders.length > 0}>
          {initialLoading ? (
            <Flex vertical gap={12}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ ...panelStyle, padding: 14 }}>
                  <Skeleton active paragraph={{ rows: 3 }} />
                </div>
              ))}
            </Flex>
          ) : filteredOrders.length === 0 ? (
            <div style={{ ...panelStyle, padding: '24px 12px' }}>{emptyState}</div>
          ) : (
            <Flex vertical gap={12}>
              {pagedOrders.map(renderOrderCard)}
              {filteredOrders.length > pageSize && (
                <Pagination
                  simple
                  current={Math.min(page, Math.max(1, Math.ceil(filteredOrders.length / pageSize)))}
                  pageSize={pageSize}
                  total={filteredOrders.length}
                  onChange={(p) => {
                    setPage(p);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{ textAlign: 'center', marginTop: 4 }}
                />
              )}
            </Flex>
          )}
        </Spin>
      ) : (
        <div style={{ ...panelStyle, overflow: 'hidden' }}>
          <Table
            columns={columns}
            dataSource={filteredOrders}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1100 }}
            locale={{ emptyText: loading ? ' ' : emptyState }}
            pagination={{
              current: page,
              pageSize,
              showSizeChanger: true,
              pageSizeOptions: ['10', '25', '50', '100'],
              showTotal: (total, range) => `${range[0]}–${range[1]} of ${total}`,
              onChange: (p, size) => {
                setPage(size !== pageSize ? 1 : p);
                setPageSize(size);
              },
            }}
          />
        </div>
      )}

      {/* Order detail */}
      <Modal
        title={
          <span style={{ fontFamily: headFont, fontWeight: 800, color: colors.textMain, wordBreak: 'break-all' }}>
            Order #{selectedOrder?.order_number || ''}
          </span>
        }
        open={detailModalVisible && !!selectedOrder}
        onCancel={() => setDetailModalVisible(false)}
        afterClose={() => {
          setSelectedOrderId(null);
          setSelectedSnapshot(null);
        }}
        footer={
          <Flex gap={8} justify="flex-end" wrap="wrap">
            {selectedOrder && renderChatButton(selectedOrder, { style: { height: 40, borderRadius: radii.md, color: colors.primary, fontWeight: 600 } })}
            <Button onClick={() => setDetailModalVisible(false)} style={{ height: 40, borderRadius: radii.md }}>
              Close
            </Button>
          </Flex>
        }
        width={isPhone ? 'calc(100vw - 24px)' : 760}
        style={{ top: isPhone ? 12 : 48, maxWidth: 'calc(100vw - 24px)', paddingBottom: 12 }}
      >
        {selectedOrder && renderOrderDetail(selectedOrder)}
      </Modal>
    </div>
  );
};

export default AdminOrdersAccounts;
