import React, { useEffect, useState, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  Tabs,
  Button,
  Table,
  Switch,
  Input,
  InputNumber,
  Select,
  Typography,
  message,
  Flex,
  Row,
  Col,
  Drawer,
  Divider,
  Avatar,
  Grid,
  Steps,
  Alert,
  Dropdown,
  Modal,
  Segmented,
  Empty,
  Skeleton,
  Tooltip,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  ShopOutlined,
  EyeOutlined,
  ArrowLeftOutlined,
  ShoppingCartOutlined,
  SettingOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  CarOutlined,
  UserOutlined,
  CopyOutlined,
  ToolOutlined,
  PlusOutlined,
  SyncOutlined,
  QrcodeOutlined,
  WalletOutlined,
  MoreOutlined,
  SearchOutlined,
  AppstoreOutlined,
  AppstoreAddOutlined,
  BarsOutlined,
  UploadOutlined,
  PictureOutlined,
  StopOutlined,
  ReloadOutlined,
  InboxOutlined,
  FileDoneOutlined,
  RiseOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import ChatIcon from '../../app/components/common/ChatIcon';
import { netWorkCall, apiConfig } from '../../app/utils';
import { useHistory } from 'react-router-dom';
import {
  AddProductModal,
  ImportProductCsvModal,
  CatalogPickerModal,
} from '../../app/components/listings';
import { useChatStore } from '../../app/services';
import { colors } from '../../app/styles/theme';
import './client_register.css';

const { Title, Text } = Typography;

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

const formatINR = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '₹0';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const toDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatWhen = (value, withYear = false) => {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
    hour: '2-digit',
    minute: '2-digit',
  });
};

// "Just now", "12 min ago", "3 h ago", else a short date
const formatAgo = (value) => {
  const d = toDate(value);
  if (!d) return '';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
  return formatWhen(value);
};

/* ------------------------------------------------------------------ */
/* Order helpers (status values from src/api/routes/orders)            */
/* ------------------------------------------------------------------ */

const ORDER_STATUS = {
  placed: { label: 'New', tone: 'new' },
  pending: { label: 'New', tone: 'new' },
  order_prepare: { label: 'Preparing', tone: 'progress' },
  preparing: { label: 'Preparing', tone: 'progress' },
  accepted: { label: 'Accepted', tone: 'progress' },
  packed: { label: 'Packed', tone: 'progress' },
  ready_for_pickup: { label: 'Ready for pickup', tone: 'ready' },
  open_to_delivery: { label: 'Open to delivery', tone: 'ready' },
  out_for_delivery: { label: 'Out for delivery', tone: 'transit' },
  completed: { label: 'Completed', tone: 'done' },
  cancelled: { label: 'Cancelled', tone: 'cancelled' },
};

const NEW_ORDER_STATUSES = ['placed', 'pending'];
const PREPARING_STATUSES = ['order_prepare', 'preparing', 'accepted', 'packed'];
const CLOSED_ORDER_STATUSES = ['completed', 'cancelled'];

const isOrderActive = (order) => !CLOSED_ORDER_STATUSES.includes(order?.status);

// The model allows 'delivery' | 'pickup' | 'service' (and legacy 'service_visit')
const normalizeOrderType = (type) => {
  if (type === 'pickup') return 'pickup';
  if (type === 'service' || type === 'service_visit') return 'service';
  return 'delivery';
};

const ORDER_TYPE = {
  delivery: { label: 'Delivery', icon: <CarOutlined />, tone: 'delivery' },
  pickup: { label: 'Pickup', icon: <ShopOutlined />, tone: 'pickup' },
  service: { label: 'Service', icon: <ToolOutlined />, tone: 'service' },
};

// The next step for an order, plus less common moves for the "more" menu
const getOrderActions = (order) => {
  const type = normalizeOrderType(order?.order_type);
  const status = order?.status || 'placed';
  let primary = null;
  const secondary = [];

  if (NEW_ORDER_STATUSES.includes(status)) {
    primary = {
      status: 'order_prepare',
      label: type === 'service' ? 'Accept booking' : 'Start preparing',
      icon: <SyncOutlined />,
    };
  } else if (PREPARING_STATUSES.includes(status)) {
    if (type === 'pickup') {
      primary = { status: 'ready_for_pickup', label: 'Ready for pickup', icon: <CheckCircleFilled /> };
      secondary.push({ status: 'completed', label: 'Mark completed', icon: <CheckCircleOutlined /> });
    } else if (type === 'delivery') {
      primary = { status: 'open_to_delivery', label: 'Send for delivery', icon: <CarOutlined /> };
    } else {
      primary = { status: 'completed', label: 'Mark service done', icon: <CheckCircleFilled /> };
    }
    secondary.push({ status: 'placed', label: 'Move back to new', icon: <RollbackOutlined /> });
  } else if (status === 'ready_for_pickup') {
    primary =
      type === 'delivery'
        ? { status: 'out_for_delivery', label: 'Out for delivery', icon: <CarOutlined /> }
        : { status: 'completed', label: 'Handed over', icon: <CheckCircleFilled /> };
  } else if (status === 'open_to_delivery') {
    primary = { status: 'out_for_delivery', label: 'Out for delivery', icon: <CarOutlined /> };
    secondary.push({ status: 'completed', label: 'Mark delivered', icon: <CheckCircleOutlined /> });
  } else if (status === 'out_for_delivery') {
    primary = { status: 'completed', label: 'Mark delivered', icon: <CheckCircleFilled /> };
  }

  const canCancel = !CLOSED_ORDER_STATUSES.includes(status);
  const cancelLabel = NEW_ORDER_STATUSES.includes(status) ? 'Reject order' : 'Cancel order';
  return { primary, secondary, canCancel, cancelLabel };
};

// The bill rebuilt from its parts: older orders stored total_amount without the
// delivery fee the customer was charged, so the line items are the source of truth.
const getOrderTotals = (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  const deliveryFee = Number(order?.delivery_fee) || 0;
  const platformFee = Number(order?.platform_fee) || 0;
  const stored = Number(order?.total_amount) || 0;
  if (items.length === 0) {
    return {
      subtotal: Math.max(stored - platformFee - deliveryFee, 0),
      deliveryFee,
      platformFee,
      total: stored,
    };
  }
  const subtotal = items.reduce((sum, it) => {
    const line = Number(it.subtotal);
    if (Number.isFinite(line) && line > 0) return sum + line;
    return sum + (Number(it.unit_price) || 0) * (Number(it.quantity) || 0);
  }, 0);
  return { subtotal, deliveryFee, platformFee, total: subtotal + deliveryFee + platformFee };
};

const getOrderSteps = (order) => {
  if (!order) return { step: 0, items: [] };
  const type = normalizeOrderType(order.order_type);
  const status = order.status || 'placed';
  const preparing = PREPARING_STATUSES.includes(status);

  if (type === 'pickup') {
    let step = 0;
    if (preparing) step = 1;
    else if (status === 'ready_for_pickup') step = 2;
    else if (status === 'completed') step = 3;
    return {
      step,
      items: [
        { title: 'Placed', description: 'Order received' },
        { title: 'Preparing', description: 'Packing items' },
        { title: 'Ready', description: 'Counter pickup' },
        { title: 'Completed', description: 'Handed over' },
      ],
    };
  }

  if (type === 'service') {
    let step = 0;
    if (preparing) step = 1;
    else if (status === 'completed') step = 2;
    return {
      step,
      items: [
        { title: 'Booked', description: 'Request received' },
        { title: 'In progress', description: 'Service ongoing' },
        { title: 'Completed', description: 'Service done' },
      ],
    };
  }

  let step = 0;
  if (preparing) step = 1;
  else if (status === 'open_to_delivery' || status === 'ready_for_pickup') step = 2;
  else if (status === 'out_for_delivery') step = 3;
  else if (status === 'completed') step = 4;
  return {
    step,
    items: [
      { title: 'Placed', description: 'Order received' },
      { title: 'Preparing', description: 'Packing items' },
      { title: 'Open to delivery', description: 'Awaiting rider' },
      { title: 'Out for delivery', description: 'On the way' },
      { title: 'Delivered', description: 'Order completed' },
    ],
  };
};

const paymentLabel = (mode) => (mode === 'direct_upi' ? 'Direct UPI' : mode === 'cash' ? 'Cash' : 'Cash / COD');

/* ------------------------------------------------------------------ */
/* Quote helpers (status values from src/api/models/quotes)            */
/* ------------------------------------------------------------------ */

const QUOTE_STATUS = {
  offered: { label: 'New request', tone: 'new' },
  accepted: { label: 'Confirmed', tone: 'progress' },
  completed: { label: 'Completed', tone: 'done' },
  rejected: { label: 'Declined', tone: 'cancelled' },
};

/* ------------------------------------------------------------------ */
/* Store archetype                                                     */
/* ------------------------------------------------------------------ */

const getStoreArchetype = (shop) => {
  const typeStr = ((shop?.shop_type || '') + ' ' + (shop?.shopCategory?.name || '')).toLowerCase();
  const has = (...words) => words.some((w) => typeStr.includes(w));
  if (has('restaurant', 'food', 'bakery', 'cafe', 'biri', 'tiffin')) return 'food';
  if (has('electric', 'hardware', 'technician', 'plumb', 'laundry')) return 'service';
  if (has('salon', 'spa', 'massage', 'beauty')) return 'wellness';
  if (has('rental', 'bike', 'audio', 'sport', 'turf')) return 'rental';
  return 'product';
};

const ARCHETYPE_LISTING_TYPE = {
  product: 'product',
  food: 'food',
  service: 'service',
  wellness: 'service',
  rental: 'rental',
};

const LISTING_TYPE_LABEL = { product: 'Product', food: 'Food', service: 'Service', rental: 'Rental' };

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

