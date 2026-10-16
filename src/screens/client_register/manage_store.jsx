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
} from '@ant-design/icons';
import { netWorkCall, apiConfig } from '../../app/utils';
import { useHistory } from 'react-router-dom';
import { AddProductModal } from '../../app/components';

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
  const [activeTab, setActiveTab] = useState('catalog');

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

  // Quotes state
  const [quotes, setQuotes] = useState([]);
  const [quotesLoading, setQuotesLoading] = useState(false);

  // Shop Settings state
  const [shopSettings, setShopSettings] = useState({
    shop_name: shop?.shop_name || '',
    address: shop?.address || '',
    area: shop?.area || '',
    mobile_number: shop?.mobile_number || '',
    website: shop?.website || '',
    img_url: shop?.img_url || '',
    allow_multi_category: Boolean(shop?.allow_multi_category),
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
        allow_multi_category: Boolean(shop.allow_multi_category),
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
        false
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

  const fetchQuotes = async () => {
    if (!shop?.id) return;
    setQuotesLoading(true);
    try {
      const res = await netWorkCall(
        `${apiConfig.quotes_shop}/${shop.id}`,
        'GET',
        null,
        false
      );
      if (res?.data) {
        setQuotes(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setQuotesLoading(false);
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
    fetchQuotes();
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
        JSON.stringify({ status: newStatus })
      );
      if (res?.success) {
        message.success(`Order marked as ${newStatus}`);
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Quote Status
  const handleUpdateQuoteStatus = async (quoteId, newStatus) => {
    try {
      const res = await netWorkCall(
        `${apiConfig.quotes_status}/${quoteId}/status`,
        'PUT',
        JSON.stringify({ status: newStatus })
      );
      if (res?.success) {
        message.success(`Quote updated`);
        fetchQuotes();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const listingColumns = [
    {
      title: 'Item / Service',
      dataIndex: 'name',
      key: 'name',
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
      render: (val, record) => (
        <div>
          <div style={{ fontWeight: 700, color: '#0f172a' }}>#{val}</div>
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
      title: 'Customer',
      key: 'customer',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.customer?.username || 'Customer'}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{record.customer?.mobile}</div>
        </div>
      ),
    },
    {
      title: 'Items',
      key: 'items',
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
      render: (_, record) => {
        const statusColors = {
          pending: 'warning',
          accepted: 'processing',
          completed: 'success',
          cancelled: 'error',
        };
        return <Tag color={statusColors[record.status] || 'default'}>{record.status}</Tag>;
      },
    },
    {
      title: 'Update Action',
      key: 'action',
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleUpdateOrderStatus(record.id, 'accepted')}
            >
              Accept
            </Button>
          )}
          {record.status === 'accepted' && (
            <Button
              type="primary"
              size="small"
              style={{ background: '#10b981', borderColor: '#10b981' }}
              onClick={() => handleUpdateOrderStatus(record.id, 'completed')}
            >
              Mark Completed
            </Button>
          )}
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
      ),
    },
  ];

  // Dynamic titles tailored to the store archetype
  const catalogTabLabel = {
    food: `🍽️ Food Menu & Dishes (${listings.length})`,
    product: `🛒 Products & Inventory (${listings.length})`,
    service: `🔧 Services & Rate Card (${listings.length})`,
    wellness: `💆 Treatments & Sessions (${listings.length})`,
    rental: `🏍️ Rental Fleet & Assets (${listings.length})`,
  }[storeArchetype] || `Catalog & Offerings (${listings.length})`;

  const addItemButtonLabel = {
    food: '+ Add Dish / Beverage',
    product: '+ Add Product',
    service: '+ Add Service Package',
    wellness: '+ Add Treatment',
    rental: '+ Add Rental Asset',
  }[storeArchetype] || '+ Add Item / Service';

  return (
    <div style={{ width: '100%', maxWidth: 1140, margin: '0 auto', padding: '20px 16px' }}>
      {/* Top Header & Store Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={onClose}
            style={{ borderRadius: 8 }}
          >
            All Stores
          </Button>
          <div>
            <Title level={4} style={{ margin: 0, fontWeight: 800 }}>
              {shop.shop_name}
            </Title>
            <Flex align="center" gap={8} style={{ marginTop: 2 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {shop.area} • {shop.shopCategory?.name || shop.shop_type || 'Store Outlet'}
              </Text>
              <Tag
                color={shop.allow_multi_category ? 'purple' : 'default'}
                icon={shop.allow_multi_category ? <UnlockOutlined /> : <LockOutlined />}
                style={{ fontSize: 10, margin: 0, borderRadius: 4 }}
              >
                {shop.allow_multi_category ? 'Multi-Category' : 'Fixed Category'}
              </Tag>
            </Flex>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {allShops?.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Text strong style={{ fontSize: 12 }}>
                Switch Outlet:
              </Text>
              <Select
                value={shop.id}
                style={{ width: 220 }}
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
            style={{ fontWeight: 600, borderRadius: 8 }}
          >
            Live Storefront
          </Button>
        </div>
      </div>

      {/* Main Management Tabs */}
      <Card
        style={{
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
        }}
        bodyStyle={{ padding: 20 }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'catalog',
              label: (
                <span style={{ fontWeight: 700, fontSize: 15 }}>
                  <ShopOutlined /> {catalogTabLabel}
                </span>
              ),
              children: (
                <div>
                  <Flex justify="space-between" align="center" wrap="wrap" gap={12} style={{ marginBottom: 16 }}>
                    <div>
                      <Title level={5} style={{ margin: 0 }}>
                        {storeArchetype === 'food'
                          ? 'Manage Restaurant Dishes & Menus'
                          : storeArchetype === 'service'
                          ? 'Manage Service Rate Cards & Visiting Fees'
                          : storeArchetype === 'rental'
                          ? 'Manage Rental Fleet & Security Deposits'
                          : 'Manage Products & Stock'}
                      </Title>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        Items listed here appear directly on your customer storefront.
                      </Text>
                    </div>

                    <Space>
                      {storeArchetype === 'product' && (
                        <Button
                          icon={<ImportOutlined />}
                          onClick={() => {
                            fetchMasterProducts();
                            setIsImportModalOpen(true);
                          }}
                        >
                          Import Master Catalog
                        </Button>
                      )}
                      <Button
                        type="primary"
                        onClick={handleOpenAddModal}
                        style={{
                          borderRadius: 8,
                          fontWeight: 700,
                          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                        }}
                      >
                        {addItemButtonLabel}
                      </Button>
                    </Space>
                  </Flex>

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
                  <ShoppingCartOutlined /> Incoming Orders ({orders.length})
                </span>
              ),
              children: (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Title level={5} style={{ margin: 0 }}>
                      Direct Customer Orders
                    </Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Orders placed directly with your store. Fulfill via direct pickup or delivery.
                    </Text>
                  </div>

                  <Table
                    columns={orderColumns}
                    dataSource={orders}
                    rowKey="id"
                    loading={ordersLoading}
                    scroll={{ x: 'max-content' }}
                    pagination={{ pageSize: 8 }}
                  />
                </div>
              ),
            },
            {
              key: 'quotes',
              label: (
                <span style={{ fontWeight: 700, fontSize: 15 }}>
                  <FileDoneOutlined /> Service Quotes ({quotes.length})
                </span>
              ),
              children: (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Title level={5} style={{ margin: 0 }}>
                      Service Quote Requests (RFQs)
                    </Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Requests from customers for technical services, repairs, and custom rates.
                    </Text>
                  </div>

                  <Spin spinning={quotesLoading}>
                    {quotes.length === 0 ? (
                      <Empty description="No service quote requests yet" />
                    ) : (
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {quotes.map((q) => (
                          <Card key={q.id} style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
                            <Flex justify="space-between" align="start">
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{q.service_title}</div>
                                <div style={{ fontSize: 12, color: '#64748b' }}>
                                  Customer: {q.customer?.username} ({q.customer?.mobile}) •{' '}
                                  {new Date(q.createdAt).toLocaleDateString()}
                                </div>
                                <p style={{ margin: '8px 0', fontSize: 13 }}>{q.service_description}</p>
                                {q.status === 'pending' && (
                                  <Space style={{ marginTop: 8 }}>
                                    <Button
                                      size="small"
                                      type="primary"
                                      onClick={() => handleUpdateQuoteStatus(q.id, 'quoted')}
                                    >
                                      Accept & Quote
                                    </Button>
                                    <Button
                                      size="small"
                                      danger
                                      onClick={() => handleUpdateQuoteStatus(q.id, 'rejected')}
                                    >
                                      Decline
                                    </Button>
                                  </Space>
                                )}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 18, fontWeight: 800, color: '#4f46e5' }}>
                                  ₹{q.estimated_amount}
                                </div>
                                <Tag color="purple">{q.status}</Tag>
                              </div>
                            </Flex>
                          </Card>
                        ))}
                      </Space>
                    )}
                  </Spin>
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
                      Store Information & Category Preferences
                    </Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Update your storefront profile, location information, and enable multi-category catalog expansion.
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

                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col span={12}>
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
                      <Col span={12}>
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

                    <Row gutter={16} style={{ marginBottom: 20 }}>
                      <Col span={12}>
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
                      <Col span={12}>
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

                    {/* Multi-category switch */}
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        padding: '14px 16px',
                        marginBottom: 20,
                      }}
                    >
                      <Flex justify="space-between" align="center">
                        <div style={{ maxWidth: '80%' }}>
                          <Text strong style={{ fontSize: 14, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {shopSettings.allow_multi_category ? <UnlockOutlined style={{ color: '#7c3aed' }} /> : <LockOutlined style={{ color: '#64748b' }} />}
                            Allow Multiple Categories (Hybrid Store)
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                            {shopSettings.allow_multi_category
                              ? 'Enabled — You can add products spanning different domain categories (e.g. food + pharmacy + rentals).'
                              : 'Disabled (Default) — Your product catalog is strictly locked to your registered shop category for consistency.'}
                          </Text>
                        </div>
                        <Switch
                          checked={shopSettings.allow_multi_category}
                          onChange={(checked) =>
                            setShopSettings((prev) => ({ ...prev, allow_multi_category: checked }))
                          }
                        />
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
                      }}
                    >
                      Save Store Settings
                    </Button>
                  </Card>

                  {/* Danger Zone: Delete Store */}
                  <Card
                    style={{
                      borderRadius: 12,
                      border: '1px solid #fee2e2',
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
                        <Button danger type="primary">
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

      {/* Import from Master Products Modal */}
      <Modal
        title="Import from Standard Product Catalog"
        open={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        onOk={handleImportMaster}
        confirmLoading={importLoading}
        okText="Import to Store"
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            Choose a standard catalog product pre-populated with image and description, and set your
            store selling price.
          </Text>

          <div style={{ marginBottom: 12 }}>
            <Text strong>Select Master Product:</Text>
            <Select
              style={{ width: '100%', marginTop: 6 }}
              placeholder="Search or select master product"
              onChange={(id) => setSelectedMasterId(id)}
              value={selectedMasterId}
            >
              {masterProducts.map((p) => (
                <Option key={p.id} value={p.id}>
                  {p.name} - Standard MRP: ₹{p.price}
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <Text strong>Your Store Selling Price (₹):</Text>
            <InputNumber
              style={{ width: '100%', marginTop: 6 }}
              placeholder="Enter your local store price"
              value={importPrice}
              onChange={(val) => setImportPrice(val)}
            />
          </div>
        </div>
      </Modal>
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
