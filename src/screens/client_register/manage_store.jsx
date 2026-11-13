import React, { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  Tabs,
  Button,
  Table,
  Tag,
  Switch,
  Space,
  Input,
  Select,
  Typography,
  message,
  Popconfirm,
  Flex,
  Row,
  Col,
  Drawer,
  Divider,
  Avatar,
  Grid,
  Steps,
  Alert,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  ShopOutlined,
  EyeOutlined,
  ArrowLeftOutlined,
  ShoppingCartOutlined,
  FileTextOutlined,
  SettingOutlined,
  PhoneOutlined,
  MessageOutlined,
  EnvironmentOutlined,
  CheckCircleFilled,
  CarOutlined,
  ThunderboltFilled,
  UserOutlined,
  CopyOutlined,
  ToolOutlined,
  PlusOutlined,
  SyncOutlined,
  QrcodeOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { netWorkCall, apiConfig } from '../../app/utils';
import { useHistory } from 'react-router-dom';
import { AddProductModal, ImportProductCsvModal } from '../../app/components';
import { useChatStore } from '../../app/services';
import { colors, radii, typography } from '../../app/styles/theme';
import './client_register.css';

const { Title, Text } = Typography;
const { Option } = Select;

const ManageStore = ({
  shop,
  allShops,
  onSwitchShop,
  onClose,
  onRefreshShop,
}) => {
  const history = useHistory();
  const screens = Grid.useBreakpoint();
  const { handleChatOpen } = useChatStore((state) => state);
  const [activeTab, setActiveTab] = useState('catalog');

  // Order Details Sidebar Drawer state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);

  // Listings state
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isImportCsvOpen, setIsImportCsvOpen] = useState(false);

  // Orders state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Shop Settings state
  const [shopSettings, setShopSettings] = useState({
    shop_name: shop?.shop_name || '',
    address: shop?.address || '',
    area: shop?.area || '',
    mobile_number: shop?.mobile_number || '',
    website: shop?.website || '',
    img_url: shop?.img_url || '',
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [deletingShop, setDeletingShop] = useState(false);

  useEffect(() => {
    if (shop) {
      setShopSettings({
        shop_name: shop.shop_name || '',
        address: shop.address || '',
        area: shop.area || '',
        mobile_number: shop.mobile_number || '',
        website: shop.website || '',
        img_url: shop.img_url || '',
      });
    }
  }, [shop]);

  const handleSaveShopSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await netWorkCall(
        apiConfig.register_shop,
        'POST',
        JSON.stringify({
          shop_id: shop.id,
          ...shopSettings,
        }),
        true
      );
      if (res?.success) {
        message.success('Store settings & multi-category preferences updated!');
        onRefreshShop?.();
      } else {
        message.error(res?.error || 'Failed to update store settings');
      }
    } catch (err) {
      console.error(err);
      message.error('An error occurred while saving store settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeleteShop = async () => {
    setDeletingShop(true);
    try {
      const res = await netWorkCall(
        `${apiConfig.shop_delete}/${shop.id}`,
        'DELETE',
        null,
        true
      );
      if (res?.success) {
        message.success('Store deleted successfully');
        onRefreshShop?.();
        onClose?.();
      } else {
        message.error(res?.error || 'Failed to delete store');
      }
    } catch (err) {
      console.error(err);
      message.error('Failed to delete store');
    } finally {
      setDeletingShop(false);
    }
  };

  // Compute store archetype
  const storeArchetype = useMemo(() => {
    const typeStr = (
      (shop?.shop_type || '') +
      ' ' +
      (shop?.shopCategory?.name || '')
    ).toLowerCase();

    if (
      typeStr.includes('restaurant') ||
      typeStr.includes('food') ||
      typeStr.includes('bakery') ||
      typeStr.includes('cafe') ||
      typeStr.includes('biri') ||
      typeStr.includes('tiffin')
    ) {
      return 'food';
    }
    if (
      typeStr.includes('electric') ||
      typeStr.includes('hardware') ||
      typeStr.includes('technician') ||
      typeStr.includes('plumb') ||
      typeStr.includes('laundry')
    ) {
      return 'service';
    }
    if (
      typeStr.includes('salon') ||
      typeStr.includes('spa') ||
      typeStr.includes('massage') ||
      typeStr.includes('beauty')
    ) {
      return 'wellness';
    }
    if (
      typeStr.includes('rental') ||
      typeStr.includes('bike') ||
      typeStr.includes('audio') ||
      typeStr.includes('sport') ||
      typeStr.includes('turf')
    ) {
      return 'rental';
    }
    return 'product';
  }, [shop]);

  const isServiceStore = storeArchetype === 'service' || storeArchetype === 'wellness';

  const fetchListings = async () => {
    if (!shop?.id) return;
    setListingsLoading(true);
    try {
      const res = await netWorkCall(
        `${apiConfig.listings_by_shop}/${shop.id}`,
        'GET',
        null,
        false
      );
      if (res?.data) {
        setListings(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setListingsLoading(false);
    }
  };

  const fetchOrders = async () => {
    if (!shop?.id) return;
    setOrdersLoading(true);
    try {
      const res = await netWorkCall(
        `${apiConfig.orders_shop}/${shop.id}`,
        'GET',
        null,
        true
      );
      if (res?.data) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
    fetchOrders();
  }, [shop?.id]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (record) => {
    setEditingItem(record);
    setIsAddModalOpen(true);
  };

  // Toggle Availability
  const handleToggleAvailable = async (item, checked) => {
    try {
      await netWorkCall(
        `${apiConfig.listings_update}/${item.id}`,
        'PUT',
        JSON.stringify({ is_available: checked })
      );
      setListings((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_available: checked } : i))
      );
      message.success(`Item marked as ${checked ? 'In Stock' : 'Out of Stock'}`);
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Listing
  const handleDeleteListing = async (id) => {
    try {
      await netWorkCall(`${apiConfig.listings_delete}/${id}`, 'DELETE');
      message.success('Item removed from catalog');
      fetchListings();
      onRefreshShop?.();
    } catch (err) {
      console.error(err);
    }
  };

  // Update Order Status
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await netWorkCall(
        `${apiConfig.orders_status}/${orderId}/status`,
        'PUT',
        JSON.stringify({ status: newStatus }),
        true
      );
      if (res?.success) {
        message.success(`Order marked as ${newStatus}`);
        fetchOrders();
        setSelectedOrder((prev) =>
          prev && prev.id === orderId ? { ...prev, status: newStatus } : prev
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyOrderId = (id) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(id);
      message.success('Order ID copied to clipboard');
    }
  };

  const getOrderStatusStep = (order) => {
    if (!order) return { step: 0, items: [] };
    const type = order.order_type || 'delivery';
    const status = order.status || 'placed';

    if (type === 'pickup') {
      const items = [
        { title: 'Placed', description: 'Order received' },
        { title: 'Preparing', description: 'Packing items' },
        { title: 'Ready', description: 'Counter pickup' },
        { title: 'Completed', description: 'Handed over' },
      ];
      let step = 0;
      if (status === 'order_prepare' || status === 'preparing' || status === 'accepted') step = 1;
      else if (status === 'ready_for_pickup') step = 2;
      else if (status === 'completed') step = 3;
      return { step, items };
    }

    if (type === 'service') {
      const items = [
        { title: 'Booked', description: 'Request received' },
        { title: 'In Progress', description: 'Service ongoing' },
        { title: 'Completed', description: 'Service fulfilled' },
      ];
      let step = 0;
      if (status === 'order_prepare' || status === 'preparing' || status === 'accepted') step = 1;
      else if (status === 'completed') step = 2;
      return { step, items };
    }

    // Default: delivery
    const items = [
      { title: 'Placed', description: 'Order received' },
      { title: 'Preparing', description: 'Packing items' },
      { title: 'Open to Delivery', description: 'Fleet dispatch' },
      { title: 'Out for Delivery', description: 'On the way' },
      { title: 'Delivered', description: 'Order completed' },
    ];
    let step = 0;
    if (status === 'order_prepare' || status === 'preparing' || status === 'accepted') step = 1;
    else if (status === 'open_to_delivery') step = 2;
    else if (status === 'out_for_delivery') step = 3;
    else if (status === 'completed') step = 4;
    return { step, items };
  };

  const listingColumns = [
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Item / Service
        </span>
      ),
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (name, record) => (
        <Flex align="center" gap={10}>
          {record.img_url ? (
            <img
              src={record.img_url}
              alt={name}
              style={{ width: 44, height: 44, borderRadius: radii.md, objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: radii.md,
                background: colors.surfaceContainerLow,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.textLight,
              }}
            >
              <FileTextOutlined />
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, color: colors.textMain, fontFamily: typography.fontFamily.headline }}>{name}</div>
            <Flex gap={4} align="center" style={{ marginTop: 2 }} wrap="wrap">
              <Tag
                style={{
                  fontSize: 10,
                  lineHeight: '16px',
                  margin: 0,
                  borderRadius: radii.xs,
                  fontWeight: 600,
                  background: colors.verifiedChipBg,
                  color: colors.verifiedChipText,
                  borderColor: colors.verifiedChipBorder,
                }}
              >
                {record.listing_type}
              </Tag>
              {record.metadata?.section && (
                <Tag style={{ fontSize: 10, lineHeight: '16px', margin: 0, borderRadius: radii.xs, background: colors.surfaceContainerLow, color: colors.textMuted, borderColor: colors.border }}>
                  {record.metadata.section}
                </Tag>
              )}
              {record.metadata?.food_type && (
                <Tag
                  style={{
                    fontSize: 10,
                    lineHeight: '16px',
                    margin: 0,
                    borderRadius: radii.xs,
                    background: record.metadata.food_type === 'veg' ? colors.semantic.successLight : colors.semantic.errorLight,
                    color: record.metadata.food_type === 'veg' ? colors.semantic.success : colors.semantic.error,
                    borderColor: record.metadata.food_type === 'veg' ? colors.semantic.successBorder : colors.semantic.errorBorder,
                  }}
                >
                  {record.metadata.food_type === 'veg' ? 'Veg' : 'Non-Veg'}
                </Tag>
              )}
            </Flex>
          </div>
        </Flex>
      ),
    },
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Price / Unit
        </span>
      ),
      key: 'price',
      width: 130,
      render: (_, record) => (
        <div>
          <span style={{ fontWeight: 800, color: colors.primary, fontFamily: typography.fontFamily.headline }}>₹{record.price}</span>
          <span style={{ fontSize: 12, color: colors.textMuted, fontFamily: typography.fontFamily.body }}> / {record.unit}</span>
          {record.mrp && record.mrp > record.price && (
            <div style={{ fontSize: 11, color: colors.textLight, textDecoration: 'line-through' }}>
              MRP: ₹{record.mrp}
            </div>
          )}
        </div>
      ),
    },
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          In Stock
        </span>
      ),
      key: 'is_available',
      width: 95,
      render: (_, record) => (
        <Switch
          checked={record.is_available}
          onChange={(checked) => handleToggleAvailable(record, checked)}
        />
      ),
    },
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Actions
        </span>
      ),
      key: 'actions',
      width: 105,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            style={{ borderRadius: radii.sm, borderColor: colors.border }}
            onClick={() => handleOpenEditModal(record)}
          />
          <Popconfirm
            title="Delete this listing?"
            onConfirm={() => handleDeleteListing(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: radii.sm }} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const orderColumns = [
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Order ID
        </span>
      ),
      dataIndex: 'order_number',
      key: 'order_number',
      width: 120,
      render: (val, record) => (
        <div>
          <Button
            type="link"
            onClick={() => {
              setSelectedOrder(record);
              setIsOrderDrawerOpen(true);
            }}
            style={{ padding: 0, fontWeight: 700, fontSize: 13, color: colors.primary, fontFamily: typography.fontFamily.headline }}
          >
            #{val}
          </Button>
          <div style={{ fontSize: 11, color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
            {new Date(record.createdAt).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      ),
    },
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Type
        </span>
      ),
      dataIndex: 'order_type',
      key: 'order_type',
      width: 100,
      render: (type) => (
        <Tag
          style={{
            borderRadius: radii.full,
            fontWeight: 700,
            fontSize: 11,
            padding: '1px 8px',
            background:
              type === 'delivery'
                ? colors.verifiedChipBg
                : type === 'service'
                ? colors.serviceChipBg
                : colors.primaryLight,
            color:
              type === 'delivery'
                ? colors.verifiedChipText
                : type === 'service'
                ? colors.serviceChipText
                : colors.primary,
            borderColor:
              type === 'delivery'
                ? colors.verifiedChipBorder
                : type === 'service'
                ? colors.serviceChipBorder
                : 'rgba(11, 45, 107, 0.2)',
          }}
          icon={type === 'delivery' ? <CarOutlined /> : type === 'service' ? <ToolOutlined /> : <ShopOutlined />}
        >
          {type === 'delivery' ? 'Delivery' : type === 'service' ? 'Service' : 'Pickup'}
        </Tag>
      ),
    },
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Customer
        </span>
      ),
      key: 'customer',
      width: 140,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: colors.textMain, fontFamily: typography.fontFamily.body }}>
            {record.customer?.username || 'Customer'}
          </div>
          <div style={{ fontSize: 12, color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
            {record.customer_phone || record.customer?.mobile}
          </div>
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
      width: 150,
      render: (_, record) => (
        <div>
          {record.items?.map((it, idx) => (
            <div key={idx} style={{ fontSize: 12, color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
              {it.quantity}x {it.item_name}
            </div>
          ))}
        </div>
      ),
    },
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Amount
        </span>
      ),
      key: 'amount',
      width: 110,
      render: (_, record) => (
        <div>
          <span style={{ fontWeight: 800, color: colors.primary, fontFamily: typography.fontFamily.headline }}>₹{record.total_amount}</span>
          <div style={{ fontSize: 11, color: colors.semantic.success, fontWeight: 600, fontFamily: typography.fontFamily.body }}>
            {record.payment_mode === 'direct_upi' ? 'Direct UPI' : 'COD'}
          </div>
        </div>
      ),
    },
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Status
        </span>
      ),
      key: 'status',
      width: 150,
      render: (_, record) => {
        const statusStyles = {
          placed: { bg: colors.primaryLight, color: colors.primary, border: colors.verifiedChipBorder },
          pending: { bg: colors.semantic.warningLight, color: colors.tertiary, border: colors.semantic.warningBorder },
          order_prepare: { bg: colors.secondaryLight, color: colors.secondary, border: colors.verifiedChipBorder },
          preparing: { bg: colors.secondaryLight, color: colors.secondary, border: colors.verifiedChipBorder },
          accepted: { bg: colors.secondaryLight, color: colors.secondary, border: colors.verifiedChipBorder },
          ready_for_pickup: { bg: colors.verifiedChipBg, color: colors.verifiedChipText, border: colors.verifiedChipBorder },
          open_to_delivery: { bg: colors.serviceChipBg, color: colors.serviceChipText, border: colors.serviceChipBorder },
          out_for_delivery: { bg: colors.secondaryLight, color: colors.secondaryHover, border: colors.verifiedChipBorder },
          completed: { bg: colors.semantic.successLight, color: colors.semantic.successHover, border: colors.semantic.successBorder },
          cancelled: { bg: colors.semantic.errorLight, color: colors.semantic.error, border: colors.semantic.errorBorder },
        };
        const statusLabels = {
          placed: 'Order Placed',
          pending: 'Pending',
          order_prepare: 'Preparing',
          preparing: 'Preparing',
          accepted: 'Accepted',
          ready_for_pickup: 'Ready for Pickup',
          open_to_delivery: 'Open to Delivery',
          out_for_delivery: 'Out for Delivery',
          completed: 'Completed',
          cancelled: 'Cancelled',
        };
        const chip = statusStyles[record.status] || {
          bg: colors.surfaceContainerLow,
          color: colors.textMuted,
          border: colors.border,
        };
        return (
          <Tag
            style={{
              fontWeight: 600,
              borderRadius: radii.full,
              background: chip.bg,
              color: chip.color,
              borderColor: chip.border,
            }}
          >
            {statusLabels[record.status] || record.status}
          </Tag>
        );
      },
    },
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Update Action
        </span>
      ),
      key: 'action',
      width: 160,
      render: (_, record) => {
        const isSelfPickup = record.order_type === 'pickup';
        const isDelivery = record.order_type === 'delivery';

        return (
          <Space wrap size={[6, 6]}>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedOrder(record);
                setIsOrderDrawerOpen(true);
              }}
              style={{ borderRadius: radii.md, fontWeight: 600, color: colors.secondary, borderColor: colors.border, background: colors.surface }}
            >
              Details
            </Button>

            {/* If Placed or Pending: Start Preparation */}
            {(record.status === 'placed' || record.status === 'pending') && (
              <Button
                type="primary"
                size="small"
                icon={<SyncOutlined />}
                style={{ background: colors.secondary, borderColor: colors.secondary, fontWeight: 600, borderRadius: radii.md }}
                onClick={() => handleUpdateOrderStatus(record.id, 'order_prepare')}
              >
                Order Prepare
              </Button>
            )}

            {/* If Order Prepare / Preparing / Accepted */}
            {(record.status === 'order_prepare' ||
              record.status === 'preparing' ||
              record.status === 'accepted') && (
              <>
                {/* Self-Pickup: Move to Ready for Pickup */}
                {isSelfPickup && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckCircleFilled />}
                    style={{ background: colors.primary, borderColor: colors.primary, fontWeight: 600, borderRadius: radii.md }}
                    onClick={() => handleUpdateOrderStatus(record.id, 'ready_for_pickup')}
                  >
                    Ready for Pickup
                  </Button>
                )}

                {/* Delivery: Move to Open to Delivery */}
                {isDelivery && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<CarOutlined />}
                    style={{ background: colors.secondary, borderColor: colors.secondary, fontWeight: 600, borderRadius: radii.md }}
                    onClick={() => handleUpdateOrderStatus(record.id, 'open_to_delivery')}
                  >
                    Open to Delivery
                  </Button>
                )}

                {/* Service or Direct Completion */}
                {!isDelivery && (
                  <Button
                    type="primary"
                    size="small"
                    style={{ background: colors.semantic.success, borderColor: colors.semantic.success, fontWeight: 600, borderRadius: radii.md }}
                    onClick={() => handleUpdateOrderStatus(record.id, 'completed')}
                  >
                    Mark Completed
                  </Button>
                )}

                {/* Option to revert/set back to Placed */}
                <Button
                  size="small"
                  onClick={() => handleUpdateOrderStatus(record.id, 'placed')}
                  style={{ borderRadius: radii.md, borderColor: colors.border, color: colors.textMuted }}
                >
                  ↩️ Placed
                </Button>
              </>
            )}

            {/* If Ready for Pickup: Mark Completed */}
            {record.status === 'ready_for_pickup' && (
              <Button
                type="primary"
                size="small"
                style={{ background: colors.semantic.success, borderColor: colors.semantic.success, fontWeight: 600, borderRadius: radii.md }}
                onClick={() => handleUpdateOrderStatus(record.id, 'completed')}
              >
                ✅ Hand Over
              </Button>
            )}

            {/* If Open to Delivery */}
            {record.status === 'open_to_delivery' && (
              <Button
                type="primary"
                size="small"
                style={{ background: colors.semantic.success, borderColor: colors.semantic.success, fontWeight: 600, borderRadius: radii.md }}
                onClick={() => handleUpdateOrderStatus(record.id, 'completed')}
              >
                ✅ Delivered
              </Button>
            )}

            {/* If Out for Delivery */}
            {record.status === 'out_for_delivery' && (
              <Button
                type="primary"
                size="small"
                style={{ background: colors.semantic.success, borderColor: colors.semantic.success, fontWeight: 600, borderRadius: radii.md }}
                onClick={() => handleUpdateOrderStatus(record.id, 'completed')}
              >
                ✅ Delivered
              </Button>
            )}

            {/* Reject / Cancel */}
            {record.status !== 'completed' && record.status !== 'cancelled' && (
              <Button
                size="small"
                danger
                onClick={() => handleUpdateOrderStatus(record.id, 'cancelled')}
                style={{ borderRadius: radii.md, borderColor: colors.semantic.errorBorder, color: colors.semantic.error }}
              >
                Reject
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  // Dynamic titles tailored to Product vs Service store
  const catalogTabLabel = isServiceStore
    ? `Services & Packages (${listings.length})`
    : storeArchetype === 'food'
    ? `Food Menu & Dishes (${listings.length})`
    : `Products & Inventory (${listings.length})`;

  const catalogTitle = isServiceStore
    ? 'Services & Rate Card'
    : storeArchetype === 'food'
    ? 'Food Menu & Dishes'
    : 'Products & Stock Inventory';

  const catalogDesc = isServiceStore
    ? 'Fixed-price technician services, home maintenance, and inspection packages offered by your business.'
    : storeArchetype === 'food'
    ? 'Manage ready-to-eat dishes, beverages, and daily food items for direct ordering.'
    : 'Manage retail products, stock availability, and unit pricing for local customers.';

  const addItemButtonLabel = isServiceStore
    ? 'Add Service Package'
    : storeArchetype === 'food'
    ? 'Add Dish / Beverage'
    : 'Add Product';

  const ordersTabLabel = isServiceStore
    ? `Service Bookings (${orders.length})`
    : `Customer Orders (${orders.length})`;

  const ordersTitle = isServiceStore
    ? 'Direct Service Bookings'
    : 'Direct Customer Orders';

  const ordersDesc = isServiceStore
    ? 'Service appointments and technician requests placed directly with your business.'
    : 'Orders placed directly with your store. Fulfill via direct pickup counter or delivery.';

  return (
    <div className="manage-store-container">
      {/* Top Header & Store Switcher */}
      <div className="manage-store-header">
        <div className="manage-store-header-left">
          <div className="manage-store-nav-group">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={onClose}
              className="manage-store-back-btn"
            >
              All Stores
            </Button>

            {/* Mobile-only Live Storefront button for instant access */}
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => history.push(`/shop/${shop.id}`)}
              className="manage-store-live-btn-mobile"
            >
              Live Storefront
            </Button>
          </div>

          <div className="manage-store-info">
            <Title
              level={4}
              className="manage-store-title"
              style={{
                margin: 0,
                fontFamily: typography.fontFamily.headline,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: colors.textMain,
              }}
            >
              {shop.shop_name}
            </Title>
            <div className="manage-store-meta">
              <Text style={{ fontSize: 13, color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
                {shop.area} • {shop.shopCategory?.name || shop.shop_type || 'Store Outlet'}
              </Text>
              <Tag
                icon={isServiceStore ? <ToolOutlined /> : <ShopOutlined />}
                style={{
                  fontSize: 11,
                  margin: 0,
                  borderRadius: radii.full,
                  fontWeight: 700,
                  background: isServiceStore ? colors.serviceChipBg : colors.verifiedChipBg,
                  borderColor: isServiceStore ? colors.serviceChipBorder : colors.verifiedChipBorder,
                  color: isServiceStore ? colors.serviceChipText : colors.verifiedChipText,
                }}
              >
                {isServiceStore ? 'Service Business' : 'Product Store'}
              </Tag>
            </div>
          </div>
        </div>

        <div className="manage-store-header-right">
          {allShops?.length > 1 && (
            <div className="manage-store-outlet-switcher">
              <Text strong className="manage-store-outlet-switcher-label" style={{ fontFamily: typography.fontFamily.headline, color: colors.textMain }}>
                Switch Outlet:
              </Text>
              <Select
                value={shop.id}
                className="manage-store-outlet-select"
                style={{ borderRadius: radii.md }}
                onChange={(newId) => {
                  const target = allShops.find((s) => s.id === newId);
                  if (target) onSwitchShop(target);
                }}
              >
                {allShops.map((s) => (
                  <Option key={s.id} value={s.id}>
                    {s.shop_name} ({s.area || 'Branch'})
                  </Option>
                ))}
              </Select>
            </div>
          )}

          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => history.push(`/shop/${shop.id}`)}
            className="manage-store-live-btn-desktop"
            style={{ fontWeight: 600, borderRadius: radii.md, background: colors.primary, borderColor: colors.primary, boxShadow: '0 2px 8px rgba(11, 45, 107, 0.18)' }}
          >
            Live Storefront
          </Button>
        </div>
      </div>

      {/* Main Management Tabs */}
      <Card
        className="manage-store-main-card"
        style={{
          borderRadius: radii.xl,
          border: `1px solid ${colors.border}`,
          background: colors.surface,
        }}
        styles={{ body: { padding: screens.xs ? '14px 12px' : 20 } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'catalog',
              label: (
                <span className="manage-store-tab-label" style={{ fontWeight: 700, fontSize: 15, fontFamily: typography.fontFamily.headline }}>
                  {catalogTabLabel}
                </span>
              ),
              children: (
                <div>
                  <div className="manage-store-tab-header">
                    <div>
                      <Title level={5} style={{ margin: 0, fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
                        {catalogTitle}
                      </Title>
                      <Text style={{ fontSize: 13, color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
                        {catalogDesc}
                      </Text>
                    </div>

                    <Space wrap>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleOpenAddModal}
                        className="manage-store-add-item-btn"
                        style={{
                          borderRadius: radii.md,
                          fontWeight: 700,
                          background: colors.primary,
                          borderColor: colors.primary,
                          boxShadow: '0 2px 8px rgba(11, 45, 107, 0.18)',
                        }}
                      >
                        {addItemButtonLabel}
                      </Button>
                    </Space>
                  </div>

                  <div
                    style={{
                      border: `1px solid ${colors.border}`,
                      borderRadius: radii.lg,
                      overflow: 'hidden',
                      background: colors.surface,
                    }}
                  >
                    <Table
                      columns={listingColumns}
                      dataSource={listings}
                      rowKey="id"
                      loading={listingsLoading}
                      scroll={{ x: 'max-content' }}
                      pagination={{ pageSize: 8 }}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: 'orders',
              label: (
                <span style={{ fontWeight: 700, fontSize: 15, fontFamily: typography.fontFamily.headline }}>
                  {ordersTabLabel}
                </span>
              ),
              children: (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Title level={5} style={{ margin: 0, fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
                      {ordersTitle}
                    </Title>
                    <Text style={{ fontSize: 13, color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
                      {ordersDesc} Click on any order to open the full transaction & delivery tracker sidebar.
                    </Text>
                  </div>

                  <div
                    style={{
                      border: `1px solid ${colors.border}`,
                      borderRadius: radii.lg,
                      overflow: 'hidden',
                      background: colors.surface,
                    }}
                  >
                    <Table
                      columns={orderColumns}
                      dataSource={orders}
                      rowKey="id"
                      loading={ordersLoading}
                      scroll={{ x: 'max-content' }}
                      pagination={{ pageSize: 8 }}
                      onRow={(record) => ({
                        onClick: (e) => {
                          if (e.target.closest('button') || e.target.closest('.ant-btn')) return;
                          setSelectedOrder(record);
                          setIsOrderDrawerOpen(true);
                        },
                        style: { cursor: 'pointer' },
                      })}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: 'settings',
              label: (
                <span style={{ fontWeight: 700, fontSize: 15, fontFamily: typography.fontFamily.headline }}>
                  <SettingOutlined /> Store Settings & Info
                </span>
              ),
              children: (
                <div style={{ maxWidth: 700 }}>
                  <div style={{ marginBottom: 20 }}>
                    <Title level={5} style={{ margin: 0, fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
                      Store Information & Business Profile
                    </Title>
                    <Text style={{ fontSize: 13, color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
                      Update your storefront profile, location information, and customer contact details.
                    </Text>
                  </div>

                  <Card style={{ borderRadius: radii.xl, border: `1px solid ${colors.border}`, marginBottom: 20, background: colors.surface }}>
                    <div style={{ marginBottom: 16 }}>
                      <Text strong style={{ display: 'block', marginBottom: 4, color: colors.textMain, fontFamily: typography.fontFamily.body }}>
                        Store / Outlet Name:
                      </Text>
                      <Input
                        value={shopSettings.shop_name}
                        style={{ borderRadius: radii.md, borderColor: colors.border }}
                        onChange={(e) =>
                          setShopSettings((prev) => ({ ...prev, shop_name: e.target.value }))
                        }
                      />
                    </div>

                    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                      <Col xs={24} sm={12}>
                        <Text strong style={{ display: 'block', marginBottom: 4, color: colors.textMain, fontFamily: typography.fontFamily.body }}>
                          Area / Locality:
                        </Text>
                        <Input
                          value={shopSettings.area}
                          style={{ borderRadius: radii.md, borderColor: colors.border }}
                          onChange={(e) =>
                            setShopSettings((prev) => ({ ...prev, area: e.target.value }))
                          }
                        />
                      </Col>
                      <Col xs={24} sm={12}>
                        <Text strong style={{ display: 'block', marginBottom: 4, color: colors.textMain, fontFamily: typography.fontFamily.body }}>
                          Contact Phone:
                        </Text>
                        <Input
                          value={shopSettings.mobile_number}
                          style={{ borderRadius: radii.md, borderColor: colors.border }}
                          onChange={(e) =>
                            setShopSettings((prev) => ({ ...prev, mobile_number: e.target.value }))
                          }
                        />
                      </Col>
                    </Row>

                    <div style={{ marginBottom: 16 }}>
                      <Text strong style={{ display: 'block', marginBottom: 4, color: colors.textMain, fontFamily: typography.fontFamily.body }}>
                        Full Street Address:
                      </Text>
                      <Input.TextArea
                        rows={2}
                        value={shopSettings.address}
                        style={{ borderRadius: radii.md, borderColor: colors.border }}
                        onChange={(e) =>
                          setShopSettings((prev) => ({ ...prev, address: e.target.value }))
                        }
                      />
                    </div>

                    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                      <Col xs={24} sm={12}>
                        <Text strong style={{ display: 'block', marginBottom: 4, color: colors.textMain, fontFamily: typography.fontFamily.body }}>
                          Website / Social:
                        </Text>
                        <Input
                          value={shopSettings.website}
                          placeholder="https://..."
                          style={{ borderRadius: radii.md, borderColor: colors.border }}
                          onChange={(e) =>
                            setShopSettings((prev) => ({ ...prev, website: e.target.value }))
                          }
                        />
                      </Col>
                      <Col xs={24} sm={12}>
                        <Text strong style={{ display: 'block', marginBottom: 4, color: colors.textMain, fontFamily: typography.fontFamily.body }}>
                          Storefront Banner / Image URL:
                        </Text>
                        <Input
                          value={shopSettings.img_url}
                          placeholder="https://images.unsplash.com/..."
                          style={{ borderRadius: radii.md, borderColor: colors.border }}
                          onChange={(e) =>
                            setShopSettings((prev) => ({ ...prev, img_url: e.target.value }))
                          }
                        />
                      </Col>
                    </Row>

                    {/* Business Operating Mode */}
                    <div
                      style={{
                        background: colors.surfaceContainerLow,
                        border: `1px solid ${colors.border}`,
                        borderRadius: radii.lg,
                        padding: '14px 16px',
                        marginBottom: 20,
                      }}
                    >
                      <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                        <div>
                          <Text strong style={{ fontSize: 14, color: colors.textMain, display: 'flex', alignItems: 'center', gap: 6, fontFamily: typography.fontFamily.headline }}>
                            {isServiceStore ? <ToolOutlined style={{ color: colors.secondary, marginRight: 4 }} /> : <ShopOutlined style={{ color: colors.semantic.success, marginRight: 4 }} />}
                            Business Operating Mode
                          </Text>
                          <Text style={{ fontSize: 12, display: 'block', marginTop: 4, color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
                            {isServiceStore
                              ? 'Configured for service businesses: catalog supports service packages, rate cards, and appointment bookings.'
                              : 'Configured for retail stores: catalog supports in-stock inventory, item variants, and local orders.'}
                          </Text>
                        </div>
                        <Tag
                          style={{
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: radii.full,
                            fontSize: 12,
                            background: isServiceStore ? colors.serviceChipBg : colors.verifiedChipBg,
                            borderColor: isServiceStore ? colors.serviceChipBorder : colors.verifiedChipBorder,
                            color: isServiceStore ? colors.serviceChipText : colors.verifiedChipText,
                          }}
                        >
                          {isServiceStore ? 'Service Category' : 'Product Category'}
                        </Tag>
                      </Flex>
                    </div>

                    <Button
                      type="primary"
                      loading={savingSettings}
                      onClick={handleSaveShopSettings}
                      style={{
                        background: colors.primary,
                        borderColor: colors.primary,
                        fontWeight: 700,
                        borderRadius: radii.md,
                        width: screens.xs ? '100%' : 'auto',
                        height: screens.xs ? 42 : 'auto',
                        boxShadow: '0 2px 8px rgba(11, 45, 107, 0.18)',
                      }}
                    >
                      Save Store Settings
                    </Button>
                  </Card>

                  {/* Danger Zone: Delete Store */}
                  <Card
                    style={{
                      borderRadius: radii.xl,
                      border: `1px solid ${colors.semantic.errorBorder}`,
                      background: colors.semantic.errorLight,
                    }}
                  >
                    <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
                      <div>
                        <Text strong style={{ color: colors.semantic.error, fontSize: 14, display: 'block', fontFamily: typography.fontFamily.headline }}>
                          Danger Zone: Delete Store Outlet
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.semantic.errorHover, fontFamily: typography.fontFamily.body }}>
                          Permanently delete this shop outlet and remove all its catalog items.
                        </Text>
                      </div>

                      <Popconfirm
                        title="Delete this store outlet?"
                        description="This cannot be undone. All listings under this store will be permanently deleted."
                        okText="Yes, Delete Store"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true, loading: deletingShop }}
                        onConfirm={handleDeleteShop}
                      >
                        <Button danger type="primary" style={{ width: screens.xs ? '100%' : 'auto', borderRadius: radii.md }}>
                          Delete Store Outlet
                        </Button>
                      </Popconfirm>
                    </Flex>
                  </Card>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Reusable Archetype-Aware Add / Edit Product Modal */}
      <AddProductModal
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        onSuccess={() => {
          fetchListings();
          onRefreshShop?.();
        }}
        onOpenImportCsv={() => setIsImportCsvOpen(true)}
        shop={shop}
        editingItem={editingItem}
      />

      {/* Dynamic CSV Product Import Modal with Confirmation Table */}
      <ImportProductCsvModal
        open={isImportCsvOpen}
        onClose={() => setIsImportCsvOpen(false)}
        shop={shop}
        onSuccess={() => {
          fetchListings();
          onRefreshShop?.();
        }}
      />

      {/* Comprehensive Order Details Sidebar Drawer */}
      <Drawer
        open={isOrderDrawerOpen}
        onClose={() => setIsOrderDrawerOpen(false)}
        width={screens.md ? 540 : '100%'}
        title={
          selectedOrder ? (
            <Flex justify="space-between" align="center" wrap="wrap" gap={8} style={{ width: '100%', paddingRight: 12 }}>
              <div>
                <span style={{ fontSize: 16, fontWeight: 800, color: colors.textMain, fontFamily: typography.fontFamily.headline }}>
                  Order #{selectedOrder.order_number || selectedOrder.id?.slice(0, 8)}
                </span>
                <div style={{ fontSize: 12, color: colors.textMuted, fontWeight: 500, marginTop: 2, fontFamily: typography.fontFamily.body }}>
                  {selectedOrder.createdAt &&
                    new Date(selectedOrder.createdAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                </div>
              </div>
              <Tag
                style={{
                  borderRadius: radii.full,
                  fontWeight: 700,
                  fontSize: 12,
                  padding: '2px 10px',
                  margin: 0,
                  background:
                    selectedOrder.order_type === 'delivery'
                      ? colors.verifiedChipBg
                      : selectedOrder.order_type === 'service'
                      ? colors.serviceChipBg
                      : colors.primaryLight,
                  color:
                    selectedOrder.order_type === 'delivery'
                      ? colors.verifiedChipText
                      : selectedOrder.order_type === 'service'
                      ? colors.serviceChipText
                      : colors.primary,
                  borderColor:
                    selectedOrder.order_type === 'delivery'
                      ? colors.verifiedChipBorder
                      : selectedOrder.order_type === 'service'
                      ? colors.serviceChipBorder
                      : 'rgba(11, 45, 107, 0.2)',
                }}
                icon={selectedOrder.order_type === 'delivery' ? <CarOutlined /> : selectedOrder.order_type === 'service' ? <ToolOutlined /> : <ShopOutlined />}
              >
                {selectedOrder.order_type === 'delivery'
                  ? 'Delivery'
                  : selectedOrder.order_type === 'service'
                  ? 'Service'
                  : 'Self-Pickup'}
              </Tag>
            </Flex>
          ) : (
            <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
              Order Details
            </span>
          )
        }
      >
        {selectedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Cancellation Banner */}
            {selectedOrder.status === 'cancelled' && (
              <Alert
                message="Order Cancelled"
                description="This order was cancelled and is no longer active for fulfillment."
                type="error"
                showIcon
                style={{ borderRadius: radii.md }}
              />
            )}

            {/* Stepper Progress & Fulfillment Controls */}
            {selectedOrder.status !== 'cancelled' && (
              <Card
                style={{
                  borderRadius: radii.xl,
                  border: `1px solid ${colors.border}`,
                  background: colors.surfaceContainerLow,
                }}
                styles={{ body: { padding: '16px 12px' } }}
              >
                <Steps
                  size="small"
                  direction={screens.xs ? 'vertical' : 'horizontal'}
                  current={getOrderStatusStep(selectedOrder).step}
                  items={getOrderStatusStep(selectedOrder).items}
                  style={{ marginBottom: 16 }}
                />

                {/* Primary Action Button Based on Current Status */}
                <div style={{ borderTop: `1px solid ${colors.borderLight}`, paddingTop: 12 }}>
                  <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                    <Text strong style={{ fontSize: 13, color: colors.textMain }}>
                      Fulfillment Action:
                    </Text>
                    <Space wrap size={[6, 6]}>
                      {(selectedOrder.status === 'placed' || selectedOrder.status === 'pending') && (
                        <>
                          <Button
                            type="primary"
                            icon={<SyncOutlined />}
                            style={{
                              background: colors.secondary,
                              borderColor: colors.secondary,
                              fontWeight: 700,
                              borderRadius: radii.md,
                            }}
                            onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'order_prepare')}
                          >
                            Start Preparing (Order Prepare)
                          </Button>
                          <Button
                            danger
                            style={{ borderRadius: radii.md }}
                            onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'cancelled')}
                          >
                            Reject
                          </Button>
                        </>
                      )}

                      {(selectedOrder.status === 'order_prepare' ||
                        selectedOrder.status === 'preparing' ||
                        selectedOrder.status === 'accepted') && (
                        <>
                          {selectedOrder.order_type === 'pickup' && (
                            <Button
                              type="primary"
                              icon={<CheckCircleFilled />}
                              style={{
                                background: colors.primary,
                                borderColor: colors.primary,
                                fontWeight: 700,
                                borderRadius: radii.md,
                              }}
                              onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'ready_for_pickup')}
                            >
                              Ready for Counter Pickup
                            </Button>
                          )}

                          {selectedOrder.order_type === 'delivery' && (
                            <Button
                              type="primary"
                              icon={<CarOutlined />}
                              style={{
                                background: colors.secondary,
                                borderColor: colors.secondary,
                                fontWeight: 700,
                                borderRadius: radii.md,
                              }}
                              onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'open_to_delivery')}
                            >
                              Move to Open to Delivery
                            </Button>
                          )}

                          {selectedOrder.order_type === 'service' && (
                            <Button
                              type="primary"
                              icon={<CheckCircleFilled />}
                              style={{
                                background: colors.semantic.success,
                                borderColor: colors.semantic.success,
                                fontWeight: 700,
                                borderRadius: radii.md,
                              }}
                              onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'completed')}
                            >
                              Mark Service Completed
                            </Button>
                          )}

                          <Button
                            size="small"
                            icon={<ArrowLeftOutlined />}
                            onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'placed')}
                            style={{ borderRadius: radii.sm, borderColor: colors.border, color: colors.textMuted }}
                          >
                            Revert to Placed
                          </Button>
                        </>
                      )}

                      {selectedOrder.status === 'ready_for_pickup' && (
                        <Button
                          type="primary"
                          icon={<CheckCircleFilled />}
                          style={{
                            background: colors.semantic.success,
                            borderColor: colors.semantic.success,
                            fontWeight: 700,
                            borderRadius: radii.md,
                          }}
                          onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'completed')}
                        >
                          Hand Over to Customer (Complete)
                        </Button>
                      )}

                      {selectedOrder.status === 'open_to_delivery' && (
                        <>
                          <Button
                            type="primary"
                            icon={<CarOutlined />}
                            style={{
                              background: colors.secondary,
                              borderColor: colors.secondary,
                              fontWeight: 700,
                              borderRadius: radii.md,
                            }}
                            onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'out_for_delivery')}
                          >
                            Mark Out for Delivery
                          </Button>
                          <Button
                            icon={<CheckCircleFilled />}
                            style={{
                              background: colors.semantic.success,
                              borderColor: colors.semantic.success,
                              color: colors.white,
                              fontWeight: 700,
                              borderRadius: radii.md,
                            }}
                            onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'completed')}
                          >
                            Mark Delivered
                          </Button>
                        </>
                      )}

                      {selectedOrder.status === 'out_for_delivery' && (
                        <Button
                          type="primary"
                          style={{
                            background: colors.semantic.success,
                            borderColor: colors.semantic.success,
                            fontWeight: 700,
                            borderRadius: radii.md,
                          }}
                          onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'completed')}
                        >
                          ✅ Confirm Delivered & Complete
                        </Button>
                      )}

                      {selectedOrder.status === 'completed' && (
                        <Tag
                          icon={<CheckCircleFilled />}
                          style={{
                            fontSize: 13,
                            padding: '4px 12px',
                            borderRadius: radii.md,
                            background: colors.semantic.successLight,
                            border: `1px solid ${colors.semantic.successBorder}`,
                            color: colors.semantic.successHover,
                            fontWeight: 600,
                          }}
                        >
                          Order Completed & Fulfilled
                        </Tag>
                      )}
                    </Space>
                  </Flex>
                </div>
              </Card>
            )}

            {/* Open to Delivery Platform Fleet Notice */}
            {selectedOrder.order_type === 'delivery' &&
              selectedOrder.status === 'open_to_delivery' && (
                <div
                  style={{
                    background: colors.surfaceContainerLow,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radii.md,
                    padding: '12px 14px',
                  }}
                >
                  <Flex gap={8} align="flex-start">
                    <CarOutlined style={{ color: colors.secondary, fontSize: 18, marginTop: 2 }} />
                    <div>
                      <Text strong style={{ color: colors.primary, display: 'block', fontFamily: typography.fontFamily.headline }}>
                        Captured in Open-to-Delivery Pool
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>
                        This order is open for dispatch. Platform admin can assign delivery fleet, or you can mark it &quot;Out for Delivery&quot; when your courier picks it up.
                      </Text>
                    </div>
                  </Flex>
                </div>
              )}

            {/* Customer Details & Actions */}
            <Card
              title={
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: typography.fontFamily.headline }}>
                  <UserOutlined style={{ marginRight: 6, color: colors.primary }} /> Customer Information
                </span>
              }
              style={{ borderRadius: radii.lg, border: `1px solid ${colors.border}` }}
              styles={{ body: { padding: 16 } }}
            >
              <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
                <Flex align="center" gap={12}>
                  <Avatar
                    size={46}
                    style={{
                      background: colors.primary,
                      fontWeight: 700,
                      fontSize: 18,
                    }}
                  >
                    {(selectedOrder.customer?.username || 'C')[0]?.toUpperCase()}
                  </Avatar>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: colors.textMain, fontFamily: typography.fontFamily.headline }}>
                      {selectedOrder.customer?.username || 'Guest Customer'}
                    </div>
                    <div style={{ fontSize: 13, color: colors.textMuted }}>
                      {selectedOrder.customer_phone || selectedOrder.customer?.mobile || 'No phone recorded'}
                    </div>
                  </div>
                </Flex>

                <Flex gap={8}>
                  {(selectedOrder.customer_phone || selectedOrder.customer?.mobile) && (
                    <Button
                      icon={<PhoneOutlined />}
                      href={`tel:${selectedOrder.customer_phone || selectedOrder.customer?.mobile}`}
                      style={{ borderRadius: radii.md, fontWeight: 600, borderColor: colors.border }}
                    >
                      Call
                    </Button>
                  )}
                  <Button
                    type="primary"
                    icon={<MessageOutlined />}
                    style={{
                      borderRadius: radii.md,
                      fontWeight: 600,
                      background: colors.primary,
                      borderColor: colors.primary,
                    }}
                    onClick={() => {
                      const customerId = selectedOrder.customer_id || selectedOrder.customer?.id || selectedOrder.user_id;
                      handleChatOpen(customerId, shop.id, {
                        customer_name: selectedOrder.customer?.username,
                        order_number: selectedOrder.order_number,
                      });
                    }}
                  >
                    Chat
                  </Button>
                </Flex>
              </Flex>

              {/* Delivery Address if present */}
              {selectedOrder.delivery_address && (
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: `1px solid ${colors.borderLight}`,
                  }}
                >
                  <Flex gap={8} align="flex-start">
                    <EnvironmentOutlined style={{ color: colors.semantic.error, fontSize: 16, marginTop: 2 }} />
                    <div>
                      <Text strong style={{ fontSize: 12, color: colors.textMuted, textTransform: 'uppercase' }}>
                        Delivery Address
                      </Text>
                      <div style={{ fontSize: 13, color: colors.textMain, marginTop: 2 }}>
                        {selectedOrder.delivery_address}
                      </div>
                    </div>
                  </Flex>
                </div>
              )}

              {/* Customer Notes if present */}
              {selectedOrder.notes && (
                <div
                  style={{
                    marginTop: 10,
                    padding: '8px 12px',
                    borderRadius: radii.md,
                    background: colors.semantic.warningLight,
                    border: `1px solid ${colors.semantic.warningBorder}`,
                  }}
                >
                  <Text style={{ fontSize: 12, color: colors.tertiary }}>
                    <strong>Note:</strong> {selectedOrder.notes}
                  </Text>
                </div>
              )}
            </Card>

            {/* Items Ordered List */}
            <Card
              title={
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: typography.fontFamily.headline }}>
                  <ShoppingCartOutlined style={{ marginRight: 6, color: colors.semantic.success }} /> Order Items ({selectedOrder.items?.length || 0})
                </span>
              }
              style={{ borderRadius: radii.lg, border: `1px solid ${colors.border}` }}
              styles={{ body: { padding: 16 } }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {selectedOrder.items?.map((item, idx) => (
                  <Flex
                    key={idx}
                    justify="space-between"
                    align="center"
                    style={{
                      paddingBottom: idx === selectedOrder.items.length - 1 ? 0 : 10,
                      borderBottom: idx === selectedOrder.items.length - 1 ? 'none' : `1px solid ${colors.borderLight}`,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: colors.textMain, fontFamily: typography.fontFamily.headline }}>
                        {item.item_name}
                      </div>
                      <div style={{ fontSize: 12, color: colors.textMuted }}>
                        {item.quantity} x ₹{item.unit_price}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: colors.textMain }}>
                      ₹{item.subtotal || (item.quantity * item.unit_price)}
                    </div>
                  </Flex>
                ))}
              </div>
            </Card>

            {/* Bill Breakdown & Payment Mode */}
            <Card
              title={
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: typography.fontFamily.headline }}>
                  <ThunderboltFilled style={{ marginRight: 6, color: colors.tertiary }} /> Payment & Transaction Breakdown
                </span>
              }
              style={{ borderRadius: radii.lg, border: `1px solid ${colors.border}` }}
              styles={{ body: { padding: 16 } }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Flex justify="space-between" align="center">
                  <Text type="secondary" style={{ fontSize: 13, color: colors.textMuted }}>Items Subtotal</Text>
                  <Text strong style={{ fontSize: 13, color: colors.textMain }}>
                    ₹{(
                      Number(selectedOrder.total_amount || 0) -
                      Number(selectedOrder.delivery_fee || 0) -
                      Number(selectedOrder.platform_fee || 0)
                    ).toFixed(2)}
                  </Text>
                </Flex>

                <Flex justify="space-between" align="center">
                  <Text type="secondary" style={{ fontSize: 13, color: colors.textMuted }}>Delivery Fee</Text>
                  <Text strong style={{ fontSize: 13, color: colors.textMain }}>
                    ₹{Number(selectedOrder.delivery_fee || 0).toFixed(2)}
                  </Text>
                </Flex>

                <Flex justify="space-between" align="center">
                  <Text type="secondary" style={{ fontSize: 13, color: colors.textMuted }}>Platform Fee</Text>
                  <Text strong style={{ fontSize: 13, color: colors.semantic.success }}>
                    {Number(selectedOrder.platform_fee || 0) > 0 ? `₹${selectedOrder.platform_fee}` : 'FREE (₹0)'}
                  </Text>
                </Flex>

                <Divider style={{ margin: '8px 0', borderColor: colors.borderLight }} />

                <Flex justify="space-between" align="center">
                  <span style={{ fontWeight: 800, fontSize: 15, color: colors.textMain, fontFamily: typography.fontFamily.headline }}>
                    Total Transaction Value
                  </span>
                  <span style={{ fontWeight: 800, fontSize: 18, color: colors.primary, fontFamily: typography.fontFamily.headline }}>
                    ₹{Number(selectedOrder.total_amount || 0).toFixed(2)}
                  </span>
                </Flex>

                <div
                  style={{
                    marginTop: 8,
                    padding: '10px 12px',
                    borderRadius: radii.md,
                    background:
                      selectedOrder.payment_mode === 'direct_upi'
                        ? colors.semantic.successLight
                        : colors.semantic.warningLight,
                    border:
                      selectedOrder.payment_mode === 'direct_upi'
                        ? `1px solid ${colors.semantic.successBorder}`
                        : `1px solid ${colors.semantic.warningBorder}`,
                  }}
                >
                  <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color:
                            selectedOrder.payment_mode === 'direct_upi'
                              ? colors.semantic.successHover
                              : colors.tertiary,
                          textTransform: 'uppercase',
                          fontFamily: typography.fontFamily.body,
                        }}
                      >
                        Payment Method
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 13,
                          color:
                            selectedOrder.payment_mode === 'direct_upi'
                              ? colors.semantic.successHover
                              : colors.tertiaryHover,
                          fontFamily: typography.fontFamily.headline,
                        }}
                      >
                        {selectedOrder.payment_mode === 'direct_upi' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <QrcodeOutlined style={{ color: colors.semantic.success }} /> Direct Store UPI Payment
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <WalletOutlined style={{ color: colors.tertiary }} /> Cash on Delivery / Counter Pickup
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedOrder.shop_upi_id && (
                      <Tag
                        style={{
                          margin: 0,
                          fontWeight: 600,
                          borderRadius: radii.md,
                          background: colors.semantic.successLight,
                          border: `1px solid ${colors.semantic.successBorder}`,
                          color: colors.semantic.successHover,
                        }}
                      >
                        UPI: {selectedOrder.shop_upi_id}
                      </Tag>
                    )}
                  </Flex>
                </div>
              </div>
            </Card>

            {/* Audit Info / Order ID */}
            <div
              style={{
                padding: '10px 14px',
                borderRadius: radii.md,
                background: colors.surfaceContainerLow,
                border: `1px solid ${colors.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text type="secondary" style={{ fontSize: 12, color: colors.textMuted }}>
                Ref ID: {selectedOrder.id}
              </Text>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => handleCopyOrderId(selectedOrder.order_number || selectedOrder.id)}
                style={{ fontSize: 12, color: colors.secondary }}
              >
                Copy ID
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