const StatusChip = ({ tone, children, icon }) => (
  <span className={`ms-chip ms-chip--${tone || 'neutral'}`}>
    {icon}
    {children}
  </span>
);

StatusChip.propTypes = {
  tone: PropTypes.string,
  children: PropTypes.node,
  icon: PropTypes.node,
};

const OrderStatusChip = ({ status }) => {
  const meta = ORDER_STATUS[status] || { label: status || 'Unknown', tone: 'neutral' };
  return <StatusChip tone={meta.tone}>{meta.label}</StatusChip>;
};

OrderStatusChip.propTypes = { status: PropTypes.string };

const OrderTypeChip = ({ type }) => {
  const meta = ORDER_TYPE[normalizeOrderType(type)];
  return (
    <StatusChip tone={meta.tone} icon={meta.icon}>
      {meta.label}
    </StatusChip>
  );
};

OrderTypeChip.propTypes = { type: PropTypes.string };

const ListingThumb = ({ src, alt, className }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <div className={`ms-thumb ${className || ''}`}>
      {src && !failed ? (
        <img src={src} alt={alt || ''} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="ms-thumb-fallback" aria-hidden="true">
          <PictureOutlined />
        </span>
      )}
    </div>
  );
};

ListingThumb.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  className: PropTypes.string,
};

const ListingMetaTags = ({ item, defaultType }) => {
  const meta = item.metadata || {};
  const tags = [];
  if (item.listing_type && item.listing_type !== defaultType) {
    tags.push(
      <span key="type" className="ms-mini-tag ms-mini-tag--type">
        {LISTING_TYPE_LABEL[item.listing_type] || item.listing_type}
      </span>
    );
  }
  if (meta.food_type) {
    const veg = meta.food_type === 'veg';
    tags.push(
      <span key="food" className={`ms-mini-tag ${veg ? 'ms-mini-tag--veg' : 'ms-mini-tag--nonveg'}`}>
        <span className="ms-food-dot" aria-hidden="true" />
        {veg ? 'Veg' : 'Non-veg'}
      </span>
    );
  }
  if (meta.section) {
    tags.push(
      <span key="section" className="ms-mini-tag">
        {meta.section}
      </span>
    );
  }
  if (item.master_product_id) {
    tags.push(
      <span key="master" className="ms-mini-tag ms-mini-tag--master">
        Catalog
      </span>
    );
  }
  if (tags.length === 0) return null;
  return <div className="ms-mini-tags">{tags}</div>;
};

ListingMetaTags.propTypes = {
  item: PropTypes.object.isRequired,
  defaultType: PropTypes.string,
};

const ListingPrice = ({ item }) => {
  const price = Number(item.price) || 0;
  const mrp = Number(item.mrp) || 0;
  const discount = mrp > price && price > 0 ? Math.round((1 - price / mrp) * 100) : 0;
  return (
    <div className="ms-item-price-row">
      <span className="ms-price">{formatINR(price)}</span>
      {item.unit && <span className="ms-unit">/ {item.unit}</span>}
      {mrp > price && <span className="ms-mrp">{formatINR(mrp)}</span>}
      {discount > 0 && <span className="ms-discount">{discount}% off</span>}
    </div>
  );
};

ListingPrice.propTypes = { item: PropTypes.object.isRequired };

/* ------------------------------------------------------------------ */
/* ManageStore                                                         */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 24;

