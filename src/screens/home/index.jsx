import React, { useEffect, useState } from 'react';
import {
  Input,
  Button,
  Typography,
  Col,
  Row,
  Tag,
  Segmented,
  Spin,
  Empty,
  Card,
  Flex,
  Grid,
  Space,
} from 'antd';
import {
  CloseOutlined,
  SearchOutlined,
  EnvironmentOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { LeafletComponent, ShopCard } from '../../app/components';
import { getLocationName, netWorkCall } from '../../app/utils/helper';
import { apiConfig } from '../../app/utils';
import { useGlobalStore, useCartStore } from '../../app/services';
import { useHistory } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

const CATEGORY_CHIPS = [
  { id: 'all', label: 'All Businesses', icon: '🏪' },
  { id: 'Provision Store', label: 'Groceries & Marts', icon: '🛒' },
  { id: 'Restaurants', label: 'Food & Dining', icon: '🍽️' },
  { id: 'Technicians', label: 'Services & Technicians', icon: '🔧' },
  { id: 'Dress Shop', label: 'Fashion & Boutique', icon: '👗' },
  { id: 'Rentals', label: 'Rentals & Equipment', icon: '📦' },
];

const HomeScreen = () => {
  const history = useHistory();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const { user_data } = useGlobalStore((state) => state);
  const { addItem, openCart } = useCartStore((state) => state);

  const [searchText, setSearchText] = useState('');
  const [searchMode, setSearchMode] = useState('items'); // 'shops' or 'items'
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchError, setSearchError] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [markerLocation, setMarkerLocation] = useState([12.9631025, 80.25476]); // Default location
  const [locationName, setLocationName] = useState('');
  const [searchMarkers, setSearchMarkers] = useState([]);
  const [itemListings, setItemListings] = useState([]);
  const [position, setPosition] = useState([12.9631025, 80.25476]);
  const [loading, setLoading] = useState(false);

  const handleSearch = (value) => {
    setSearchText(value);
  };

  const updateMarker = (marker) => {
    setMarkerLocation(marker);
  };

  const handleOpenModal = () => {
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  const fetchUserLocation = async () => {
    try {
      if (navigator.geolocation) {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
          });
        });
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setMarkerLocation(coords);
        setPosition(coords);
      }
    } catch (error) {
      console.log('Using default location (geolocation unavailable or denied)');
    }
  };

  useEffect(() => {
    fetchUserLocation();
  }, []);

  useEffect(() => {
    const [ lat, lng ] = markerLocation;

    if (!lat || !lng) return;
    

    let cancelled = false;

    const fetchLocation = async () => {
      try {
        const name = await getLocationName(lat, lng);
        if (!cancelled) setLocationName(name);
      } catch {
        if (!cancelled) setLocationName('');
      }
    };

    fetchLocation();

    return () => {
      cancelled = true;
    };
  }, [markerLocation]);

  // Fetch shops or items based on searchMode & query
  useEffect(() => {
    let isCancelled = false;

    const performSearch = async () => {
      setLoading(true);
      const coords =
        markerLocation && markerLocation.length === 2
          ? markerLocation
          : [12.9631025, 80.25476];

      try {
        if (searchMode === 'shops') {
          const body = JSON.stringify({
            lat: coords[0],
            lon: coords[1],
            search: searchText || '',
          });

          const response = await netWorkCall(apiConfig.shops_search, 'POST', body, false);
          if (!isCancelled && response?.data) {
            let shops = response.data;
            if (activeCategory !== 'all') {
              shops = shops.filter((s) => {
                const type = (s.shop_type || s.shopCategory?.name || '').toLowerCase();
                return type.includes(activeCategory.toLowerCase());
              });
            }
            setSearchMarkers(shops);
            setSearchError(shops.length === 0 ? 'No matching stores found nearby' : '');
          }
        } else {
          // Search items & services
          const body = JSON.stringify({
            lat: coords[0],
            lon: coords[1],
            search: searchText || '',
          });

          const response = await netWorkCall(apiConfig.listings_search, 'POST', body, false);
          if (!isCancelled && response?.data) {
            setItemListings(response.data);
            setSearchError(response.data.length === 0 ? 'No matching items or services found nearby' : '');
          }
        }
      } catch (error) {
        if (!isCancelled) console.error('Error fetching search results:', error);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };


    performSearch();
    return () => {
      isCancelled = true;
    };
  }, [markerLocation, searchText, searchMode, activeCategory]);

  return (
    <div style={{ minHeight: '100%', background: '#f8fafc', paddingBottom: 80 }}>
      {/* Modern Hero Search Header with Ant Design Layout */}
      <div
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)',
          borderBottom: '1px solid #e2e8f0',
          padding: screens.xs ? '20px 14px 18px 14px' : screens.md ? '36px 20px 28px 20px' : '48px 24px 36px 24px',
        }}
      >
        <Flex vertical align="center" style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          {/* Promotional Tag - Hidden on mobile to remove visual clutter and save screen space */}
          {!screens.xs && (
            <Tag
              color="indigo"
              style={{
                borderRadius: 9999,
                fontWeight: 700,
                fontSize: 11,
                padding: '3px 12px',
                marginBottom: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Direct Hyper-Local Platform • Zero Aggregator Markups
            </Tag>
          )}

          <Title
            level={screens.xs ? 3 : 2}
            style={{
              margin: '0 0 6px 0',
              fontWeight: 800,
              fontSize: 'clamp(20px, 4.5vw, 34px)',
              letterSpacing: '-0.5px',
              color: '#0f172a',
            }}
          >
            Find & Order Directly From Nearby Shops
          </Title>

          <Paragraph
            type="secondary"
            style={{
              fontSize: screens.xs ? 13 : 15,
              maxWidth: 620,
              margin: '0 auto 16px auto',
              color: '#64748b',
              lineHeight: 1.4,
            }}
          >
            Connecting buyers directly with local stores, restaurants, technicians, and rentals.
          </Paragraph>

          {/* Ant Design Search Box Card */}
          <Card
            bordered
            style={{
              width: '100%',
              maxWidth: 720,
              borderRadius: 16,
              boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.06)',
              border: '1px solid #e2e8f0',
              marginBottom: 10,
            }}
            bodyStyle={{ padding: screens.xs ? 10 : 12 }}
          >
            <Flex vertical gap={10}>
              <Segmented
                value={searchMode}
                onChange={setSearchMode}
                block
                options={[
                  { label: '📦 Items & Services', value: 'items' },
                  { label: '🏪 Stores & Outlets', value: 'shops' },
                ]}
                style={{ fontWeight: 700, padding: 3, background: '#f1f5f9' }}
              />

              <Flex gap={8} align="center">
                <Input
                  placeholder={
                    searchMode === 'shops'
                      ? 'Search stores by name, category, or area...'
                      : 'Search products, dishes, AC repair, rentals...'
                  }
                  allowClear
                  size="large"
                  style={{
                    flex: 1,
                    border: '1px solid #e2e8f0',
                    boxShadow: 'none',
                    height: screens.xs ? 42 : 46,
                    fontSize: screens.xs ? 13 : 14,
                  }}
                  value={searchText}
                  onChange={(e) => handleSearch(e.target.value)}
                  onPressEnter={() => handleSearch(searchText)}
                  prefix={<SearchOutlined style={{ color: '#94a3b8', fontSize: 18 }} />}
                />

                <Button
                  type="primary"
                  size="large"
                  style={{
                    borderRadius: 10,
                    padding: screens.xs ? '0 16px' : '0 24px',
                    height: screens.xs ? 42 : 46,
                    fontWeight: 700,
                  }}
                  onClick={() => handleSearch(searchText)}
                >
                  Search
                </Button>
              </Flex>
            </Flex>
          </Card>

          {/* Location Indicator */}
          <Flex
            align="center"
            justify="center"
            gap={6}
            wrap="wrap"
            style={{
              fontSize: 12,
              color: '#64748b',
              marginTop: 4,
            }}
          >
            <EnvironmentOutlined style={{ color: '#4f46e5' }} />
            <span>
              Searching near:{' '}
              <Text strong style={{ color: '#334155' }}>
                {/* {markerLocation[0]?.toFixed(3)}, {markerLocation[1]?.toFixed(3)} */}
                {locationName}
              </Text>
            </span>
            <Button
              type="link"
              size="small"
              onClick={handleOpenModal}
              style={{ fontWeight: 700, padding: '0 4px', fontSize: 12 }}
            >
              Change on Map
            </Button>
          </Flex>

          {/* Category Filter Pills using Ant Design CheckableTag */}
          {searchMode === 'shops' && (
            <div
              className="horizontal-scroll-container"
              style={{
                width: '100%',
                marginTop: 16,
                padding: '2px 0',
                justifyContent: screens.xs ? 'flex-start' : 'center',
                gap: 6,
              }}
            >
              {CATEGORY_CHIPS.map((cat) => (
                <Tag.CheckableTag
                  key={cat.id}
                  checked={activeCategory === cat.id}
                  onChange={() => setActiveCategory(cat.id)}
                  style={{
                    fontSize: screens.xs ? 12 : 13,
                    padding: screens.xs ? '5px 12px' : '6px 16px',
                    borderRadius: 20,
                    lineHeight: '20px',
                    fontWeight: 600,
                    flexShrink: 0,
                    border: '1px solid #e2e8f0',
                    background: activeCategory === cat.id ? '#4f46e5' : '#ffffff',
                    color: activeCategory === cat.id ? '#ffffff' : '#475569',
                    boxShadow: activeCategory === cat.id ? '0 2px 8px rgba(79, 70, 229, 0.25)' : 'none',
                    marginRight: 0,
                  }}
                >
                  <span style={{ marginRight: 4 }}>{cat.icon}</span> {cat.label}
                </Tag.CheckableTag>
              ))}
            </div>
          )}
        </Flex>
      </div>

      {/* Main Content Area - Responsive Container */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: screens.xs ? '18px 12px' : screens.md ? '24px 20px' : '32px 24px',
        }}
      >
        {loading ? (
          <Flex justify="center" align="center" style={{ minHeight: '40vh' }}>
            <Spin size="large" tip="Finding nearby listings..." />
          </Flex>
        ) : searchMode === 'shops' ? (
          /* SHOPS VIEW */
          <div>
            <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
              <Title
                level={4}
                style={{
                  margin: 0,
                  fontWeight: 700,
                  color: '#0f172a',
                  fontSize: screens.xs ? 16 : 18,
                }}
              >
                Nearby Stores & Service Providers{' '}
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                  ({searchMarkers.length})
                </Text>
              </Title>
            </Flex>

            {searchMarkers.length === 0 ? (
              <Card style={{ borderRadius: 16, textAlign: 'center', padding: '40px 16px', border: '1px solid #e2e8f0' }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={searchError || 'No stores found within this area'}
                >
                  <Button type="primary" onClick={handleOpenModal} style={{ borderRadius: 8, fontWeight: 700 }}>
                    Adjust Location on Map
                  </Button>
                </Empty>
              </Card>
            ) : (
              /* Perfect 1/2/3 grid alignment across Mobile, Tab, and Desktop */
              <Row gutter={screens.xs ? [12, 12] : screens.md ? [16, 16] : [24, 24]}>
                {searchMarkers.map((shop) => (
                  <Col xs={24} sm={12} md={12} lg={8} key={shop.id}>
                    <ShopCard
                      shopDetails={shop}
                      isChat={user_data?.user_id ? true : false}
                    />
                  </Col>
                ))}
              </Row>
            )}
          </div>
        ) : (
          /* ITEMS & SERVICES VIEW */
          <div>
            <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
              <Title
                level={4}
                style={{
                  margin: 0,
                  fontWeight: 700,
                  color: '#0f172a',
                  fontSize: screens.xs ? 16 : 18,
                }}
              >
                Matching Products & Services{' '}
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                  ({itemListings.length})
                </Text>
              </Title>
            </Flex>

            {itemListings.length === 0 ? (
              <Card style={{ borderRadius: 16, textAlign: 'center', padding: '40px 16px', border: '1px solid #e2e8f0' }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={searchError || 'No matching items found'}
                >
                  <Button type="primary" onClick={() => setSearchMode('shops')} style={{ borderRadius: 8, fontWeight: 700 }}>
                    Browse All Stores Instead
                  </Button>
                </Empty>
              </Card>
            ) : (
              <Row gutter={screens.xs ? [12, 12] : screens.md ? [16, 16] : [24, 24]}>
                {itemListings.map((item) => (
                  <Col xs={24} sm={12} md={12} lg={8} key={item.id}>
                    <Card
                      hoverable
                      onClick={() => history.push(`/shop/${item.shop?.id}`)}
                      style={{
                        borderRadius: 16,
                        border: '1px solid #e2e8f0',
                        height: '100%',
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
                              width: screens.xs ? 64 : 72,
                              height: screens.xs ? 64 : 72,
                              borderRadius: 12,
                              objectFit: 'cover',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: screens.xs ? 64 : 72,
                              height: screens.xs ? 64 : 72,
                              borderRadius: 12,
                              background: '#f1f5f9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#94a3b8',
                              flexShrink: 0,
                            }}
                          >
                            <ShopOutlined style={{ fontSize: 24 }} />
                          </div>
                        )}

                        <Flex vertical flex={1} style={{ minWidth: 0 }}>
                          {/* Show tag on desktop/tablet, remove on mobile for clean title alignment */}
                          {!screens.xs && (
                            <Tag color="indigo" style={{ fontSize: 10, lineHeight: '18px', width: 'fit-content', margin: 0, marginBottom: 4 }}>
                              {item.listing_type}
                            </Tag>
                          )}

                          <Title
                            level={5}
                            ellipsis={{ rows: 2 }}
                            style={{
                              margin: 0,
                              fontWeight: 700,
                              fontSize: screens.xs ? 14 : 15,
                              color: '#0f172a',
                              lineHeight: 1.3,
                            }}
                          >
                            {item.name}
                          </Title>

                          <Flex align="baseline" gap={4} style={{ marginTop: 4 }}>
                            <span style={{ fontSize: 16, fontWeight: 800, color: '#4f46e5' }}>
                              ₹{item.price}
                            </span>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>
                              / {item.unit || 'unit'}
                            </span>
                          </Flex>
                        </Flex>
                      </Flex>

                      <div
                        style={{
                          background: '#f8fafc',
                          padding: '8px 10px',
                          borderRadius: 8,
                          fontSize: 12,
                          color: '#475569',
                          marginBottom: 12,
                          marginTop: 'auto',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <ShopOutlined /> Store:{' '}
                        <strong>{item.shop?.shop_name || 'Nearby Store'}</strong>
                        {item.shop?.distance !== undefined && (
                          <span style={{ color: '#10b981', fontWeight: 600, marginLeft: 6 }}>
                            • {item.shop.distance.toFixed(1)} km
                          </span>
                        )}
                      </div>

                      <Button
                        type="primary"
                        block
                        icon={<ShoppingCartOutlined />}
                        style={{
                          borderRadius: 8,
                          fontWeight: 700,
                          height: 38,
                          padding: '10px 0px',
                          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          addItem(item.shop, item);
                          openCart();
                        }}
                      >
                        Order Direct
                      </Button>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </div>
        )}
      </div>

      {/* Leaflet Map Modal */}
      {isModalVisible && (
        <div className="modal-wrapper">
          <div id="myModal" className="overlay">
            <div className="modal">
              <button onClick={handleCloseModal} className="close-button">
                <CloseOutlined />
              </button>
              <LeafletComponent
                isModalVisible={isModalVisible}
                markerLocation={markerLocation}
                setMarkerLocation={setMarkerLocation}
                updateMarker={updateMarker}
                searchMarkers={searchMarkers}
                position={position}
                setPosition={setPosition}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;
