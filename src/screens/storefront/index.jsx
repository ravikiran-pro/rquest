import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  Button,
  Tag,
  Rate,
  Typography,
  Tabs,
  Modal,
  Input,
  message,
  Spin,
  Empty,
  Badge,
  Flex,
  Grid,
  Segmented,
} from 'antd';
import {
  PhoneOutlined,
  CompassOutlined,
  MessageOutlined,
  ShoppingCartOutlined,
  PlusOutlined,
  MinusOutlined,
  SafetyCertificateFilled,
  EnvironmentOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  StarFilled,
  ThunderboltFilled,
  EditOutlined,
} from '@ant-design/icons';
import { netWorkCall, apiConfig } from '../../app/utils';
import { useGlobalStore, useChatStore, useCartStore } from '../../app/services';
import Routes from '../../app/routes/routes';

const { Title, Text, Paragraph } = Typography;

const StorefrontScreen = () => {
  const { shop_id } = useParams();
  const history = useHistory();
  const screens = Grid.useBreakpoint();

  const { user_data } = useGlobalStore((state) => state);
  const { handleChatOpen } = useChatStore((state) => state);
  const { cart, addItem, updateQuantity, openCart } = useCartStore((state) => state);

  const [shop, setShop] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [foodFilter, setFoodFilter] = useState('all'); // 'all', 'veg', 'non-veg'

  // Quote Request Modal State
  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [quoteItem, setQuoteItem] = useState(null);
  const [quoteDesc, setQuoteDesc] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchShopData = async () => {
      setLoading(true);
      try {
        const [shopRes, listingsRes] = await Promise.all([
          netWorkCall(`${apiConfig.shop_details}/${shop_id}/details`, 'GET', null, false),
          netWorkCall(`${apiConfig.listings_by_shop}/${shop_id}`, 'GET', null, false),
        ]);

        if (isMounted) {
          if (shopRes?.data) setShop(shopRes.data);
          if (listingsRes?.data) setListings(listingsRes.data);
        }
      } catch (err) {
        console.error('Error fetching storefront:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchShopData();
    return () => {
      isMounted = false;
    };
  }, [shop_id]);

  // Determine store archetype based on shop_type, category, or listings
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
      typeStr.includes('tiffin') ||
      typeStr.includes('ice cream')
    ) {
      return 'food';
    }
    if (
      typeStr.includes('provision') ||
      typeStr.includes('supermarket') ||
      typeStr.includes('grocer') ||
      typeStr.includes('shoe') ||
      typeStr.includes('store') ||
      typeStr.includes('boutique') ||
      typeStr.includes('medical')
    ) {
      return 'product';
    }
    if (
      typeStr.includes('electric') ||
      typeStr.includes('hardware') ||
      typeStr.includes('technician') ||
      typeStr.includes('plumb') ||
      typeStr.includes('gas') ||
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
      typeStr.includes('turf') ||
      typeStr.includes('mahal')
    ) {
      return 'rental';
    }

    // Fallback: check majority of listings
    const foodCount = listings.filter((i) => i.listing_type === 'food').length;
    const serviceCount = listings.filter((i) => i.listing_type === 'service').length;
    const rentalCount = listings.filter((i) => i.listing_type === 'rental').length;
    if (foodCount > 0 && foodCount >= serviceCount) return 'food';
    if (serviceCount > 0) return 'service';
    if (rentalCount > 0) return 'rental';
    return 'product';
  }, [shop, listings]);

  // DYNAMIC TABS: Tailored to the store's actual catalog & sections (NO empty tabs!)
  const dynamicTabs = useMemo(() => {
    if (!listings || listings.length === 0) {
      return [{ key: 'all', label: 'All Items (0)' }];
    }

    // 1. Check unique sections in metadata
    const sections = [
      ...new Set(
        listings
          .map((it) => it.metadata?.section || it.metadata?.category)
          .filter(Boolean)
      ),
    ];

    // If store has defined sections (e.g. "Biryani & Rice", "Starters & Fry", etc.)
    if (sections.length > 1) {
      return [
        {
          key: 'all',
          label: (
            <span>
              All ({listings.length})
            </span>
          ),
        },
        ...sections.map((sec) => {
          const count = listings.filter(
            (it) => (it.metadata?.section || it.metadata?.category) === sec
          ).length;
          return {
            key: `section:${sec}`,
            label: (
              <span>
                {sec} ({count})
              </span>
            ),
          };
        }),
      ];
    }

    // 2. If store items span multiple types, only show types with count > 0!
    const typesPresent = [...new Set(listings.map((it) => it.listing_type || 'product'))];
    if (typesPresent.length > 1) {
      const typeLabels = {
        food: 'Food & Dishes',
        product: 'Products & Groceries',
        service: 'Services & Rate Card',
        rental: 'Rental Items',
      };
      return [
        { key: 'all', label: `All Items (${listings.length})` },
        ...typesPresent.map((t) => {
          const count = listings.filter((it) => it.listing_type === t).length;
          return {
            key: `type:${t}`,
            label: `${typeLabels[t] || t} (${count})`,
          };
        }),
      ];
    }

    // 3. Single domain fallback
    const archetypeLabels = {
      food: 'All Dishes',
      product: 'All Products',
      service: 'All Services & Packages',
      wellness: 'All Treatments & Sessions',
      rental: 'All Rental Items',
    };

    return [
      {
        key: 'all',
        label: `${archetypeLabels[storeArchetype] || 'All Items'} (${listings.length})`,
      },
    ];
  }, [listings, storeArchetype]);

  // Filter listings based on active tab, search, and dietary filter
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      // Tab filter
      if (activeTab !== 'all') {
        if (activeTab.startsWith('section:')) {
          const sec = activeTab.replace('section:', '');
          const itemSec = item.metadata?.section || item.metadata?.category;
          if (itemSec !== sec) return false;
        } else if (activeTab.startsWith('type:')) {
          const type = activeTab.replace('type:', '');
          if (item.listing_type !== type) return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name?.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }

      // Dietary filter for food
      if (foodFilter !== 'all' && item.listing_type === 'food') {
        const itemFoodType = item.metadata?.food_type;
        if (foodFilter === 'veg' && itemFoodType !== 'veg') return false;
        if (foodFilter === 'non-veg' && itemFoodType !== 'non-veg') return false;
      }

      return true;
    });
  }, [listings, activeTab, searchQuery, foodFilter]);

  const hasFoodItems = listings.some((i) => i.listing_type === 'food');

  const isOwnStore = Boolean(user_data?.user_id && shop?.owner_id && user_data.user_id === shop.owner_id);

  const handleOpenQuote = (item) => {
    if (!user_data?.user_id) {
      message.info('Please login to request a quote');
      history.push(Routes.login);
      return;
    }
    if (isOwnStore) {
      message.info('You are viewing your own store. Open Merchant Hub to edit listings.');
      return;
    }
    setQuoteItem(item);
    setQuoteDesc(`I would like an estimate for: ${item.name}`);
    setQuoteModalVisible(true);
  };

  const handleAddToCart = (item) => {
    if (isOwnStore) {
      message.info('You are viewing your own store. Open Merchant Hub to edit listings.');
      return;
    }
    addItem(shop, item);
  };

  const submitQuote = async () => {
    if (!quoteDesc.trim()) {
      message.error('Please describe your requirement');
      return;
    }

    setQuoteLoading(true);
    try {
      const payload = {
        shop_id,
        service_title: quoteItem?.name || 'Service Request',
        service_description: quoteDesc,
        estimated_amount: quoteItem?.price || 0,
      };

      const res = await netWorkCall(
        apiConfig.quotes_create,
        'POST',
        JSON.stringify(payload)
      );

      if (res?.data) {
        message.success('Quote request sent to merchant!');
        setQuoteModalVisible(false);
        setQuoteDesc('');
      } else {
        message.error(res?.error || 'Failed to submit quote');
      }
    } catch (err) {
      console.error(err);
      message.error('Error submitting quote');
    } finally {
      setQuoteLoading(false);
    }
  };

  const cartItemsForThisShop =
    cart.shop_id === shop_id
      ? cart.items.reduce((acc, it) => acc + (it.quantity || 1), 0)
      : 0;
  const cartSubtotal =
    cart.shop_id === shop_id
      ? cart.items.reduce((acc, it) => acc + it.unit_price * it.quantity, 0)
      : 0;

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: '60vh' }}>
        <Spin size="large" tip="Loading Storefront..." />
      </Flex>
    );
  }

  if (!shop) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Empty description="Shop not found" />
        <Button type="primary" onClick={() => history.push(Routes.home)} style={{ marginTop: 16 }}>
          Back to Explore
        </Button>
      </div>
    );
  }

  const directionsUrl =
    shop.directions ||
    (shop.latitude && shop.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`
      : shop.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${shop.shop_name} ${shop.address}`
        )}`
      : null);

  return (
    <div style={{ maxWidth: 1160, margin: '0 auto', padding: screens.xs ? '12px 10px 100px 10px' : '20px 16px 80px 16px' }}>
      {/* Back button & Owner Quick Shortcut */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 14 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => history.push(Routes.home)}
          style={{
            fontWeight: 600,
            color: '#475569',
            padding: '4px 8px',
            borderRadius: 8,
            transition: 'all 0.2s ease',
          }}
        >
          Back to Local Market
        </Button>

        {isOwnStore && (
          <Button
            type="primary"
            icon={<EditOutlined />}
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
            }}
            onClick={() => history.push(`/client_register?shop_id=${shop.id}`)}
          >
            Manage Store
          </Button>
        )}
      </Flex>

      {isOwnStore && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 14,
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <Flex align="center" gap={10}>
            <span style={{ fontSize: 22 }}>🏪</span>
            <div>
              <div style={{ fontWeight: 700, color: '#065f46', fontSize: 13 }}>
                Storefront Preview Mode
              </div>
              <div style={{ color: '#047857', fontSize: 12 }}>
                This is your live storefront as seen by customers. To edit listings, stock, or prices, open Merchant Hub.
              </div>
            </div>
          </Flex>
          <Button
            size="small"
            style={{
              borderColor: '#059669',
              color: '#059669',
              fontWeight: 600,
              borderRadius: 6,
            }}
            onClick={() => history.push(`/client_register?shop_id=${shop.id}`)}
          >
            Edit in Merchant Hub
          </Button>
        </div>
      )}

      {/* Hero Storefront Card - High Contrast & Modern Clean Header */}
      <Card
        style={{
          borderRadius: 20,
          overflow: 'hidden',
          marginBottom: 24,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06)',
          background: '#ffffff',
        }}
        bodyStyle={{ padding: 0 }}
      >
        {/* Cover Graphic Banner */}
        <div
          style={{
            height: screens.xs ? 130 : 160,
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)',
          }}
        >
          {shop.img_url ? (
            <>
              <div
                style={{
                  position: 'absolute',
                  inset: -16,
                  backgroundImage: `url(${shop.img_url})`,
                  backgroundPosition: 'center',
                  backgroundSize: 'cover',
                  filter: 'blur(20px) brightness(0.6) saturate(1.25)',
                  transform: 'scale(1.15)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(15, 23, 42, 0.2) 0%, rgba(15, 23, 42, 0.72) 100%)',
                }}
              />
            </>
          ) : (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.15,
                backgroundImage:
                  'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.8) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.6) 0%, transparent 50%)',
              }}
            />
          )}

          {/* Badges on Banner */}
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: screens.xs ? 12 : 16,
              right: screens.xs ? 12 : 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              zIndex: 2,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 9999,
                background: 'rgba(15, 23, 42, 0.55)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.2px',
              }}
            >
              <ThunderboltFilled style={{ color: '#fbbf24' }} />
              Direct Local Store • 0% Commission
            </div>

            {isOwnStore ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 9999,
                  background: 'rgba(5, 150, 105, 0.85)',
                  border: '1px solid rgba(167, 243, 208, 0.4)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  color: '#ffffff',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                <span>👁️ Owner Preview Mode</span>
              </div>
            ) : (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 9999,
                  background: 'rgba(6, 78, 59, 0.6)',
                  border: '1px solid rgba(52, 211, 153, 0.35)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  color: '#34d399',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    boxShadow: '0 0 6px #10b981',
                    display: 'inline-block',
                  }}
                />
                Open for Orders
              </div>
            )}
          </div>
        </div>

        {/* Store Profile Details */}
        <div style={{ padding: screens.xs ? '0 14px 18px 14px' : '0 24px 22px 24px' }}>
          {screens.xs ? (
            /* Mobile Layout */
            <div>
              {/* Avatar + Title Row */}
              <Flex gap={12} align="end" style={{ marginTop: -38, marginBottom: 12 }}>
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 16,
                    background: '#ffffff',
                    padding: 3,
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.16)',
                    border: '3px solid #ffffff',
                    overflow: 'hidden',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  <img
                    src={
                      shop.img_url ||
                      'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=300'
                    }
                    alt={shop.shop_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
                  <Flex align="center" gap={6} wrap="wrap">
                    <Title
                      level={3}
                      style={{
                        margin: 0,
                        fontWeight: 800,
                        color: '#0f172a',
                        fontSize: 19,
                        letterSpacing: '-0.3px',
                        lineHeight: 1.2,
                      }}
                    >
                      {shop.shop_name}
                    </Title>
                    <SafetyCertificateFilled
                      style={{ color: '#4f46e5', fontSize: 18 }}
                      title="Verified Local Merchant"
                    />
                    {isOwnStore && (
                      <Tag
                        color="green"
                        style={{ fontWeight: 700, margin: 0, borderRadius: 6, fontSize: 11 }}
                      >
                        My Store
                      </Tag>
                    )}
                  </Flex>
                  <Flex gap={6} align="center" wrap="wrap" style={{ marginTop: 4 }}>
                    <Tag
                      color="indigo"
                      style={{ fontWeight: 700, margin: 0, borderRadius: 6, fontSize: 11 }}
                    >
                      {shop.shopCategory?.name || shop.shop_type || 'Store'}
                    </Tag>
                    <Flex
                      align="center"
                      gap={3}
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#b45309',
                        background: '#fef3c7',
                        padding: '1px 6px',
                        borderRadius: 6,
                        border: '1px solid #fde68a',
                      }}
                    >
                      <StarFilled style={{ fontSize: 11, color: '#f59e0b' }} />
                      <span>{shop.rating || 5}.0</span>
                    </Flex>
                  </Flex>
                </div>
              </Flex>

              {/* Area & Address & Open Status */}
              <div style={{ marginBottom: 12 }}>
                {shop.area && (
                  <Tag
                    style={{
                      marginBottom: 6,
                      borderRadius: 6,
                      fontSize: 11,
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #e2e8f0',
                      fontWeight: 600,
                    }}
                  >
                    <EnvironmentOutlined style={{ color: '#4f46e5' }} /> {shop.area}
                  </Tag>
                )}
                <Paragraph
                  type="secondary"
                  style={{
                    margin: '4px 0 6px 0',
                    fontSize: 12,
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 6,
                    lineHeight: '18px',
                  }}
                >
                  <EnvironmentOutlined style={{ color: '#4f46e5', marginTop: 3, flexShrink: 0 }} />
                  <span>{shop.address}</span>
                </Paragraph>
                <Flex align="center" gap={6} style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>
                  <ClockCircleOutlined style={{ color: '#10b981' }} />
                  <span>Open for direct orders • Instant confirmation</span>
                </Flex>
              </div>

              {/* Mobile Action Buttons */}
              <Flex gap={8} align="center" style={{ width: '100%', marginTop: 14 }}>
                {shop.mobile_number && (
                  <Button
                    icon={<PhoneOutlined />}
                    href={`tel:${shop.mobile_number}`}
                    style={{
                      flex: 1,
                      height: 42,
                      borderRadius: 10,
                      fontWeight: 700,
                      borderColor: '#cbd5e1',
                    }}
                  >
                    Call
                  </Button>
                )}
                {directionsUrl && (
                  <Button
                    icon={<CompassOutlined />}
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      height: 42,
                      borderRadius: 10,
                      fontWeight: 700,
                      borderColor: '#cbd5e1',
                    }}
                  >
                    Directions
                  </Button>
                )}
                {isOwnStore ? (
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => history.push(`/client_register?shop_id=${shop.id}`)}
                    style={{
                      flex: 2,
                      height: 42,
                      borderRadius: 10,
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                      boxShadow: '0 4px 14px rgba(5, 150, 105, 0.28)',
                      border: 'none',
                    }}
                  >
                    Manage My Store
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    icon={<MessageOutlined />}
                    onClick={() => {
                      if (!user_data?.user_id) {
                        message.info('Please log in to chat with the store owner');
                        history.push(Routes.login);
                      } else {
                        handleChatOpen(shop.owner_id, shop.id);
                      }
                    }}
                    style={{
                      flex: 2,
                      height: 42,
                      borderRadius: 10,
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      boxShadow: '0 4px 14px rgba(79, 70, 229, 0.28)',
                      border: 'none',
                    }}
                  >
                    Chat with Owner
                  </Button>
                )}
              </Flex>
            </div>
          ) : (
            /* Desktop / Tablet Layout */
            <Flex
              justify="space-between"
              align="start"
              gap={24}
              wrap="wrap"
            >
              {/* Left Column: Avatar + Full Info Group in one row */}
              <Flex gap={20} align="start" style={{ flex: 1, minWidth: 340 }}>
                {/* Avatar */}
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 18,
                    background: '#ffffff',
                    padding: 3,
                    boxShadow: '0 10px 25px -4px rgba(15, 23, 42, 0.16)',
                    border: '3px solid #ffffff',
                    overflow: 'hidden',
                    flexShrink: 0,
                    marginTop: -48,
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  <img
                    src={
                      shop.img_url ||
                      'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=300'
                    }
                    alt={shop.shop_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14 }}
                  />
                </div>

                {/* Details Column */}
                <Flex vertical gap={6} style={{ flex: 1, minWidth: 0, paddingTop: 10 }}>
                  {/* Shop Title + Verified */}
                  <Flex align="center" gap={8} wrap="wrap">
                    <Title
                      level={2}
                      style={{
                        margin: 0,
                        fontWeight: 800,
                        color: '#0f172a',
                        fontSize: 24,
                        letterSpacing: '-0.5px',
                        lineHeight: 1.2,
                      }}
                    >
                      {shop.shop_name}
                    </Title>
                    <SafetyCertificateFilled
                      style={{ color: '#4f46e5', fontSize: 20 }}
                      title="Verified Local Merchant"
                    />
                    {isOwnStore && (
                      <Tag
                        color="green"
                        style={{ fontWeight: 700, margin: 0, borderRadius: 6, fontSize: 12, padding: '1px 8px' }}
                      >
                        My Store
                      </Tag>
                    )}
                  </Flex>

                  {/* Badges: Category, Area, Rating */}
                  <Flex gap={8} align="center" wrap="wrap">
                    <Tag
                      color="indigo"
                      style={{
                        fontWeight: 700,
                        margin: 0,
                        borderRadius: 6,
                        fontSize: 12,
                        padding: '1px 8px',
                      }}
                    >
                      {shop.shopCategory?.name || shop.shop_type || 'Store'}
                    </Tag>

                    {shop.area && (
                      <Tag
                        style={{
                          margin: 0,
                          borderRadius: 6,
                          fontSize: 12,
                          padding: '1px 8px',
                          background: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                          fontWeight: 500,
                        }}
                      >
                        <EnvironmentOutlined style={{ color: '#4f46e5' }} /> {shop.area}
                      </Tag>
                    )}

                    <Flex
                      align="center"
                      gap={4}
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#b45309',
                        background: '#fef3c7',
                        padding: '1px 8px',
                        borderRadius: 6,
                        border: '1px solid #fde68a',
                      }}
                    >
                      <StarFilled style={{ fontSize: 12, color: '#f59e0b' }} />
                      <span>{shop.rating || 5}.0</span>
                    </Flex>
                  </Flex>

                  {/* Address */}
                  <Paragraph
                    type="secondary"
                    style={{
                      margin: '2px 0 0 0',
                      fontSize: 13,
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 6,
                    }}
                  >
                    <EnvironmentOutlined style={{ color: '#4f46e5', marginTop: 3, flexShrink: 0 }} />
                    <span>{shop.address}</span>
                  </Paragraph>

                  {/* Status line */}
                  <Flex align="center" gap={6} style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginTop: 2 }}>
                    <ClockCircleOutlined style={{ color: '#10b981' }} />
                    <span>Open for direct orders • Instant confirmation • 0% Commission</span>
                  </Flex>
                </Flex>
              </Flex>

              {/* Right Column: Actions */}
              <Flex
                gap={10}
                align="center"
                style={{
                  paddingTop: 12,
                  flexShrink: 0,
                }}
              >
                {shop.mobile_number && (
                  <Button
                    icon={<PhoneOutlined />}
                    href={`tel:${shop.mobile_number}`}
                    style={{
                      height: 40,
                      borderRadius: 10,
                      fontWeight: 600,
                      borderColor: '#cbd5e1',
                      color: '#334155',
                    }}
                  >
                    Call
                  </Button>
                )}

                {directionsUrl && (
                  <Button
                    icon={<CompassOutlined />}
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      height: 40,
                      borderRadius: 10,
                      fontWeight: 600,
                      borderColor: '#cbd5e1',
                      color: '#334155',
                    }}
                  >
                    Directions
                  </Button>
                )}

                {isOwnStore ? (
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => history.push(`/client_register?shop_id=${shop.id}`)}
                    style={{
                      height: 40,
                      borderRadius: 10,
                      fontWeight: 700,
                      padding: '0 18px',
                      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                      boxShadow: '0 4px 14px rgba(5, 150, 105, 0.28)',
                      border: 'none',
                    }}
                  >
                    Manage My Store
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    icon={<MessageOutlined />}
                    onClick={() => {
                      if (!user_data?.user_id) {
                        message.info('Please log in to chat with the store owner');
                        history.push(Routes.login);
                      } else {
                        handleChatOpen(shop.owner_id, shop.id);
                      }
                    }}
                    style={{
                      height: 40,
                      borderRadius: 10,
                      fontWeight: 700,
                      padding: '0 18px',
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      boxShadow: '0 4px 14px rgba(79, 70, 229, 0.28)',
                      border: 'none',
                    }}
                  >
                    Chat with Owner
                  </Button>
                )}
              </Flex>
            </Flex>
          )}
        </div>
      </Card>

      {/* Catalog & Menu Offerings Section */}
      <div style={{ marginBottom: 24 }}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={12} style={{ marginBottom: 12 }}>
          <div>
            <Title level={4} style={{ fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
              {storeArchetype === 'food'
                ? 'Menu & Dishes'
                : storeArchetype === 'service'
                ? 'Service Packages & Rate Card'
                : storeArchetype === 'wellness'
                ? 'Spa Treatments & Sessions'
                : storeArchetype === 'rental'
                ? 'Rental Fleet & Equipment'
                : 'Products & Offerings'}
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Direct prices with 0% aggregator markups
            </Text>
          </div>

          {/* Quick Search within store */}
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Search items in this store..."
            allowClear
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: screens.xs ? '100%' : 260, borderRadius: 10 }}
          />
        </Flex>

        {/* Dietary Veg/Non-Veg Filter (Only shown if restaurant/food items exist) */}
        {hasFoodItems && (
          <Flex gap={8} align="center" style={{ marginBottom: 14 }}>
            <Segmented
              value={foodFilter}
              onChange={setFoodFilter}
              options={[
                { label: 'All Items', value: 'all' },
                { label: '🟢 Pure Veg', value: 'veg' },
                { label: '🔴 Non-Veg', value: 'non-veg' },
              ]}
              style={{ fontWeight: 700, padding: 3, background: '#f1f5f9' }}
            />
          </Flex>
        )}

        {/* DYNAMIC CATEGORY TABS (Only relevant sections, NO empty zeros!) */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={dynamicTabs}
          style={{ marginBottom: 16 }}
        />
      </div>

      {/* Item Cards Grid */}
      {filteredListings.length === 0 ? (
        <Card style={{ borderRadius: 16, textAlign: 'center', padding: '40px 16px', border: '1px solid #e2e8f0' }}>
          <Empty
            description="No items found in this section"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              onClick={() => {
                setActiveTab('all');
                setSearchQuery('');
                setFoodFilter('all');
              }}
              style={{ borderRadius: 8, fontWeight: 700 }}
            >
              Reset Filters
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={screens.xs ? [12, 12] : [16, 16]}>
          {filteredListings.map((item) => {
            const inCartItem = cart.items.find((i) => i.listing_id === item.id);
            const qty = inCartItem?.quantity || 0;
            const isFood = item.listing_type === 'food';
            const isService = item.listing_type === 'service';
            const isRental = item.listing_type === 'rental';
            const foodType = item.metadata?.food_type;
            const durationMins = item.metadata?.duration_mins;
            const deposit = item.metadata?.security_deposit;

            return (
              <Col xs={24} sm={12} md={8} key={item.id}>
                <Card
                  hoverable
                  style={{
                    height: '100%',
                    borderRadius: 16,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                    transition: 'all 0.2s ease',
                  }}
                  bodyStyle={{
                    padding: screens.xs ? 14 : 16,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                  }}
                >
                  <Flex gap={12} align="start" style={{ marginBottom: 10 }}>
                    {item.img_url ? (
                      <img
                        src={item.img_url}
                        alt={item.name}
                        style={{
                          width: screens.xs ? 76 : 84,
                          height: screens.xs ? 76 : 84,
                          borderRadius: 12,
                          objectFit: 'cover',
                          flexShrink: 0,
                          border: '1px solid #f1f5f9',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: screens.xs ? 76 : 84,
                          height: screens.xs ? 76 : 84,
                          borderRadius: 12,
                          background: '#f8fafc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94a3b8',
                          fontSize: 26,
                          flexShrink: 0,
                          border: '1px solid #f1f5f9',
                        }}
                      >
                        <FileTextOutlined />
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Section & Indicator Badges */}
                      <Flex align="center" gap={6} wrap="wrap" style={{ marginBottom: 4 }}>
                        {isFood && foodType && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 14,
                              height: 14,
                              border: `1.5px solid ${foodType === 'veg' ? '#10b981' : '#ef4444'}`,
                              borderRadius: 3,
                              padding: 2,
                            }}
                            title={foodType === 'veg' ? 'Pure Veg' : 'Non-Veg'}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: foodType === 'veg' ? '50%' : 0,
                                backgroundColor: foodType === 'veg' ? '#10b981' : '#ef4444',
                              }}
                            />
                          </span>
                        )}

                        {item.metadata?.section && (
                          <Tag
                            color="blue"
                            style={{
                              fontSize: 10,
                              lineHeight: '16px',
                              padding: '0 6px',
                              fontWeight: 600,
                              margin: 0,
                            }}
                          >
                            {item.metadata.section}
                          </Tag>
                        )}

                        {durationMins && (
                          <Tag color="purple" style={{ fontSize: 10, lineHeight: '16px', padding: '0 6px', margin: 0 }}>
                            ⏱️ {durationMins}m
                          </Tag>
                        )}
                      </Flex>

                      <Title
                        level={5}
                        ellipsis={{ rows: 2 }}
                        style={{
                          margin: '0 0 6px 0',
                          fontWeight: 700,
                          fontSize: screens.xs ? 14 : 15,
                          color: '#0f172a',
                          lineHeight: 1.3,
                        }}
                      >
                        {item.name}
                      </Title>

                      <Flex align="baseline" gap={6}>
                        <span style={{ fontSize: 17, fontWeight: 800, color: '#4f46e5' }}>
                          ₹{item.price}
                        </span>
                        {item.mrp && item.mrp > item.price && (
                          <span
                            style={{
                              fontSize: 12,
                              color: '#94a3b8',
                              textDecoration: 'line-through',
                            }}
                          >
                            ₹{item.mrp}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          / {item.unit || 'unit'}
                        </span>
                      </Flex>
                    </div>
                  </Flex>

                  {/* Description & Metadata */}
                  {item.description && (
                    <Paragraph
                      type="secondary"
                      ellipsis={{ rows: 2 }}
                      style={{
                        fontSize: 12,
                        color: '#64748b',
                        marginBottom: 12,
                        minHeight: 34,
                        lineHeight: '17px',
                      }}
                    >
                      {item.description}
                    </Paragraph>
                  )}

                  {/* Deposit notice for rentals */}
                  {isRental && deposit && (
                    <div
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 11,
                        color: '#166534',
                        fontWeight: 600,
                        marginBottom: 10,
                      }}
                    >
                      🛡️ Refundable Deposit: ₹{deposit}
                    </div>
                  )}

                  {/* Archetype Action Buttons */}
                  <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                    {isService ? (
                      <Flex gap={8}>
                        <Button
                          block
                          style={{ borderRadius: 8, fontWeight: 600, height: 38 }}
                          onClick={() => handleOpenQuote(item)}
                        >
                          Request Quote
                        </Button>
                        <Button
                          type="primary"
                          block
                          style={{
                            borderRadius: 8,
                            fontWeight: 700,
                            height: 38,
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                          }}
                          onClick={() => handleAddToCart(item)}
                        >
                          Book Visit
                        </Button>
                      </Flex>
                    ) : isRental ? (
                      <Flex gap={8}>
                        <Button
                          block
                          style={{ borderRadius: 8, fontWeight: 600, height: 38 }}
                          onClick={() => {
                            if (isOwnStore) {
                              message.info('You are viewing your own store. Open Merchant Hub to edit listings.');
                              return;
                            }
                            handleChatOpen(shop.owner_id, shop.id);
                          }}
                        >
                          Inquire
                        </Button>
                        <Button
                          type="primary"
                          block
                          icon={<ShoppingCartOutlined />}
                          style={{
                            borderRadius: 8,
                            fontWeight: 700,
                            height: 38,
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                          }}
                          onClick={() => {
                            if (isOwnStore) {
                              message.info('You are viewing your own store. Open Merchant Hub to edit listings.');
                              return;
                            }
                            addItem(shop, item);
                            openCart();
                          }}
                        >
                          Reserve
                        </Button>
                      </Flex>
                    ) : qty > 0 ? (
                      <Flex
                        align="center"
                        justify="space-between"
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: 8,
                          padding: '2px 8px',
                          height: 38,
                        }}
                      >
                        <Button
                          type="text"
                          icon={<MinusOutlined />}
                          onClick={() => updateQuantity(item.id, -1)}
                        />
                        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: 13 }}>
                          {qty} in Cart
                        </span>
                        <Button
                          type="text"
                          icon={<PlusOutlined />}
                          onClick={() => updateQuantity(item.id, 1)}
                        />
                      </Flex>
                    ) : (
                      <Button
                        type="primary"
                        block
                        icon={<ShoppingCartOutlined />}
                        style={{
                          borderRadius: 8,
                          fontWeight: 700,
                          height: 38,
                          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                        }}
                        onClick={() => handleAddToCart(item)}
                      >
                        {isFood ? 'Add to Order' : 'Add to Cart'}
                      </Button>
                    )}
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Floating Bottom Cart Bar */}
      {cartItemsForThisShop > 0 && (
        <div className="cart-floating-badge" onClick={openCart}>
          <Flex align="center" gap={8}>
            <Badge count={cartItemsForThisShop} color="#4f46e5" />
            <span style={{ fontWeight: 700 }}>
              {cartItemsForThisShop} {cartItemsForThisShop === 1 ? 'item' : 'items'} in Direct Cart
            </span>
          </Flex>
          <Flex align="center" gap={12}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>
              ₹{cartSubtotal.toFixed(2)}
            </span>
            <Button
              type="primary"
              size="small"
              style={{
                borderRadius: 9999,
                fontWeight: 700,
                background: '#4f46e5',
              }}
            >
              View Cart & Checkout
            </Button>
          </Flex>
        </div>
      )}

      {/* Quote Request Modal */}
      <Modal
        title={`Request Estimate / Quote: ${quoteItem?.name || ''}`}
        open={quoteModalVisible}
        onCancel={() => setQuoteModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setQuoteModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={quoteLoading}
            onClick={submitQuote}
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', fontWeight: 700 }}
          >
            Send Quote Request
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            Describe your requirement (model, problem details, preferred visit time, or site photos).
            The store owner will reply directly in your Quotes & Orders tab.
          </Text>
          <Input.TextArea
            rows={4}
            value={quoteDesc}
            onChange={(e) => setQuoteDesc(e.target.value)}
            placeholder="e.g. 1.5 Ton Split AC is blowing room temperature air. Need gas pressure check and repair on Saturday morning."
          />
        </div>
        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <Text type="secondary">Base Service / Inspection Rate:</Text>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#4f46e5' }}>
            ₹{quoteItem?.price || 0}{' '}
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
              / {quoteItem?.unit || 'visit'}
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StorefrontScreen;