const ManageStore = ({ shop, allShops, onSwitchShop, onClose, onRefreshShop }) => {
  const history = useHistory();
  const screens = Grid.useBreakpoint();
  const isPhone = !screens.sm;
  const { handleChatOpen } = useChatStore((state) => state);
  const [modal, modalContextHolder] = Modal.useModal();
  const [activeTab, setActiveTab] = useState('catalog');

  // Prefer the freshest copy of this shop (allShops is refetched by onRefreshShop),
  // so the header and settings reflect a save without leaving the screen.
  const currentShop = useMemo(
    () => (allShops || []).find((s) => s.id === shop?.id) || shop || {},
    [allShops, shop]
  );
  const shopId = currentShop.id;

  // Ignore responses that arrive after the owner switched to another outlet
  const shopIdRef = useRef(shopId);
  shopIdRef.current = shopId;

  /* ---------------- Listings ---------------- */
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState('');
  const [listingsLoaded, setListingsLoaded] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isImportCsvOpen, setIsImportCsvOpen] = useState(false);
  const [isCatalogPickerOpen, setIsCatalogPickerOpen] = useState(false);
  const [pendingListingIds, setPendingListingIds] = useState({});
  const [catalogSearch, setCatalogSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [catalogSort, setCatalogSort] = useState('default');
  const [viewMode, setViewMode] = useState('grid');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  /* ---------------- Orders ---------------- */
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [orderFilter, setOrderFilter] = useState('active');
  const [orderSearch, setOrderSearch] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);

  /* ---------------- Quotes ---------------- */
  const [quotes, setQuotes] = useState([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState('');
  const [quoteFilter, setQuoteFilter] = useState('open');
  const [updatingQuoteId, setUpdatingQuoteId] = useState(null);
  const [revisingQuote, setRevisingQuote] = useState(null);
  const [revisedAmount, setRevisedAmount] = useState(null);

  /* ---------------- Settings ---------------- */
  const pickSettings = (s) => ({
    shop_name: s?.shop_name || '',
    address: s?.address || '',
    area: s?.area || '',
    mobile_number: s?.mobile_number || '',
    website: s?.website || '',
    img_url: s?.img_url || '',
  });
  const [shopSettings, setShopSettings] = useState(() => pickSettings(currentShop));
  const [savingSettings, setSavingSettings] = useState(false);
  const [bannerFailed, setBannerFailed] = useState(false);

  // Reset the form when another outlet is opened or after a save lands (updatedAt changes)
  useEffect(() => {
    setShopSettings(pickSettings(currentShop));
  }, [shopId, currentShop.updatedAt]);

  useEffect(() => setBannerFailed(false), [shopSettings.img_url]);

  const storeArchetype = useMemo(() => getStoreArchetype(currentShop), [currentShop]);
  const isServiceStore = storeArchetype === 'service' || storeArchetype === 'wellness';
  const isFoodStore = storeArchetype === 'food';
  const defaultListingType = ARCHETYPE_LISTING_TYPE[storeArchetype];
  const showQuotesTab = isServiceStore || storeArchetype === 'rental' || quotes.length > 0;
  const availableLabels = isServiceStore
    ? { on: 'Available', off: 'Unavailable' }
    : isFoodStore
    ? { on: 'Available', off: 'Sold out' }
    : { on: 'In stock', off: 'Out of stock' };

  /* ---------------- Data fetching ---------------- */

  const fetchListings = async ({ silent = false } = {}) => {
    const requestId = shopId;
    if (!requestId) return;
    if (!silent) setListingsLoading(true);
    setListingsError('');
    try {
      const res = await netWorkCall(`${apiConfig.listings_by_shop}/${requestId}`, 'GET', null, false);
      if (shopIdRef.current !== requestId) return;
      if (Array.isArray(res?.data)) {
        setListings(res.data);
      } else {
        setListingsError(res?.error || 'Could not load your catalog.');
      }
    } catch (err) {
      console.error(err);
      if (shopIdRef.current === requestId) setListingsError('Could not load your catalog. Check your connection.');
    } finally {
      if (shopIdRef.current === requestId) {
        setListingsLoading(false);
        setListingsLoaded(true);
      }
    }
  };

  const fetchOrders = async ({ silent = false } = {}) => {
    const requestId = shopId;
    if (!requestId) return;
    if (!silent) setOrdersLoading(true);
    setOrdersError('');
    try {
      const res = await netWorkCall(`${apiConfig.orders_shop}/${requestId}`, 'GET', null, true);
      if (shopIdRef.current !== requestId) return;
      if (Array.isArray(res?.data)) {
        setOrders(res.data);
      } else {
        setOrdersError(res?.error || 'Could not load orders.');
      }
    } catch (err) {
      console.error(err);
      if (shopIdRef.current === requestId) setOrdersError('Could not load orders. Check your connection.');
    } finally {
      if (shopIdRef.current === requestId) {
        setOrdersLoading(false);
        setOrdersLoaded(true);
      }
    }
  };

  const fetchQuotes = async ({ silent = false } = {}) => {
    const requestId = shopId;
    if (!requestId) return;
    if (!silent) setQuotesLoading(true);
    setQuotesError('');
    try {
      const res = await netWorkCall(`${apiConfig.quotes_shop}/${requestId}`, 'GET', null, true);
      if (shopIdRef.current !== requestId) return;
      if (Array.isArray(res?.data)) {
        setQuotes(res.data);
      } else {
        setQuotesError(res?.error || 'Could not load quote requests.');
      }
    } catch (err) {
      console.error(err);
      if (shopIdRef.current === requestId) setQuotesError('Could not load quote requests.');
    } finally {
      if (shopIdRef.current === requestId) setQuotesLoading(false);
    }
  };

  // New outlet: clear the previous outlet's data and filters, then load
  useEffect(() => {
    setListings([]);
    setOrders([]);
    setQuotes([]);
    setListingsLoaded(false);
    setOrdersLoaded(false);
    setCatalogSearch('');
    setStockFilter('all');
    setSectionFilter('all');
    setOrderSearch('');
    setSelectedOrderId(null);
    setIsOrderDrawerOpen(false);
    fetchListings();
    fetchOrders();
    fetchQuotes();
  }, [shopId]);

  // A tab that does not exist for this outlet (e.g. quotes) falls back to the catalog
  useEffect(() => {
    if (activeTab === 'quotes' && !showQuotesTab) setActiveTab('catalog');
  }, [activeTab, showQuotesTab]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [catalogSearch, stockFilter, sectionFilter, catalogSort, shopId]);

  /* ---------------- Listing actions ---------------- */

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (record) => {
    setEditingItem(record);
    setIsAddModalOpen(true);
  };

  const setListingPending = (id, pending) =>
    setPendingListingIds((prev) => {
      const next = { ...prev };
      if (pending) next[id] = true;
      else delete next[id];
      return next;
    });

  // Optimistic availability toggle, rolled back if the server refuses it
  const handleToggleAvailable = async (item, checked) => {
    setListingPending(item.id, true);
    setListings((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: checked } : i)));
    try {
      const res = await netWorkCall(
        `${apiConfig.listings_update}/${item.id}`,
        'PUT',
        JSON.stringify({ is_available: checked }),
        true
      );
      if (!res?.success) throw new Error(res?.error || 'Update failed');
      message.success(`${item.name} is now ${(checked ? availableLabels.on : availableLabels.off).toLowerCase()}`);
    } catch (err) {
      console.error(err);
      setListings((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: !checked } : i)));
      message.error(err?.message && err.message !== 'Failed to fetch' ? err.message : 'Could not update availability');
    } finally {
      setListingPending(item.id, false);
    }
  };

  const handleDeleteListing = async (item) => {
    setListingPending(item.id, true);
    try {
      const res = await netWorkCall(`${apiConfig.listings_delete}/${item.id}`, 'DELETE', null, true);
      if (!res?.success) throw new Error(res?.error || 'Delete failed');
      setListings((prev) => prev.filter((i) => i.id !== item.id));
      message.success(`${item.name} removed from your catalog`);
      onRefreshShop?.();
    } catch (err) {
      console.error(err);
      message.error(err?.message && err.message !== 'Failed to fetch' ? err.message : 'Could not delete this item');
    } finally {
      setListingPending(item.id, false);
    }
  };

  const confirmDeleteListing = (item) => {
    modal.confirm({
      title: `Delete "${item.name}"?`,
      content: 'It will be removed from your storefront. This cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      cancelText: 'Keep',
      centered: true,
      onOk: () => handleDeleteListing(item),
    });
  };

  const listingMenu = (item) => ({
    items: [
      { key: 'edit', icon: <EditOutlined />, label: 'Edit details' },
      {
        key: 'toggle',
        icon: item.is_available ? <StopOutlined /> : <CheckCircleOutlined />,
        label: `Mark as ${(item.is_available ? availableLabels.off : availableLabels.on).toLowerCase()}`,
        disabled: !!pendingListingIds[item.id],
      },
      { type: 'divider' },
      { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true },
    ],
    onClick: ({ key, domEvent }) => {
      domEvent?.stopPropagation?.();
      if (key === 'edit') handleOpenEditModal(item);
      if (key === 'toggle') handleToggleAvailable(item, !item.is_available);
      if (key === 'delete') confirmDeleteListing(item);
    },
  });

  // After add / edit / import: show the saved row right away, then resync
  const handleListingSaved = (saved) => {
    if (saved && saved.id) {
      setListings((prev) => {
        const exists = prev.some((i) => i.id === saved.id);
        return exists ? prev.map((i) => (i.id === saved.id ? { ...i, ...saved } : i)) : [saved, ...prev];
      });
    }
    fetchListings({ silent: true });
    onRefreshShop?.();
  };

  /* ---------------- Order actions ---------------- */

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const openOrder = (order) => {
    setSelectedOrderId(order.id);
    setIsOrderDrawerOpen(true);
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await netWorkCall(
        `${apiConfig.orders_status}/${orderId}/status`,
        'PUT',
        JSON.stringify({ status: newStatus }),
        true
      );
      if (res?.success) {
        const label = ORDER_STATUS[newStatus]?.label || newStatus;
        message.success(`Order marked as ${label.toLowerCase()}`);
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
        fetchOrders({ silent: true });
      } else {
        message.error(res?.error || 'Could not update the order');
      }
    } catch (err) {
      console.error(err);
      message.error('Could not update the order. Check your connection.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const confirmCancelOrder = (order, label) => {
    modal.confirm({
      title: `${label} #${order.order_number || ''}?`,
      content: 'The customer is notified that the order was cancelled by the store.',
      okText: label,
      okButtonProps: { danger: true },
      cancelText: 'Go back',
      centered: true,
      onOk: () => handleUpdateOrderStatus(order.id, 'cancelled'),
    });
  };

  const orderMenu = (order, { includeDetails = true } = {}) => {
    const { secondary, canCancel, cancelLabel } = getOrderActions(order);
    const items = [];
    if (includeDetails) items.push({ key: 'details', icon: <EyeOutlined />, label: 'View details' });
    secondary.forEach((a) => items.push({ key: `status:${a.status}`, icon: a.icon, label: a.label }));
    if (canCancel) {
      if (items.length) items.push({ type: 'divider' });
      items.push({ key: 'cancel', icon: <CloseCircleOutlined />, label: cancelLabel, danger: true });
    }
    return {
      items,
      onClick: ({ key, domEvent }) => {
        domEvent?.stopPropagation?.();
        if (key === 'details') openOrder(order);
        else if (key === 'cancel') confirmCancelOrder(order, cancelLabel);
        else if (key.startsWith('status:')) handleUpdateOrderStatus(order.id, key.slice(7));
      },
    };
  };

  const handleCopyOrderId = (value) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(value)
        .then(() => message.success('Order number copied'))
        .catch(() => message.error('Could not copy'));
    }
  };

  const chatWithCustomer = (customerId, meta) => {
    if (!customerId) {
      message.info('This customer cannot be messaged');
      return;
    }
    handleChatOpen(customerId, shopId, meta);
  };

  /* ---------------- Quote actions ---------------- */

  const handleUpdateQuote = async (quote, payload, successText) => {
    setUpdatingQuoteId(quote.id);
    try {
      const res = await netWorkCall(
        `${apiConfig.quotes_status}/${quote.id}/status`,
        'PUT',
        JSON.stringify(payload),
        true
      );
      if (res?.success) {
        message.success(successText);
        setQuotes((prev) => prev.map((q) => (q.id === quote.id ? { ...q, ...payload, ...(res.data || {}), customer: q.customer } : q)));
        return true;
      }
      message.error(res?.error || 'Could not update the quote');
    } catch (err) {
      console.error(err);
      message.error('Could not update the quote. Check your connection.');
    } finally {
      setUpdatingQuoteId(null);
    }
    return false;
  };

  const confirmDeclineQuote = (quote) => {
    modal.confirm({
      title: `Decline "${quote.service_title}"?`,
      content: 'Let the customer know why in chat, so they can look elsewhere.',
      okText: 'Decline',
      okButtonProps: { danger: true },
      cancelText: 'Go back',
      centered: true,
      onOk: () => handleUpdateQuote(quote, { status: 'rejected' }, 'Quote declined'),
    });
  };

  const openReviseQuote = (quote) => {
    setRevisingQuote(quote);
    setRevisedAmount(Number(quote.estimated_amount) || null);
  };

  const submitRevisedQuote = async () => {
    if (!revisingQuote) return;
    if (revisedAmount === null || revisedAmount === undefined || Number(revisedAmount) < 0) {
      message.error('Enter the estimate amount');
      return;
    }
    const ok = await handleUpdateQuote(
      revisingQuote,
      { estimated_amount: Number(revisedAmount) },
      `Estimate updated to ${formatINR(revisedAmount)}`
    );
    if (ok) setRevisingQuote(null);
  };

  /* ---------------- Settings actions ---------------- */

  const savedSettings = pickSettings(currentShop);
  const settingsDirty = Object.keys(savedSettings).some(
    (k) => (shopSettings[k] || '').trim() !== (savedSettings[k] || '').trim()
  );
  const phoneDigits = (shopSettings.mobile_number || '').replace(/\D/g, '');
  const settingsErrors = {
    shop_name: !shopSettings.shop_name.trim() ? 'Store name is required' : '',
    mobile_number:
      shopSettings.mobile_number && (phoneDigits.length < 10 || phoneDigits.length > 13)
        ? 'Enter a valid phone number'
        : '',
  };
  const settingsValid = !settingsErrors.shop_name && !settingsErrors.mobile_number;

  const handleSaveShopSettings = async () => {
    if (!settingsValid) {
      message.error(settingsErrors.shop_name || settingsErrors.mobile_number);
      return;
    }
    setSavingSettings(true);
    try {
      const trimmed = Object.fromEntries(
        Object.entries(shopSettings).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
      );
      const res = await netWorkCall(
        apiConfig.register_shop,
        'POST',
        JSON.stringify({ shop_id: shopId, ...trimmed }),
        true
      );
      if (res?.success) {
        message.success('Store details saved');
        onRefreshShop?.();
      } else {
        message.error(res?.message || res?.error || 'Could not save store details');
      }
    } catch (err) {
      console.error(err);
      message.error('Could not save store details. Check your connection.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeleteShop = async () => {
    try {
      const res = await netWorkCall(`${apiConfig.shop_delete}/${shopId}`, 'DELETE', null, true);
      if (res?.success) {
        message.success('Store deleted');
        onRefreshShop?.();
        onClose?.();
      } else {
        message.error(res?.error || 'Could not delete the store');
      }
    } catch (err) {
      console.error(err);
      message.error('Could not delete the store');
    }
  };

  const confirmDeleteShop = () => {
    modal.confirm({
      title: `Delete ${currentShop.shop_name || 'this store'}?`,
      icon: <WarningOutlined style={{ color: colors.semantic.error }} />,
      content: 'The outlet and every item in its catalog are deleted permanently. This cannot be undone.',
      okText: 'Delete store',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      centered: true,
      onOk: handleDeleteShop,
    });
  };

  /* ---------------- Derived data ---------------- */

  const listingStats = useMemo(() => {
    const total = listings.length;
    const inStock = listings.filter((l) => l.is_available).length;
    return { total, inStock, outOfStock: total - inStock };
  }, [listings]);

  const sections = useMemo(() => {
    const set = new Set();
    listings.forEach((l) => l.metadata?.section && set.add(String(l.metadata.section)));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [listings]);

  const filteredListings = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    let list = listings.filter((l) => {
      if (stockFilter === 'in' && !l.is_available) return false;
      if (stockFilter === 'out' && l.is_available) return false;
      if (sectionFilter !== 'all' && String(l.metadata?.section || '') !== sectionFilter) return false;
      if (!q) return true;
      return (
        (l.name || '').toLowerCase().includes(q) ||
        (l.description || '').toLowerCase().includes(q) ||
        String(l.metadata?.section || '').toLowerCase().includes(q)
      );
    });
    if (catalogSort === 'name') list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (catalogSort === 'price_asc') list = [...list].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    if (catalogSort === 'price_desc') list = [...list].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    if (catalogSort === 'newest')
      list = [...list].sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));
    return list;
  }, [listings, catalogSearch, stockFilter, sectionFilter, catalogSort]);

  const orderStats = useMemo(() => {
    const fresh = orders.filter((o) => NEW_ORDER_STATUSES.includes(o.status)).length;
    const active = orders.filter(isOrderActive).length;
    const completedOrders = orders.filter((o) => o.status === 'completed');
    const cancelled = orders.filter((o) => o.status === 'cancelled').length;
    const sales = completedOrders.reduce((sum, o) => sum + getOrderTotals(o).total, 0);
    return { fresh, active, completed: completedOrders.length, cancelled, sales, all: orders.length };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((o) => {
      if (orderFilter === 'active' && !isOrderActive(o)) return false;
      if (orderFilter === 'completed' && o.status !== 'completed') return false;
      if (orderFilter === 'cancelled' && o.status !== 'cancelled') return false;
      if (!q) return true;
      return (
        (o.order_number || '').toLowerCase().includes(q) ||
        (o.customer?.username || '').toLowerCase().includes(q) ||
        (o.customer_phone || o.customer?.mobile || '').includes(q) ||
        (o.items || []).some((it) => (it.item_name || '').toLowerCase().includes(q))
      );
    });
  }, [orders, orderFilter, orderSearch]);

  const quoteStats = useMemo(() => {
    const fresh = quotes.filter((q) => q.status === 'offered').length;
    const open = quotes.filter((q) => q.status === 'offered' || q.status === 'accepted').length;
    return { fresh, open, closed: quotes.length - open, all: quotes.length };
  }, [quotes]);

  const filteredQuotes = useMemo(
    () =>
      quotes.filter((q) => {
        const open = q.status === 'offered' || q.status === 'accepted';
        if (quoteFilter === 'open') return open;
        if (quoteFilter === 'closed') return !open;
        return true;
      }),
    [quotes, quoteFilter]
  );

  /* ---------------- Labels ---------------- */

  const catalogTabText = isServiceStore ? 'Services' : isFoodStore ? 'Menu' : 'Catalog';
  const ordersTabText = isServiceStore ? 'Bookings' : 'Orders';
  const catalogTitle = isServiceStore ? 'Services & rate card' : isFoodStore ? 'Menu & dishes' : 'Products & stock';
  const catalogDesc = isServiceStore
    ? 'Fixed-price services and packages customers can book or ask a quote for.'
    : isFoodStore
    ? 'Dishes and drinks customers can order for pickup or delivery.'
    : 'Products, prices and stock your local customers see on your storefront.';
  const addItemButtonLabel = isServiceStore ? 'Add service' : isFoodStore ? 'Add dish' : 'Add product';
  const itemNoun = isServiceStore ? 'service' : isFoodStore ? 'dish' : 'product';
  const ordersTitle = isServiceStore ? 'Service bookings' : 'Customer orders';
  const ordersDesc = isServiceStore
    ? 'Bookings placed directly with your business. Move each one forward as you work on it.'
    : 'Orders placed directly with your store. Tap an order for the full bill and tracker.';

  const effectiveView = isPhone ? 'list' : viewMode;
  const isCatalogLoading = listingsLoading && !listingsLoaded;

  /* ---------------- Render: catalog ---------------- */

  const renderStockToggle = (item, compact = false) => (
    <label className={`ms-stock-toggle ${compact ? 'is-compact' : ''}`}>
      <Switch
        size="small"
        checked={!!item.is_available}
        loading={!!pendingListingIds[item.id]}
        onChange={(checked) => handleToggleAvailable(item, checked)}
        aria-label={`${item.name}: ${item.is_available ? availableLabels.on : availableLabels.off}`}
      />
      <span className={item.is_available ? 'is-on' : 'is-off'}>
        {item.is_available ? availableLabels.on : availableLabels.off}
      </span>
    </label>
  );

  const renderListingCard = (item) => (
    <div key={item.id} className={`ms-item-card ${item.is_available ? '' : 'is-off'}`}>
      <div className="ms-item-card-media">
        <ListingThumb src={item.img_url} alt={item.name} className="ms-thumb--card" />
        {!item.is_available && <span className="ms-item-badge-off">{availableLabels.off}</span>}
        <Dropdown menu={listingMenu(item)} trigger={['click']} placement="bottomRight">
          <Button
            className="ms-item-menu-btn"
            shape="circle"
            icon={<MoreOutlined />}
            aria-label={`More actions for ${item.name}`}
          />
        </Dropdown>
      </div>
      <div className="ms-item-card-body">
        <div className="ms-item-name" title={item.name}>
          {item.name}
        </div>
        <ListingMetaTags item={item} defaultType={defaultListingType} />
        <ListingPrice item={item} />
      </div>
      <div className="ms-item-card-footer">
        {renderStockToggle(item)}
        <Button
          size="small"
          icon={<EditOutlined />}
          className="ms-item-edit-btn"
          onClick={() => handleOpenEditModal(item)}
          aria-label={`Edit ${item.name}`}
        >
          Edit
        </Button>
      </div>
    </div>
  );

  const renderListingRow = (item) => (
    <div key={item.id} className={`ms-item-row ${item.is_available ? '' : 'is-off'}`}>
      <button
        type="button"
        className="ms-item-row-thumb-btn"
        onClick={() => handleOpenEditModal(item)}
        aria-label={`Edit ${item.name}`}
      >
        <ListingThumb src={item.img_url} alt="" className="ms-thumb--row" />
      </button>
      <div className="ms-item-row-main">
        <div className="ms-item-row-top">
          <div className="ms-item-name" title={item.name}>
            {item.name}
          </div>
          <Dropdown menu={listingMenu(item)} trigger={['click']} placement="bottomRight">
            <Button
              type="text"
              className="ms-icon-btn"
              icon={<MoreOutlined />}
              aria-label={`More actions for ${item.name}`}
            />
          </Dropdown>
        </div>
        <ListingPrice item={item} />
        <div className="ms-item-row-bottom">
          <ListingMetaTags item={item} defaultType={defaultListingType} />
          {renderStockToggle(item, true)}
        </div>
      </div>
    </div>
  );

  const renderCatalogSkeleton = () =>
    effectiveView === 'grid' ? (
      <div className="ms-item-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="ms-item-card ms-item-card--skeleton">
            <div className="ms-item-card-media">
              <Skeleton.Node active className="ms-skeleton-media">
                <span />
              </Skeleton.Node>
            </div>
            <div className="ms-item-card-body">
              <Skeleton active title={{ width: '80%' }} paragraph={{ rows: 2, width: ['40%', '55%'] }} />
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="ms-item-list">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="ms-item-row">
            <Skeleton active avatar={{ shape: 'square', size: 64 }} title={{ width: '70%' }} paragraph={{ rows: 2, width: ['35%', '60%'] }} />
          </div>
        ))}
      </div>
    );

  const catalogActions = (
    <div className="ms-toolbar-actions">
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={handleOpenAddModal}
        className="ms-btn-primary ms-toolbar-primary"
      >
        {addItemButtonLabel}
      </Button>
      {!isServiceStore && (
        <Button
          icon={<AppstoreAddOutlined />}
          onClick={() => setIsCatalogPickerOpen(true)}
          className="ms-toolbar-secondary"
          title="Add from master catalog"
        >
          {screens.sm ? 'Add from master catalog' : 'Master catalog'}
        </Button>
      )}
      <Button icon={<UploadOutlined />} onClick={() => setIsImportCsvOpen(true)} className="ms-toolbar-secondary">
        Import CSV
      </Button>
    </div>
  );

  const renderCatalogBody = () => {
    if (isCatalogLoading) return renderCatalogSkeleton();

    if (listingsError && listings.length === 0) {
      return (
        <div className="ms-state">
          <Alert
            type="error"
            showIcon
            message="Your catalog didn't load"
            description={listingsError}
            action={
              <Button size="small" icon={<ReloadOutlined />} onClick={() => fetchListings()}>
                Retry
              </Button>
            }
          />
        </div>
      );
    }

    if (listings.length === 0) {
      return (
        <div className="ms-empty">
          <span className="ms-empty-icon" aria-hidden="true">
            <InboxOutlined />
          </span>
          <div className="ms-empty-title">Your {catalogTabText.toLowerCase()} is empty</div>
          <div className="ms-empty-text">
            Add your first {itemNoun} so customers nearby can find and order it.
            {!isServiceStore && ' Pick ready-made items from the master catalog or upload a CSV to add many at once.'}
          </div>
          <div className="ms-empty-actions">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal} className="ms-btn-primary">
              {addItemButtonLabel}
            </Button>
            {!isServiceStore && (
              <Button icon={<AppstoreAddOutlined />} onClick={() => setIsCatalogPickerOpen(true)}>
                Add from master catalog
              </Button>
            )}
            <Button icon={<UploadOutlined />} onClick={() => setIsImportCsvOpen(true)}>
              Import CSV
            </Button>
          </div>
        </div>
      );
    }

    if (filteredListings.length === 0) {
      return (
        <div className="ms-empty ms-empty--compact">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={`No ${itemNoun === 'dish' ? 'dishes' : `${itemNoun}s`} match these filters`}
          >
            <Button
              onClick={() => {
                setCatalogSearch('');
                setStockFilter('all');
                setSectionFilter('all');
              }}
            >
              Clear filters
            </Button>
          </Empty>
        </div>
      );
    }

    const visible = filteredListings.slice(0, visibleCount);
    return (
      <>
        {effectiveView === 'grid' ? (
          <div className="ms-item-grid">{visible.map(renderListingCard)}</div>
        ) : (
          <div className="ms-item-list">{visible.map(renderListingRow)}</div>
        )}
        <div className="ms-list-footer">
          <Text className="ms-muted">
            Showing {visible.length} of {filteredListings.length}
          </Text>
          {filteredListings.length > visible.length && (
            <Button onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>Show more</Button>
          )}
        </div>
      </>
    );
  };

  const catalogTab = (
    <div className="ms-tab-pane">
      <div className="ms-toolbar">
        <div className="ms-toolbar-text">
          <Title level={5} className="ms-section-title">
            {catalogTitle}
          </Title>
          <Text className="ms-section-desc">{catalogDesc}</Text>
        </div>
        {catalogActions}
      </div>

      {listings.length > 0 && (
        <div className="ms-filterbar">
          <Input
            allowClear
            prefix={<SearchOutlined className="ms-muted" />}
            placeholder={`Search ${catalogTabText.toLowerCase()}`}
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            className="ms-filter-search"
            aria-label={`Search ${catalogTabText.toLowerCase()}`}
          />
          <div className="ms-filter-scroll">
            <Segmented
              value={stockFilter}
              onChange={setStockFilter}
              options={[
                { label: `All ${listingStats.total}`, value: 'all' },
                { label: `${availableLabels.on} ${listingStats.inStock}`, value: 'in' },
                { label: `${availableLabels.off} ${listingStats.outOfStock}`, value: 'out' },
              ]}
            />
          </div>
          <div className="ms-filter-selects">
            {sections.length > 1 && (
              <Select
                value={sectionFilter}
                onChange={setSectionFilter}
                className="ms-filter-select"
                popupMatchSelectWidth={false}
                aria-label="Filter by section"
                options={[{ label: 'All sections', value: 'all' }, ...sections.map((s) => ({ label: s, value: s }))]}
              />
            )}
            <Select
              value={catalogSort}
              onChange={setCatalogSort}
              className="ms-filter-select"
              popupMatchSelectWidth={false}
              aria-label="Sort items"
              options={[
                { label: 'Sort: Default', value: 'default' },
                { label: 'Newest first', value: 'newest' },
                { label: 'Name A–Z', value: 'name' },
                { label: 'Price: low to high', value: 'price_asc' },
                { label: 'Price: high to low', value: 'price_desc' },
              ]}
            />
            {!isPhone && (
              <Segmented
                value={viewMode}
                onChange={setViewMode}
                className="ms-view-toggle"
                options={[
                  { value: 'grid', icon: <AppstoreOutlined />, title: 'Grid view' },
                  { value: 'list', icon: <BarsOutlined />, title: 'List view' },
                ]}
              />
            )}
          </div>
        </div>
      )}

      {listingsError && listings.length > 0 && (
        <Alert
          type="warning"
          showIcon
          className="ms-inline-alert"
          message="Showing the last loaded catalog. Refresh failed."
          action={
            <Button size="small" onClick={() => fetchListings({ silent: true })}>
              Retry
            </Button>
          }
        />
      )}

      {renderCatalogBody()}
    </div>
  );

  /* ---------------- Render: orders ---------------- */

  const renderPrimaryOrderButton = (order, { block = false, size } = {}) => {
    const { primary } = getOrderActions(order);
    if (!primary) return null;
    return (
      <Button
        type="primary"
        size={size}
        block={block}
        icon={primary.icon}
        loading={updatingOrderId === order.id}
        className={`ms-btn-primary ${primary.status === 'completed' ? 'ms-btn-success' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          handleUpdateOrderStatus(order.id, primary.status);
        }}
      >
        {primary.label}
      </Button>
    );
  };

  const renderItemsSummary = (order, max = 2) => {
    const items = order.items || [];
    if (items.length === 0) return <span className="ms-muted">No items</span>;
    const shown = items.slice(0, max);
    return (
      <span className="ms-order-items">
        {shown.map((it, idx) => (
          <span key={it.id || idx} className="ms-order-item-line">
            {it.quantity}× {it.item_name}
          </span>
        ))}
        {items.length > max && <span className="ms-muted">+{items.length - max} more</span>}
      </span>
    );
  };

  const orderColumns = [
    {
      title: 'Order',
      key: 'order',
      width: 190,
      render: (_, record) => (
        <div className="ms-cell-stack">
          <span className="ms-order-number">#{record.order_number || record.id?.slice(0, 8)}</span>
          <span className="ms-cell-sub">
            <OrderTypeChip type={record.order_type} />
            <span className="ms-muted" title={formatWhen(record.createdAt, true)}>
              {formatAgo(record.createdAt)}
            </span>
          </span>
        </div>
      ),
    },
    {
      title: 'Customer',
      key: 'customer',
      width: 170,
      render: (_, record) => (
        <div className="ms-cell-stack">
          <span className="ms-strong">{record.customer?.username || 'Customer'}</span>
          <span className="ms-muted">{record.customer_phone || record.customer?.mobile || '—'}</span>
        </div>
      ),
    },
    {
      title: 'Items',
      key: 'items',
      render: (_, record) => renderItemsSummary(record),
    },
    {
      title: 'Amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <div className="ms-cell-stack ms-align-right">
          <span className="ms-price">{formatINR(getOrderTotals(record).total)}</span>
          <span className="ms-muted">{paymentLabel(record.payment_mode)}</span>
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 150,
      render: (_, record) => <OrderStatusChip status={record.status} />,
    },
    {
      title: <span className="ms-sr-only">Actions</span>,
      key: 'action',
      width: 230,
      align: 'right',
      render: (_, record) => {
        const menu = orderMenu(record);
        return (
          <Flex gap={6} justify="flex-end" align="center">
            {renderPrimaryOrderButton(record)}
            {!getOrderActions(record).primary && (
              <Button
                icon={<EyeOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  openOrder(record);
                }}
              >
                Details
              </Button>
            )}
            <Dropdown menu={menu} trigger={['click']} placement="bottomRight">
              <Button
                icon={<MoreOutlined />}
                aria-label={`More actions for order ${record.order_number || ''}`}
                onClick={(e) => e.stopPropagation()}
              />
            </Dropdown>
          </Flex>
        );
      },
    },
  ];

  const renderOrderCard = (order) => (
    <div
      key={order.id}
      className={`ms-order-card ${NEW_ORDER_STATUSES.includes(order.status) ? 'is-new' : ''}`}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if (e.target.closest('button') || e.target.closest('a')) return;
        openOrder(order);
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
          e.preventDefault();
          openOrder(order);
        }
      }}
    >
      <div className="ms-order-card-head">
        <div className="ms-cell-stack">
          <span className="ms-order-number">#{order.order_number || order.id?.slice(0, 8)}</span>
          <span className="ms-cell-sub">
            <OrderTypeChip type={order.order_type} />
            <span className="ms-muted">{formatAgo(order.createdAt)}</span>
          </span>
        </div>
        <OrderStatusChip status={order.status} />
      </div>
      <div className="ms-order-card-body">
        <div className="ms-order-card-customer">
          <UserOutlined className="ms-muted" />
          <span className="ms-strong">{order.customer?.username || 'Customer'}</span>
          {(order.customer_phone || order.customer?.mobile) && (
            <span className="ms-muted">· {order.customer_phone || order.customer?.mobile}</span>
          )}
        </div>
        <div className="ms-order-card-items">{renderItemsSummary(order, 3)}</div>
        <div className="ms-order-card-amount">
          <span className="ms-price">{formatINR(getOrderTotals(order).total)}</span>
          <span className="ms-muted">{paymentLabel(order.payment_mode)}</span>
        </div>
      </div>
      <div className="ms-order-card-actions">
        {renderPrimaryOrderButton(order, { block: true })}
        <Button
          icon={<EyeOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            openOrder(order);
          }}
          className={getOrderActions(order).primary ? '' : 'ms-grow'}
        >
          Details
        </Button>
        {orderMenu(order, { includeDetails: false }).items.length > 0 && (
          <Dropdown menu={orderMenu(order, { includeDetails: false })} trigger={['click']} placement="bottomRight">
            <Button
              icon={<MoreOutlined />}
              aria-label={`More actions for order ${order.order_number || ''}`}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        )}
      </div>
    </div>
  );

  const ordersEmptyText = () => {
    if (orders.length === 0) {
      return {
        title: isServiceStore ? 'No bookings yet' : 'No orders yet',
        text: 'New orders show up here as soon as customers place them. Share your storefront link to get started.',
      };
    }
    if (orderSearch.trim()) return { title: 'No matching orders', text: 'Try another order number, name or phone.' };
    if (orderFilter === 'active') return { title: "You're all caught up", text: 'There are no orders waiting on you right now.' };
    if (orderFilter === 'completed') return { title: 'No completed orders yet', text: '' };
    if (orderFilter === 'cancelled') return { title: 'No cancelled orders', text: '' };
    return { title: 'No orders', text: '' };
  };

  const renderOrdersBody = () => {
    if (ordersLoading && !ordersLoaded) {
      return (
        <div className="ms-order-list">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="ms-order-card">
              <Skeleton active title={{ width: '40%' }} paragraph={{ rows: 2 }} />
            </div>
          ))}
        </div>
      );
    }
    if (ordersError && orders.length === 0) {
      return (
        <Alert
          type="error"
          showIcon
          message="Orders didn't load"
          description={ordersError}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={() => fetchOrders()}>
              Retry
            </Button>
          }
        />
      );
    }
    if (filteredOrders.length === 0) {
      const { title, text } = ordersEmptyText();
      return (
        <div className="ms-empty ms-empty--compact">
          <span className="ms-empty-icon" aria-hidden="true">
            <ShoppingCartOutlined />
          </span>
          <div className="ms-empty-title">{title}</div>
          {text && <div className="ms-empty-text">{text}</div>}
          {orders.length > 0 && orderFilter !== 'all' && (
            <div className="ms-empty-actions">
              <Button
                onClick={() => {
                  setOrderFilter('all');
                  setOrderSearch('');
                }}
              >
                View all orders
              </Button>
            </div>
          )}
        </div>
      );
    }
    if (screens.lg) {
      return (
        <div className="ms-table-wrap">
          <Table
            columns={orderColumns}
            dataSource={filteredOrders}
            rowKey="id"
            size="middle"
            pagination={filteredOrders.length > 10 ? { pageSize: 10, showSizeChanger: false } : false}
            rowClassName={(record) => (NEW_ORDER_STATUSES.includes(record.status) ? 'ms-row-new' : '')}
            onRow={(record) => ({
              onClick: (e) => {
                if (e.target.closest('button') || e.target.closest('.ant-dropdown')) return;
                openOrder(record);
              },
              style: { cursor: 'pointer' },
            })}
          />
        </div>
      );
    }
    return <div className="ms-order-list">{filteredOrders.map(renderOrderCard)}</div>;
  };

  const ordersTab = (
    <div className="ms-tab-pane">
      <div className="ms-toolbar">
        <div className="ms-toolbar-text">
          <Title level={5} className="ms-section-title">
            {ordersTitle}
          </Title>
          <Text className="ms-section-desc">{ordersDesc}</Text>
        </div>
        <div className="ms-toolbar-actions ms-toolbar-actions--inline">
          <Button icon={<ReloadOutlined spin={ordersLoading && ordersLoaded} />} onClick={() => fetchOrders({ silent: true })}>
            Refresh
          </Button>
        </div>
      </div>

      {orders.length > 0 && (
        <div className="ms-filterbar">
          <div className="ms-filter-scroll">
            <Segmented
              value={orderFilter}
              onChange={setOrderFilter}
              options={[
                { label: `Active ${orderStats.active}`, value: 'active' },
                { label: `Done ${orderStats.completed}`, value: 'completed' },
                { label: `Cancelled ${orderStats.cancelled}`, value: 'cancelled' },
                { label: `All ${orderStats.all}`, value: 'all' },
              ]}
            />
          </div>
          <Input
            allowClear
            prefix={<SearchOutlined className="ms-muted" />}
            placeholder="Order no., customer or phone"
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
            className="ms-filter-search"
            aria-label="Search orders"
          />
        </div>
      )}

      {renderOrdersBody()}
    </div>
  );

  /* ---------------- Render: quotes ---------------- */

  const renderQuoteCard = (quote) => {
    const meta = QUOTE_STATUS[quote.status] || { label: quote.status, tone: 'neutral' };
    const busy = updatingQuoteId === quote.id;
    const phone = quote.customer?.mobile;
    return (
      <div key={quote.id} className={`ms-quote-card ${quote.status === 'offered' ? 'is-new' : ''}`}>
        <div className="ms-quote-head">
          <div className="ms-cell-stack">
            <span className="ms-quote-title">{quote.service_title}</span>
            <span className="ms-muted">
              {quote.customer?.username || 'Customer'}
              {phone ? ` · ${phone}` : ''} · {formatAgo(quote.createdAt)}
            </span>
          </div>
          <StatusChip tone={meta.tone}>{meta.label}</StatusChip>
        </div>
        {quote.service_description && <div className="ms-quote-desc">{quote.service_description}</div>}
        <div className="ms-quote-foot">
          <div className="ms-quote-amount">
            <span className="ms-label">Estimate</span>
            <span className="ms-price">{formatINR(quote.estimated_amount)}</span>
          </div>
          <div className="ms-quote-actions">
            {quote.status === 'offered' && (
              <Button
                type="primary"
                icon={<CheckCircleFilled />}
                loading={busy}
                className="ms-btn-primary"
                onClick={() => handleUpdateQuote(quote, { status: 'accepted' }, 'Job confirmed')}
              >
                Confirm job
              </Button>
            )}
            {quote.status === 'accepted' && (
              <Button
                type="primary"
                icon={<CheckCircleFilled />}
                loading={busy}
                className="ms-btn-primary ms-btn-success"
                onClick={() => handleUpdateQuote(quote, { status: 'completed' }, 'Job marked completed')}
              >
                Mark completed
              </Button>
            )}
            {(quote.status === 'offered' || quote.status === 'accepted') && (
              <Button icon={<EditOutlined />} disabled={busy} onClick={() => openReviseQuote(quote)}>
                Revise estimate
              </Button>
            )}
            <Button
              icon={<ChatIcon />}
              onClick={() => chatWithCustomer(quote.customer_id, { customer_name: quote.customer?.username })}
            >
              Chat
            </Button>
            {phone && (
              <Tooltip title={`Call ${phone}`}>
                <Button icon={<PhoneOutlined />} href={`tel:${phone}`} aria-label={`Call ${phone}`} />
              </Tooltip>
            )}
            {quote.status === 'offered' && (
              <Button danger type="text" disabled={busy} onClick={() => confirmDeclineQuote(quote)}>
                Decline
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const quotesTab = (
    <div className="ms-tab-pane">
      <div className="ms-toolbar">
        <div className="ms-toolbar-text">
          <Title level={5} className="ms-section-title">
            Quote requests
          </Title>
          <Text className="ms-section-desc">
            Customers ask for an estimate before booking. Confirm the job, revise the price, or decline.
          </Text>
        </div>
        <div className="ms-toolbar-actions ms-toolbar-actions--inline">
          <Button icon={<ReloadOutlined spin={quotesLoading} />} onClick={() => fetchQuotes({ silent: true })}>
            Refresh
          </Button>
        </div>
      </div>

      {quotes.length > 0 && (
        <div className="ms-filterbar">
          <div className="ms-filter-scroll">
            <Segmented
              value={quoteFilter}
              onChange={setQuoteFilter}
              options={[
                { label: `Open ${quoteStats.open}`, value: 'open' },
                { label: `Closed ${quoteStats.closed}`, value: 'closed' },
                { label: `All ${quoteStats.all}`, value: 'all' },
              ]}
            />
          </div>
        </div>
      )}

      {quotesLoading && quotes.length === 0 ? (
        <div className="ms-order-list">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="ms-quote-card">
              <Skeleton active paragraph={{ rows: 2 }} />
            </div>
          ))}
        </div>
      ) : quotesError && quotes.length === 0 ? (
        <Alert
          type="error"
          showIcon
          message="Quote requests didn't load"
          description={quotesError}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={() => fetchQuotes()}>
              Retry
            </Button>
          }
        />
      ) : filteredQuotes.length === 0 ? (
        <div className="ms-empty ms-empty--compact">
          <span className="ms-empty-icon" aria-hidden="true">
            <FileDoneOutlined />
          </span>
          <div className="ms-empty-title">{quotes.length === 0 ? 'No quote requests yet' : 'Nothing here'}</div>
          <div className="ms-empty-text">
            {quotes.length === 0
              ? 'When a customer taps "Request quote" on one of your services, it lands here.'
              : 'No quotes match this filter.'}
          </div>
        </div>
      ) : (
        <div className="ms-order-list">{filteredQuotes.map(renderQuoteCard)}</div>
      )}
    </div>
  );

  /* ---------------- Render: settings ---------------- */

  const settingField = (key, label, input, hint) => (
    <div className="ms-field">
      <label className="ms-field-label" htmlFor={`ms-setting-${key}`}>
        {label}
      </label>
      {input}
      {settingsErrors[key] ? (
        <div className="ms-field-error" role="alert">
          {settingsErrors[key]}
        </div>
      ) : (
        hint && <div className="ms-field-hint">{hint}</div>
      )}
    </div>
  );

  const updateSetting = (key) => (e) => {
    const { value } = e.target;
    setShopSettings((prev) => ({ ...prev, [key]: value }));
  };

  const settingsTab = (
    <div className="ms-tab-pane">
      <div className="ms-toolbar">
        <div className="ms-toolbar-text">
          <Title level={5} className="ms-section-title">
            Store details
          </Title>
          <Text className="ms-section-desc">
            What customers see on your storefront: name, location and how to reach you.
          </Text>
        </div>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={15}>
          <div className="ms-panel">
            {settingField(
              'shop_name',
              'Store / outlet name',
              <Input
                id="ms-setting-shop_name"
                value={shopSettings.shop_name}
                status={settingsErrors.shop_name ? 'error' : undefined}
                onChange={updateSetting('shop_name')}
                maxLength={120}
              />
            )}
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12}>
                {settingField(
                  'area',
                  'Area / locality',
                  <Input id="ms-setting-area" value={shopSettings.area} onChange={updateSetting('area')} />
                )}
              </Col>
              <Col xs={24} sm={12}>
                {settingField(
                  'mobile_number',
                  'Contact phone',
                  <Input
                    id="ms-setting-mobile_number"
                    value={shopSettings.mobile_number}
                    inputMode="tel"
                    status={settingsErrors.mobile_number ? 'error' : undefined}
                    onChange={updateSetting('mobile_number')}
                  />,
                  'Also used as your UPI ID fallback on orders'
                )}
              </Col>
            </Row>
            {settingField(
              'address',
              'Full street address',
              <Input.TextArea
                id="ms-setting-address"
                rows={2}
                autoSize={{ minRows: 2, maxRows: 4 }}
                value={shopSettings.address}
                onChange={updateSetting('address')}
              />
            )}
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12}>
                {settingField(
                  'website',
                  'Website / social link',
                  <Input
                    id="ms-setting-website"
                    value={shopSettings.website}
                    placeholder="https://..."
                    inputMode="url"
                    onChange={updateSetting('website')}
                  />
                )}
              </Col>
              <Col xs={24} sm={12}>
                {settingField(
                  'img_url',
                  'Storefront image URL',
                  <Input
                    id="ms-setting-img_url"
                    value={shopSettings.img_url}
                    placeholder="https://..."
                    inputMode="url"
                    onChange={updateSetting('img_url')}
                  />
                )}
              </Col>
            </Row>

            <div className="ms-settings-actions">
              <Button
                type="primary"
                loading={savingSettings}
                disabled={!settingsDirty || !settingsValid}
                onClick={handleSaveShopSettings}
                className="ms-btn-primary"
              >
                Save changes
              </Button>
              <Button disabled={!settingsDirty || savingSettings} onClick={() => setShopSettings(pickSettings(currentShop))}>
                Discard
              </Button>
              {settingsDirty && <span className="ms-muted ms-unsaved">Unsaved changes</span>}
            </div>
          </div>
        </Col>

        <Col xs={24} lg={9}>
          <div className="ms-side-stack">
            <div className="ms-panel ms-preview">
              <div className="ms-label">Storefront preview</div>
              <div className="ms-preview-media">
                {shopSettings.img_url && !bannerFailed ? (
                  <img src={shopSettings.img_url} alt="" onError={() => setBannerFailed(true)} />
                ) : (
                  <span className="ms-thumb-fallback" aria-hidden="true">
                    <ShopOutlined />
                  </span>
                )}
              </div>
              <div className="ms-preview-name">{shopSettings.shop_name || 'Your store name'}</div>
              <div className="ms-muted">
                {[shopSettings.area, currentShop.shopCategory?.name || currentShop.shop_type].filter(Boolean).join(' • ')}
              </div>
              {bannerFailed && <div className="ms-field-error">This image link doesn&apos;t load. Check the URL.</div>}
            </div>

            <div className="ms-panel ms-mode">
              <div className="ms-mode-head">
                {isServiceStore ? <ToolOutlined /> : <ShopOutlined />}
                <span>Business mode</span>
                <StatusChip tone={isServiceStore ? 'service' : 'delivery'}>
                  {isServiceStore ? 'Service business' : 'Product store'}
                </StatusChip>
              </div>
              <div className="ms-muted">
                {isServiceStore
                  ? 'Your catalog holds service packages and rate cards. Customers book or request quotes.'
                  : 'Your catalog holds stocked items with prices and units. Customers order for pickup or delivery.'}
              </div>
            </div>

            <div className="ms-panel ms-danger">
              <div className="ms-danger-title">Delete this outlet</div>
              <div className="ms-danger-text">Removes the store and every item in its catalog. This cannot be undone.</div>
              <Button danger icon={<DeleteOutlined />} onClick={confirmDeleteShop} block={isPhone}>
                Delete store
              </Button>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );

  /* ---------------- Render: header, stats, tabs ---------------- */

  const tabLabel = (icon, text, count, hot) => (
    <span className="ms-tab-label">
      <span className="ms-tab-icon" aria-hidden="true">
        {icon}
      </span>
      <span>{text}</span>
      {count !== undefined && count !== null && (
        <span className={`ms-tab-count ${hot ? 'is-hot' : ''}`}>{count}</span>
      )}
    </span>
  );

  const tabItems = [
    {
      key: 'catalog',
      label: tabLabel(<AppstoreOutlined />, catalogTabText, listingsLoaded ? listingStats.total : null),
      children: catalogTab,
    },
    {
      key: 'orders',
      label: tabLabel(<ShoppingCartOutlined />, ordersTabText, ordersLoaded ? orderStats.active : null, orderStats.fresh > 0),
      children: ordersTab,
    },
    ...(showQuotesTab
      ? [
          {
            key: 'quotes',
            label: tabLabel(<FileDoneOutlined />, 'Quotes', quoteStats.open, quoteStats.fresh > 0),
            children: quotesTab,
          },
        ]
      : []),
    {
      key: 'settings',
      label: tabLabel(<SettingOutlined />, 'Settings'),
      children: settingsTab,
    },
  ];

  const statValue = (loaded, value) => (loaded ? value : '–');

  const stats = [
    {
      key: 'items',
      icon: <AppstoreOutlined />,
      value: statValue(listingsLoaded, listingStats.total),
      label: isServiceStore ? 'Services listed' : 'Items listed',
      sub: listingsLoaded ? `${listingStats.inStock} ${availableLabels.on.toLowerCase()}` : '',
      onClick: () => {
        setActiveTab('catalog');
        setStockFilter('all');
      },
    },
    {
      key: 'out',
      icon: <StopOutlined />,
      value: statValue(listingsLoaded, listingStats.outOfStock),
      label: availableLabels.off,
      sub: listingStats.outOfStock > 0 ? 'Tap to review' : 'All good',
      tone: listingStats.outOfStock > 0 ? 'warn' : '',
      onClick: () => {
        setActiveTab('catalog');
        setStockFilter('out');
      },
    },
    {
      key: 'new',
      icon: <ShoppingCartOutlined />,
      value: statValue(ordersLoaded, orderStats.fresh),
      label: isServiceStore ? 'New bookings' : 'New orders',
      sub: ordersLoaded ? `${orderStats.active} active` : '',
      tone: orderStats.fresh > 0 ? 'hot' : '',
      onClick: () => {
        setActiveTab('orders');
        setOrderFilter('active');
      },
    },
    showQuotesTab
      ? {
          key: 'quotes',
          icon: <FileDoneOutlined />,
          value: quoteStats.fresh,
          label: 'Quote requests',
          sub: `${quoteStats.open} open`,
          tone: quoteStats.fresh > 0 ? 'hot' : '',
          onClick: () => {
            setActiveTab('quotes');
            setQuoteFilter('open');
          },
        }
      : {
          key: 'sales',
          icon: <RiseOutlined />,
          value: statValue(ordersLoaded, formatINR(orderStats.sales)),
          label: 'Completed sales',
          sub: ordersLoaded ? `${orderStats.completed} orders` : '',
          onClick: () => {
            setActiveTab('orders');
            setOrderFilter('completed');
          },
        },
  ];

  const orderTotals = selectedOrder ? getOrderTotals(selectedOrder) : null;
  const orderSteps = selectedOrder ? getOrderSteps(selectedOrder) : null;
  const selectedActions = selectedOrder ? getOrderActions(selectedOrder) : null;
  const selectedPhone = selectedOrder ? selectedOrder.customer_phone || selectedOrder.customer?.mobile : '';
  const showDeliveryAddress =
    selectedOrder &&
    selectedOrder.delivery_address &&
    normalizeOrderType(selectedOrder.order_type) !== 'pickup';

  return (
    <div className="manage-store-container">
      {modalContextHolder}

      {/* Header & outlet switcher */}
      <div className="manage-store-header">
        <div className="manage-store-header-left">
          <div className="manage-store-nav-group">
            <Button icon={<ArrowLeftOutlined />} onClick={onClose} className="manage-store-back-btn">
              All stores
            </Button>
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => history.push(`/shop/${shopId}`)}
              className="manage-store-live-btn-mobile"
            >
              View storefront
            </Button>
          </div>

          <div className="manage-store-identity">
            <Avatar
              shape="square"
              size={screens.md ? 52 : 44}
              src={currentShop.img_url || undefined}
              icon={<ShopOutlined />}
              className="manage-store-avatar"
            />
            <div className="manage-store-info">
              <Title level={4} className="manage-store-title">
                {currentShop.shop_name}
              </Title>
              <div className="manage-store-meta">
                <Text className="manage-store-meta-text">
                  {[currentShop.area, currentShop.shopCategory?.name || currentShop.shop_type || 'Store']
                    .filter(Boolean)
                    .join(' • ')}
                </Text>
                <StatusChip
                  tone={isServiceStore ? 'service' : 'delivery'}
                  icon={isServiceStore ? <ToolOutlined /> : <ShopOutlined />}
                >
                  {isServiceStore ? 'Service business' : 'Product store'}
                </StatusChip>
              </div>
            </div>
          </div>
        </div>

        <div className="manage-store-header-right">
          {allShops?.length > 1 && (
            <div className="manage-store-outlet-switcher">
              <Text strong className="manage-store-outlet-switcher-label">
                Outlet
              </Text>
              <Select
                value={shopId}
                className="manage-store-outlet-select"
                popupMatchSelectWidth={false}
                aria-label="Switch outlet"
                onChange={(newId) => {
                  const target = allShops.find((s) => s.id === newId);
                  if (target) onSwitchShop(target);
                }}
                options={allShops.map((s) => ({
                  value: s.id,
                  label: s.area ? `${s.shop_name} (${s.area})` : s.shop_name,
                }))}
              />
            </div>
          )}

          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => history.push(`/shop/${shopId}`)}
            className="manage-store-live-btn-desktop ms-btn-primary"
          >
            View storefront
          </Button>
        </div>
      </div>

      {/* At-a-glance numbers; each one jumps to the matching view */}
      <div className="ms-stats" role="list">
        {stats.map((s) => (
          <button
            key={s.key}
            type="button"
            role="listitem"
            className={`ms-stat ${s.tone ? `ms-stat--${s.tone}` : ''}`}
            onClick={s.onClick}
          >
            <span className="ms-stat-icon" aria-hidden="true">
              {s.icon}
            </span>
            <span className="ms-stat-body">
              <span className="ms-stat-value">{s.value}</span>
              <span className="ms-stat-label">{s.label}</span>
              {s.sub && <span className="ms-stat-sub">{s.sub}</span>}
            </span>
          </button>
        ))}
      </div>

      {/* Main management tabs */}
      <Card className="manage-store-main-card" styles={{ body: { padding: 0 } }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="ms-tabs"
          tabBarGutter={isPhone ? 4 : 8}
          items={tabItems}
        />
      </Card>

      {/* Add / edit listing */}
      <AddProductModal
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        onSuccess={handleListingSaved}
        onOpenImportCsv={() => setIsImportCsvOpen(true)}
        shop={currentShop}
        editingItem={editingItem}
      />

      {/* Bulk CSV import */}
      <ImportProductCsvModal
        open={isImportCsvOpen}
        onClose={() => setIsImportCsvOpen(false)}
        shop={currentShop}
        onSuccess={() => handleListingSaved()}
      />

      {/* Pick items from the shared master catalog (product stores only) */}
      {!isServiceStore && (
        <CatalogPickerModal
          open={isCatalogPickerOpen}
          shopId={shopId}
          onClose={() => setIsCatalogPickerOpen(false)}
          onImported={(listing) => handleListingSaved(listing)}
        />
      )}

      {/* Revise a quote estimate */}
      <Modal
        open={!!revisingQuote}
        title="Revise estimate"
        okText="Send estimate"
        onOk={submitRevisedQuote}
        confirmLoading={!!revisingQuote && updatingQuoteId === revisingQuote.id}
        onCancel={() => setRevisingQuote(null)}
        width={420}
        centered
        destroyOnClose
      >
        {revisingQuote && (
          <div className="ms-revise">
            <div className="ms-muted">{revisingQuote.service_title}</div>
            <label className="ms-field-label" htmlFor="ms-revise-amount">
              New estimate
            </label>
            <InputNumber
              id="ms-revise-amount"
              prefix="₹"
              min={0}
              step={50}
              value={revisedAmount}
              onChange={setRevisedAmount}
              style={{ width: '100%' }}
              autoFocus
              onPressEnter={submitRevisedQuote}
            />
            <div className="ms-field-hint">The customer sees the new amount on their quote.</div>
          </div>
        )}
      </Modal>

      {/* Order details */}
      <Drawer
        open={isOrderDrawerOpen && !!selectedOrder}
        onClose={() => setIsOrderDrawerOpen(false)}
        width={screens.md ? 520 : '100%'}
        className="ms-order-drawer"
        styles={{ body: { padding: isPhone ? 14 : 20 } }}
        title={
          selectedOrder ? (
            <div className="ms-drawer-title">
              <span className="ms-order-number">
                Order #{selectedOrder.order_number || selectedOrder.id?.slice(0, 8)}
              </span>
              <span className="ms-cell-sub">
                <OrderTypeChip type={selectedOrder.order_type} />
                <span className="ms-muted">{formatWhen(selectedOrder.createdAt, true)}</span>
              </span>
            </div>
          ) : (
            'Order details'
          )
        }
        extra={selectedOrder ? <OrderStatusChip status={selectedOrder.status} /> : null}
        footer={
          selectedOrder && (selectedActions.primary || selectedActions.canCancel) ? (
            <div className="ms-drawer-footer">
              {renderPrimaryOrderButton(selectedOrder, { block: true, size: 'large' })}
              {(selectedActions.secondary.length > 0 || selectedActions.canCancel) && (
                <Dropdown menu={orderMenu(selectedOrder, { includeDetails: false })} trigger={['click']} placement="topRight">
                  <Button size="large" icon={<MoreOutlined />}>
                    {selectedActions.primary ? '' : 'Actions'}
                  </Button>
                </Dropdown>
              )}
            </div>
          ) : null
        }
      >
        {selectedOrder && (
          <div className="ms-drawer-body">
            {selectedOrder.status === 'cancelled' ? (
              <Alert
                message="Order cancelled"
                description="This order is no longer active."
                type="error"
                showIcon
              />
            ) : (
              <div className="ms-panel ms-panel--muted">
                <Steps
                  size="small"
                  direction={screens.sm ? 'horizontal' : 'vertical'}
                  labelPlacement={screens.sm ? 'vertical' : undefined}
                  current={orderSteps.step}
                  status={selectedOrder.status === 'completed' ? 'finish' : 'process'}
                  items={orderSteps.items}
                />
                {selectedOrder.status === 'open_to_delivery' && (
                  <div className="ms-note">
                    <CarOutlined />
                    <span>
                      Waiting in the delivery pool. A delivery partner can claim it, or mark it &quot;Out for
                      delivery&quot; when your own courier leaves.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Customer */}
            <div className="ms-panel">
              <div className="ms-panel-title">
                <UserOutlined /> Customer
              </div>
              <div className="ms-customer">
                <Avatar size={44} style={{ background: colors.primary, fontWeight: 700 }}>
                  {(selectedOrder.customer?.username || 'C')[0]?.toUpperCase()}
                </Avatar>
                <div className="ms-cell-stack ms-customer-text">
                  <span className="ms-strong">{selectedOrder.customer?.username || 'Guest customer'}</span>
                  <span className="ms-muted">{selectedPhone || 'No phone recorded'}</span>
                </div>
                <div className="ms-customer-actions">
                  {selectedPhone && (
                    <Button icon={<PhoneOutlined />} href={`tel:${selectedPhone}`}>
                      Call
                    </Button>
                  )}
                  <Button
                    type="primary"
                    icon={<ChatIcon />}
                    className="ms-btn-primary"
                    onClick={() =>
                      chatWithCustomer(
                        selectedOrder.customer_id || selectedOrder.customer?.id || selectedOrder.user_id,
                        {
                          customer_name: selectedOrder.customer?.username,
                          order_number: selectedOrder.order_number,
                        }
                      )
                    }
                  >
                    Chat
                  </Button>
                </div>
              </div>

              {showDeliveryAddress && (
                <div className="ms-address">
                  <EnvironmentOutlined />
                  <div>
                    <div className="ms-label">Delivery address</div>
                    <div>{selectedOrder.delivery_address}</div>
                  </div>
                </div>
              )}

              {selectedOrder.notes && (
                <div className="ms-order-note">
                  <strong>Note:</strong> {selectedOrder.notes}
                </div>
              )}
            </div>

            {/* Items */}
            <div className="ms-panel">
              <div className="ms-panel-title">
                <ShoppingCartOutlined /> Items ({selectedOrder.items?.length || 0})
              </div>
              <div className="ms-bill-lines">
                {(selectedOrder.items || []).map((item, idx) => (
                  <div key={item.id || idx} className="ms-bill-line">
                    <div className="ms-cell-stack">
                      <span className="ms-strong">{item.item_name}</span>
                      <span className="ms-muted">
                        {item.quantity} × {formatINR(item.unit_price)}
                      </span>
                    </div>
                    <span className="ms-strong">
                      {formatINR(Number(item.subtotal) || Number(item.quantity) * Number(item.unit_price))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bill & payment */}
            <div className="ms-panel">
              <div className="ms-panel-title">
                <WalletOutlined /> Bill & payment
              </div>
              <div className="ms-bill-lines">
                <div className="ms-bill-line">
                  <span className="ms-muted">Items subtotal</span>
                  <span>{formatINR(orderTotals.subtotal)}</span>
                </div>
                {orderTotals.deliveryFee > 0 && (
                  <div className="ms-bill-line">
                    <span className="ms-muted">Delivery fee</span>
                    <span>{formatINR(orderTotals.deliveryFee)}</span>
                  </div>
                )}
                <div className="ms-bill-line">
                  <span className="ms-muted">Platform fee</span>
                  <span className={orderTotals.platformFee > 0 ? '' : 'ms-text-success'}>
                    {orderTotals.platformFee > 0 ? formatINR(orderTotals.platformFee) : 'Free'}
                  </span>
                </div>
                <Divider style={{ margin: '4px 0' }} />
                <div className="ms-bill-line ms-bill-total">
                  <span>Customer pays</span>
                  <span className="ms-price">{formatINR(orderTotals.total)}</span>
                </div>
              </div>
              <div className={`ms-payment ${selectedOrder.payment_mode === 'direct_upi' ? 'is-upi' : 'is-cash'}`}>
                {selectedOrder.payment_mode === 'direct_upi' ? <QrcodeOutlined /> : <WalletOutlined />}
                <div className="ms-cell-stack">
                  <span className="ms-strong">
                    {selectedOrder.payment_mode === 'direct_upi' ? 'Direct UPI to your store' : 'Cash on delivery / at counter'}
                  </span>
                  {selectedOrder.shop_upi_id && <span className="ms-muted">UPI: {selectedOrder.shop_upi_id}</span>}
                </div>
              </div>
            </div>

            <div className="ms-ref">
              <span className="ms-muted">Ref: {selectedOrder.order_number || selectedOrder.id}</span>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => handleCopyOrderId(selectedOrder.order_number || selectedOrder.id)}
              >
                Copy
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

ManageStore.propTypes = {
  shop: PropTypes.shape({
    id: PropTypes.string,
    shop_name: PropTypes.string,
    area: PropTypes.string,
    address: PropTypes.string,
    mobile_number: PropTypes.string,
    website: PropTypes.string,
    img_url: PropTypes.string,
    shop_type: PropTypes.string,
    updatedAt: PropTypes.string,
    shopCategory: PropTypes.shape({
      name: PropTypes.string,
    }),
  }),
  allShops: PropTypes.arrayOf(PropTypes.object),
  onSwitchShop: PropTypes.func,
  onClose: PropTypes.func,
  onRefreshShop: PropTypes.func,
};

export default ManageStore;
