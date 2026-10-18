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
  Modal,
  Input,
  InputNumber,
  Select,
  Typography,
  message,
  Popconfirm,
  Empty,
  Segmented,
  Flex,
  Spin,
  Row,
  Col,
  Drawer,
  Divider,
  Avatar,
  Tooltip,
  Grid,
  Badge,
  Steps,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  ImportOutlined,
  DeleteOutlined,
  EditOutlined,
  ShopOutlined,
  EyeOutlined,
  ArrowLeftOutlined,
  ShoppingCartOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  SettingOutlined,
  LockOutlined,
  UnlockOutlined,
  PhoneOutlined,
  MessageOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  CheckCircleFilled,
  CarOutlined,
  ThunderboltFilled,
  UserOutlined,
  CopyOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { netWorkCall, apiConfig } from '../../app/utils';
import { useHistory } from 'react-router-dom';
import { AddProductModal } from '../../app/components';
import { useChatStore } from '../../app/services';
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

  // Master import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [masterProducts, setMasterProducts] = useState([]);
  const [selectedMasterId, setSelectedMasterId] = useState(null);
  const [importPrice, setImportPrice] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

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

  const fetchMasterProducts = async () => {
    try {
      const res = await netWorkCall(
        apiConfig.master_products,
        'POST',
        JSON.stringify({ limit: 50, offset: 0 }),
        false
      );
      if (res?.data) {
        setMasterProducts(res.data);
      }
    } catch (err) {
      console.error(err);
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

  // Import Master Product
  const handleImportMaster = async () => {
    if (!selectedMasterId || !importPrice) {
      message.error('Please select a product and enter selling price');
      return;
    }
    setImportLoading(true);
    try {
      const res = await netWorkCall(
        apiConfig.listings_import_master,
        'POST',
        JSON.stringify({
          shop_id: shop.id,
          master_product_id: selectedMasterId,
          price: importPrice,
        })
      );
      if (res?.success) {
        message.success('Master product imported to your catalog');
        setIsImportModalOpen(false);
        setSelectedMasterId(null);
        setImportPrice(null);
        fetchListings();
        onRefreshShop?.();
      }
    } catch (err) {
      console.error(err);
      message.error('Import failed');
    } finally {
      setImportLoading(false);
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
      title: 'Item / Service',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (name, record) => (
        <Flex align="center" gap={10}>
          {record.img_url ? (
            <img
              src={record.img_url}
              alt={name}
              style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
              }}
            >
              <FileTextOutlined />
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>{name}</div>
            <Flex gap={4} align="center" style={{ marginTop: 2 }}>
              <Tag color="blue" style={{ fontSize: 10, lineHeight: '16px', margin: 0 }}>
                {record.listing_type}
              </Tag>
              {record.metadata?.section && (
                <Tag color="default" style={{ fontSize: 10, lineHeight: '16px', margin: 0 }}>
                  {record.metadata.section}
                </Tag>
              )}
              {record.metadata?.food_type && (
                <Tag
                  color={record.metadata.food_type === 'veg' ? 'green' : 'red'}
                  style={{ fontSize: 10, lineHeight: '16px', margin: 0 }}
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
      title: 'Price / Unit',
      key: 'price',
      width: 130,
      render: (_, record) => (
        <div>
          <span style={{ fontWeight: 800, color: '#4f46e5' }}>₹{record.price}</span>
          <span style={{ fontSize: 12, color: '#64748b' }}> / {record.unit}</span>
          {record.mrp && record.mrp > record.price && (
            <div style={{ fontSize: 11, color: '#94a3b8', textDecoration: 'line-through' }}>
              MRP: ₹{record.mrp}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'In Stock',
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
      title: 'Actions',
      key: 'actions',
      width: 105,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEditModal(record)}
          />
          <Popconfirm
            title="Delete this listing?"
            onConfirm={() => handleDeleteListing(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const orderColumns = [
    {
      title: 'Order ID',
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
            style={{ padding: 0, fontWeight: 700, fontSize: 13, color: '#4f46e5' }}
          >
            #{val}
          </Button>
          <div style={{ fontSize: 11, color: '#64748b' }}>
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
      title: 'Type',
      dataIndex: 'order_type',
      key: 'order_type',
      width: 100,
      render: (type) => (
        <Tag
          color={type === 'delivery' ? 'purple' : type === 'service' ? 'cyan' : 'blue'}
          style={{ borderRadius: 6, fontWeight: 700, fontSize: 11 }}
        >
          {type === 'delivery' ? '🚚 Delivery' : type === 'service' ? '🛠️ Service' : '🛍️ Pickup'}
        </Tag>
      ),
    },
    {
      title: 'Customer',
      key: 'customer',
      width: 140,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.customer?.username || 'Customer'}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{record.customer_phone || record.customer?.mobile}</div>
        </div>
      ),
    },
    {
      title: 'Items',
      key: 'items',
      width: 150,
      render: (_, record) => (
        <div>
          {record.items?.map((it, idx) => (
            <div key={idx} style={{ fontSize: 12 }}>
              {it.quantity}x {it.item_name}
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Amount',
      key: 'amount',
      width: 110,
      render: (_, record) => (
        <div>
          <span style={{ fontWeight: 800, color: '#0f172a' }}>₹{record.total_amount}</span>
          <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>
            {record.payment_mode === 'direct_upi' ? 'Direct UPI' : 'COD'}
          </div>
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 150,
      render: (_, record) => {
        const statusColors = {
          placed: 'blue',
          pending: 'warning',
          order_prepare: 'processing',
          preparing: 'processing',
          accepted: 'processing',
          ready_for_pickup: 'cyan',
          open_to_delivery: 'purple',
          out_for_delivery: 'geekblue',
          completed: 'success',
          cancelled: 'error',
        };
        const statusLabels = {
          placed: '📋 Order Placed',
          pending: '⏳ Pending',
          order_prepare: '🍳 Order Prepare',
          preparing: '🍳 Preparing',
          accepted: '✅ Accepted',
          ready_for_pickup: '🛍️ Ready for Pickup',
          open_to_delivery: '🚚 Open to Delivery',
          out_for_delivery: '🛵 Out for Delivery',
          completed: '🎉 Completed',
          cancelled: '❌ Cancelled',
        };
        return (
          <Tag color={statusColors[record.status] || 'default'} style={{ fontWeight: 600 }}>
            {statusLabels[record.status] || record.status}
          </Tag>
        );
      },
    },
    {
      title: 'Update Action',
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
              style={{ borderRadius: 6, fontWeight: 600, color: '#4f46e5', borderColor: '#c7d2fe', background: '#eef2ff' }}
            >
              Details
            </Button>

            {/* If Placed or Pending: Start Preparation */}
            {(record.status === 'placed' || record.status === 'pending') && (
              <Button
                type="primary"
                size="small"
                style={{ background: '#3b82f6', borderColor: '#3b82f6', fontWeight: 600 }}
                onClick={() => handleUpdateOrderStatus(record.id, 'order_prepare')}
              >
                🍳 Order Prepare
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
                    style={{ background: '#0891b2', borderColor: '#0891b2', fontWeight: 600 }}
                    onClick={() => handleUpdateOrderStatus(record.id, 'ready_for_pickup')}
                  >
                    🛍️ Ready for Pickup
                  </Button>
                )}

                {/* Delivery: Move to Open to Delivery */}
                {isDelivery && (
                  <Button
                    type="primary"
                    size="small"
                    style={{ background: '#7c3aed', borderColor: '#7c3aed', fontWeight: 600 }}
                    onClick={() => handleUpdateOrderStatus(record.id, 'open_to_delivery')}
                  >
                    🚚 Move to Open to Delivery
                  </Button>
                )}

                {/* Service or Direct Completion */}
                {!isDelivery && (
                  <Button
                    type="primary"
                    size="small"
                    style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 600 }}
                    onClick={() => handleUpdateOrderStatus(record.id, 'completed')}
                  >
                    Mark Completed
                  </Button>
                )}

                {/* Option to revert/set back to Placed */}
                <Button
                  size="small"
                  onClick={() => handleUpdateOrderStatus(record.id, 'placed')}
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
                style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 600 }}
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
                style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 600 }}
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
                style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 600 }}
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
    ? `🔧 Services & Packages (${listings.length})`
    : storeArchetype === 'food'
    ? `🍽️ Food Menu & Dishes (${listings.length})`
    : `🛒 Products & Inventory (${listings.length})`;

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
    ? '+ Add Service Package'
    : storeArchetype === 'food'
    ? '+ Add Dish / Beverage'
    : '+ Add Product';

  const ordersTabLabel = isServiceStore
    ? `🛠️ Service Bookings (${orders.length})`
    : `📦 Customer Orders (${orders.length})`;

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
            <Title level={4} className="manage-store-title">
              {shop.shop_name}
            </Title>
            <div className="manage-store-meta">
              <Text type="secondary" style={{ fontSize: 13 }}>
                {shop.area} • {shop.shopCategory?.name || shop.shop_type || 'Store Outlet'}
              </Text>
              <Tag
                color={isServiceStore ? 'blue' : 'green'}
                style={{ fontSize: 11, margin: 0, borderRadius: 4, fontWeight: 700 }}
              >
                {isServiceStore ? '🔧 Service Business' : '🛒 Product Store'}
              </Tag>
            </div>
          </div>
        </div>

        <div className="manage-store-header-right">
          {allShops?.length > 1 && (
            <div className="manage-store-outlet-switcher">
              <Text strong className="manage-store-outlet-switcher-label">
                Switch Outlet:
              </Text>
              <Select
                value={shop.id}
                className="manage-store-outlet-select"
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
            style={{ fontWeight: 600, borderRadius: 8 }}
          >
            Live Storefront
          </Button>
        </div>
      </div>

      {/* Main Management Tabs */}
      <Card
        className="manage-store-main-card"
        styles={{ body: { padding: screens.xs ? '14px 12px' : 20 } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'catalog',
              label: (
                <span className="manage-store-tab-label" style={{ fontWeight: 700, fontSize: 15 }}>
                  {catalogTabLabel}
                </span>
              ),
              children: (
                <div>
                  <div className="manage-store-tab-header">
                    <div>
                      <Title level={5} style={{ margin: 0 }}>
                        {catalogTitle}
                      </Title>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {catalogDesc}
                      </Text>
                    </div>

                    <Button
                      type="primary"
                      onClick={handleOpenAddModal}
                      className="manage-store-add-item-btn"
                      style={{
                        borderRadius: 8,
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      }}
                    >
                      {addItemButtonLabel}
                    </Button>
                  </div>

                  <Table
                    columns={listingColumns}
                    dataSource={listings}
                    rowKey="id"
                    loading={listingsLoading}
                    scroll={{ x: 'max-content' }}
                    pagination={{ pageSize: 8 }}
                  />
                </div>
              ),
            },
            {
              key: 'orders',
              label: (
                <span style={{ fontWeight: 700, fontSize: 15 }}>
                  {ordersTabLabel}
                </span>
              ),
              children: (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Title level={5} style={{ margin: 0 }}>
                      {ordersTitle}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Click on any order to open the full transaction & delivery tracker sidebar.
                    </Text>
                  </div>

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
              ),
            },
            {
              key: 'settings',
              label: (
                <span style={{ fontWeight: 700, fontSize: 15 }}>
                  <SettingOutlined /> Store Settings & Info
                </span>
              ),
              children: (
                <div style={{ maxWidth: 700 }}>
                  <div style={{ marginBottom: 20 }}>
                    <Title level={5} style={{ margin: 0 }}>
                      Store Information & Business Profile
                    </Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Update your storefront profile, location information, and customer contact details.
                    </Text>
                  </div>

                  <Card style={{ borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                    <div style={{ marginBottom: 16 }}>
                      <Text strong style={{ display: 'block', marginBottom: 4 }}>
                        Store / Outlet Name:
                      </Text>
                      <Input
                        value={shopSettings.shop_name}
                        onChange={(e) =>
                          setShopSettings((prev) => ({ ...prev, shop_name: e.target.value }))
                        }
                      />
                    </div>

                    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                      <Col xs={24} sm={12}>
                        <Text strong style={{ display: 'block', marginBottom: 4 }}>
                          Area / Locality:
                        </Text>
                        <Input
                          value={shopSettings.area}
                          onChange={(e) =>
                            setShopSettings((prev) => ({ ...prev, area: e.target.value }))
                          }
                        />
                      </Col>
                      <Col xs={24} sm={12}>
                        <Text strong style={{ display: 'block', marginBottom: 4 }}>
                          Contact Phone:
                        </Text>
                        <Input
                          value={shopSettings.mobile_number}
                          onChange={(e) =>
                            setShopSettings((prev) => ({ ...prev, mobile_number: e.target.value }))
                          }
                        />
                      </Col>
                    </Row>

                    <div style={{ marginBottom: 16 }}>
                      <Text strong style={{ display: 'block', marginBottom: 4 }}>
                        Full Street Address:
                      </Text>
                      <Input.TextArea
                        rows={2}
                        value={shopSettings.address}
                        onChange={(e) =>
                          setShopSettings((prev) => ({ ...prev, address: e.target.value }))
                        }
                      />
                    </div>

                    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                      <Col xs={24} sm={12}>
                        <Text strong style={{ display: 'block', marginBottom: 4 }}>
                          Website / Social:
                        </Text>
                        <Input
                          value={shopSettings.website}
                          placeholder="https://..."
                          onChange={(e) =>
                            setShopSettings((prev) => ({ ...prev, website: e.target.value }))
                          }
                        />
                      </Col>
                      <Col xs={24} sm={12}>
                        <Text strong style={{ display: 'block', marginBottom: 4 }}>
                          Storefront Banner / Image URL:
                        </Text>
                        <Input
                          value={shopSettings.img_url}
                          placeholder="https://images.unsplash.com/..."
                          onChange={(e) =>
                            setShopSettings((prev) => ({ ...prev, img_url: e.target.value }))
                          }
                        />
                      </Col>
                    </Row>

                    {/* Business Operating Mode */}
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        padding: '14px 16px',
                        marginBottom: 20,
                      }}
                    >
                      <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                        <div>
                          <Text strong style={{ fontSize: 14, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isServiceStore ? <ToolOutlined style={{ color: '#0284c7' , marginRight: 4 }} /> : <ShopOutlined style={{ color: '#16a34a', marginRight: 4}} />}
                            Business Operating Mode
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                            {isServiceStore
                              ? 'Configured as a Service Business — Catalog is streamlined for service packages, rate cards, and appointment bookings.'
                              : 'Configured as a Product Store — Catalog is streamlined for retail items, in-stock inventory, and order fulfillment.'}
                          </Text>
                        </div>
                        <Tag
                          color={isServiceStore ? 'blue' : 'green'}
                          style={{ fontWeight: 700, padding: '4px 10px', borderRadius: 6, fontSize: 12 }}
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
                        background: '#4f46e5',
                        borderColor: '#4f46e5',
                        fontWeight: 700,
                        borderRadius: 8,
                        width: screens.xs ? '100%' : 'auto',
                        height: screens.xs ? 42 : 'auto',
                      }}
                    >
                      Save Store Settings
                    </Button>
                  </Card>

                  {/* Danger Zone: Delete Store */}
                  <Card
                    style={{
                      borderRadius: 12,
                      border: '1px solid #fee2e8',
                      background: '#fff5f5',
                    }}
                  >
                    <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
                      <div>
                        <Text strong style={{ color: '#b91c1c', fontSize: 14, display: 'block' }}>
                          Danger Zone: Delete Store Outlet
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12, color: '#991b1b' }}>
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
                        <Button danger type="primary" style={{ width: screens.xs ? '100%' : 'auto' }}>
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
        shop={shop}
        editingItem={editingItem}
      />

      {/* Comprehensive Order Details Sidebar Drawer */}
      <Drawer
        open={isOrderDrawerOpen}
        onClose={() => setIsOrderDrawerOpen(false)}
        width={screens.md ? 540 : '100%'}
        title={
          selectedOrder ? (
            <Flex justify="space-between" align="center" style={{ width: '100%', paddingRight: 12 }}>
              <div>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  Order #{selectedOrder.order_number || selectedOrder.id?.slice(0, 8)}
                </span>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginTop: 2 }}>
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
                color={
                  selectedOrder.order_type === 'delivery'
                    ? 'purple'
                    : selectedOrder.order_type === 'service'
                    ? 'cyan'
                    : 'blue'
                }
                style={{
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 12,
                  padding: '2px 10px',
                  margin: 0,
                }}
              >
                {selectedOrder.order_type === 'delivery'
                  ? '🚚 Delivery'
                  : selectedOrder.order_type === 'service'
                  ? '🛠️ Service'
                  : '🛍️ Self-Pickup'}
              </Tag>
            </Flex>
          ) : (
            'Order Details'
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
                style={{ borderRadius: 10 }}
              />
            )}

            {/* Stepper Progress & Fulfillment Controls */}
            {selectedOrder.status !== 'cancelled' && (
              <Card
                style={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                }}
                bodyStyle={{ padding: '16px 12px' }}
              >
                <Steps
                  size="small"
                  direction={screens.xs ? 'vertical' : 'horizontal'}
                  current={getOrderStatusStep(selectedOrder).step}
                  items={getOrderStatusStep(selectedOrder).items}
                  style={{ marginBottom: 16 }}
                />

                {/* Primary Action Button Based on Current Status */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                  <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                    <Text strong style={{ fontSize: 13, color: '#334155' }}>
                      Fulfillment Action:
                    </Text>
                    <Space wrap size={[6, 6]}>
                      {(selectedOrder.status === 'placed' || selectedOrder.status === 'pending') && (
                        <>
                          <Button
                            type="primary"
                            style={{
                              background: '#3b82f6',
                              borderColor: '#3b82f6',
                              fontWeight: 700,
                              borderRadius: 8,
                            }}
                            onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'order_prepare')}
                          >
                            🍳 Start Preparing (Order Prepare)
                          </Button>
                          <Button
                            danger
                            style={{ borderRadius: 8 }}
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
                              style={{
                                background: '#0891b2',
                                borderColor: '#0891b2',
                                fontWeight: 700,
                                borderRadius: 8,
                              }}
                              onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'ready_for_pickup')}
                            >
                              🛍️ Ready for Counter Pickup
                            </Button>
                          )}

                          {selectedOrder.order_type === 'delivery' && (
                            <Button
                              type="primary"
                              style={{
                                background: '#7c3aed',
                                borderColor: '#7c3aed',
                                fontWeight: 700,
                                borderRadius: 8,
                              }}
                              onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'open_to_delivery')}
                            >
                              🚚 Move to Open to Delivery
                            </Button>
                          )}

                          {selectedOrder.order_type === 'service' && (
                            <Button
                              type="primary"
                              style={{
                                background: '#10b981',
                                borderColor: '#10b981',
                                fontWeight: 700,
                                borderRadius: 8,
                              }}
                              onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'completed')}
                            >
                              ✅ Mark Service Completed
                            </Button>
                          )}

                          <Button
                            size="small"
                            onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'placed')}
                            style={{ borderRadius: 6 }}
                          >
                            ↩️ Revert to Placed
                          </Button>
                        </>
                      )}

                      {selectedOrder.status === 'ready_for_pickup' && (
                        <Button
                          type="primary"
                          style={{
                            background: '#10b981',
                            borderColor: '#10b981',
                            fontWeight: 700,
                            borderRadius: 8,
                          }}
                          onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'completed')}
                        >
                          ✅ Hand Over to Customer (Complete)
                        </Button>
                      )}

                      {selectedOrder.status === 'open_to_delivery' && (
                        <>
                          <Button
                            type="primary"
                            style={{
                              background: '#2563eb',
                              borderColor: '#2563eb',
                              fontWeight: 700,
                              borderRadius: 8,
                            }}
                            onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'out_for_delivery')}
                          >
                            🛵 Mark Out for Delivery
                          </Button>
                          <Button
                            style={{
                              background: '#10b981',
                              borderColor: '#10b981',
                              color: '#fff',
                              fontWeight: 700,
                              borderRadius: 8,
                            }}
                            onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'completed')}
                          >
                            ✅ Mark Delivered
                          </Button>
                        </>
                      )}

                      {selectedOrder.status === 'out_for_delivery' && (
                        <Button
                          type="primary"
                          style={{
                            background: '#10b981',
                            borderColor: '#10b981',
                            fontWeight: 700,
                            borderRadius: 8,
                          }}
                          onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'completed')}
                        >
                          ✅ Confirm Delivered & Complete
                        </Button>
                      )}

                      {selectedOrder.status === 'completed' && (
                        <Tag
                          color="success"
                          icon={<CheckCircleFilled />}
                          style={{ fontSize: 13, padding: '4px 12px', borderRadius: 8 }}
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
                    background: '#faf5ff',
                    border: '1px solid #e9d5ff',
                    borderRadius: 10,
                    padding: '12px 14px',
                  }}
                >
                  <Flex gap={8} align="flex-start">
                    <CarOutlined style={{ color: '#7c3aed', fontSize: 18, marginTop: 2 }} />
                    <div>
                      <Text strong style={{ color: '#6b21a8', display: 'block' }}>
                        Captured in Open-to-Delivery Pool
                      </Text>
                      <Text style={{ fontSize: 12, color: '#7e22ce' }}>
                        This order is open for dispatch. Platform admin can assign delivery fleet, or you can mark it &quot;Out for Delivery&quot; when your courier picks it up.
                      </Text>
                    </div>
                  </Flex>
                </div>
              )}

            {/* Customer Details & Actions */}
            <Card
              title={
                <span style={{ fontSize: 14, fontWeight: 700 }}>
                  <UserOutlined style={{ marginRight: 6, color: '#4f46e5' }} /> Customer Information
                </span>
              }
              style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
              bodyStyle={{ padding: 16 }}
            >
              <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
                <Flex align="center" gap={12}>
                  <Avatar
                    size={46}
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      fontWeight: 700,
                      fontSize: 18,
                    }}
                  >
                    {(selectedOrder.customer?.username || 'C')[0]?.toUpperCase()}
                  </Avatar>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>
                      {selectedOrder.customer?.username || 'Guest Customer'}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      {selectedOrder.customer_phone || selectedOrder.customer?.mobile || 'No phone recorded'}
                    </div>
                  </div>
                </Flex>

                <Flex gap={8}>
                  {(selectedOrder.customer_phone || selectedOrder.customer?.mobile) && (
                    <Button
                      icon={<PhoneOutlined />}
                      href={`tel:${selectedOrder.customer_phone || selectedOrder.customer?.mobile}`}
                      style={{ borderRadius: 8, fontWeight: 600 }}
                    >
                      Call
                    </Button>
                  )}
                  <Button
                    type="primary"
                    icon={<MessageOutlined />}
                    style={{
                      borderRadius: 8,
                      fontWeight: 600,
                      background: '#4f46e5',
                      borderColor: '#4f46e5',
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
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <Flex gap={8} align="flex-start">
                    <EnvironmentOutlined style={{ color: '#ef4444', fontSize: 16, marginTop: 2 }} />
                    <div>
                      <Text strong style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>
                        Delivery Address
                      </Text>
                      <div style={{ fontSize: 13, color: '#1e293b', marginTop: 2 }}>
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
                    borderRadius: 8,
                    background: '#fefce8',
                    border: '1px solid #fef08a',
                  }}
                >
                  <Text style={{ fontSize: 12, color: '#854d0e' }}>
                    <strong>Note:</strong> {selectedOrder.notes}
                  </Text>
                </div>
              )}
            </Card>

            {/* Items Ordered List */}
            <Card
              title={
                <span style={{ fontSize: 14, fontWeight: 700 }}>
                  <ShoppingCartOutlined style={{ marginRight: 6, color: '#10b981' }} /> Order Items ({selectedOrder.items?.length || 0})
                </span>
              }
              style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
              bodyStyle={{ padding: 16 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {selectedOrder.items?.map((item, idx) => (
                  <Flex
                    key={idx}
                    justify="space-between"
                    align="center"
                    style={{
                      paddingBottom: idx === selectedOrder.items.length - 1 ? 0 : 10,
                      borderBottom: idx === selectedOrder.items.length - 1 ? 'none' : '1px solid #f1f5f9',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                        {item.item_name}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {item.quantity} x ₹{item.unit_price}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>
                      ₹{item.subtotal || (item.quantity * item.unit_price)}
                    </div>
                  </Flex>
                ))}
              </div>
            </Card>

            {/* Bill Breakdown & Payment Mode */}
            <Card
              title={
                <span style={{ fontSize: 14, fontWeight: 700 }}>
                  <ThunderboltFilled style={{ marginRight: 6, color: '#f59e0b' }} /> Payment & Transaction Breakdown
                </span>
              }
              style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
              bodyStyle={{ padding: 16 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Flex justify="space-between" align="center">
                  <Text type="secondary" style={{ fontSize: 13 }}>Items Subtotal</Text>
                  <Text strong style={{ fontSize: 13 }}>
                    ₹{(
                      Number(selectedOrder.total_amount || 0) -
                      Number(selectedOrder.delivery_fee || 0) -
                      Number(selectedOrder.platform_fee || 0)
                    ).toFixed(2)}
                  </Text>
                </Flex>

                <Flex justify="space-between" align="center">
                  <Text type="secondary" style={{ fontSize: 13 }}>Delivery Fee</Text>
                  <Text strong style={{ fontSize: 13 }}>
                    ₹{Number(selectedOrder.delivery_fee || 0).toFixed(2)}
                  </Text>
                </Flex>

                <Flex justify="space-between" align="center">
                  <Text type="secondary" style={{ fontSize: 13 }}>Platform Fee</Text>
                  <Text strong style={{ fontSize: 13, color: '#16a34a' }}>
                    {Number(selectedOrder.platform_fee || 0) > 0 ? `₹${selectedOrder.platform_fee}` : 'FREE (₹0)'}
                  </Text>
                </Flex>

                <Divider style={{ margin: '8px 0' }} />

                <Flex justify="space-between" align="center">
                  <span style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>
                    Total Transaction Value
                  </span>
                  <span style={{ fontWeight: 800, fontSize: 18, color: '#4f46e5' }}>
                    ₹{Number(selectedOrder.total_amount || 0).toFixed(2)}
                  </span>
                </Flex>

                <div
                  style={{
                    marginTop: 8,
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: selectedOrder.payment_mode === 'direct_upi' ? '#ecfdf5' : '#fffbeb',
                    border: selectedOrder.payment_mode === 'direct_upi' ? '1px solid #a7f3d0' : '1px solid #fde68a',
                  }}
                >
                  <Flex justify="space-between" align="center">
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>
                        Payment Method
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#047857' }}>
                        {selectedOrder.payment_mode === 'direct_upi'
                          ? '⚡ Direct Store UPI (Zero Commission)'
                          : '💵 Cash on Delivery / Counter Pickup'}
                      </div>
                    </div>
                    {selectedOrder.shop_upi_id && (
                      <Tag color="green" style={{ margin: 0, fontWeight: 600 }}>
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
                borderRadius: 8,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>
                Ref ID: {selectedOrder.id}
              </Text>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => handleCopyOrderId(selectedOrder.order_number || selectedOrder.id)}
                style={{ fontSize: 12, color: '#64748b' }}
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
