import React, { useEffect, useState, useMemo } from 'react';
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
  Modal,
  message,
  Select,
} from 'antd';
import {
  SearchOutlined,
  EnvironmentOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  AimOutlined,
  AppstoreOutlined,
  BarsOutlined,
  AudioOutlined,
  CameraOutlined,
  ThunderboltOutlined,
  CompassOutlined,
} from '@ant-design/icons';
import {
  LeafletComponent,
  ShopCard,
  ShopTableView,
  AddressModal,
  SearchFilterBar,
  DEFAULT_FILTERS,
  applySearchFilters,
  VoiceSearchModal,
  ImageSearchModal,
  AiSearchModal,
  AiRecommendationCard,
  TrustBanner,
} from '../../app/components';
import {
  getLocationName,
  getPreciseUserLocation,
  distanceConvertor,
  netWorkCall,
} from '../../app/utils/helper';
import { apiConfig } from '../../app/utils';
import { useGlobalStore, useCartStore } from '../../app/services';
import { useHistory, useLocation } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

const HomeScreen = () => {
  const history = useHistory();
  const location = useLocation();
  const screens = Grid.useBreakpoint();

  const { user_data } = useGlobalStore((state) => state);
  const { addItem, openCart } = useCartStore((state) => state);

  const [searchText, setSearchText] = useState('');
  const [searchMode, setSearchMode] = useState('items'); // 'shops' or 'items'
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchError, setSearchError] = useState('');

  // View Mode: 'grid' or 'list' (persisted in localStorage)
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('rquest_view_mode') || 'grid';
    } catch (e) {
      return 'grid';
    }
  });

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('rquest_view_mode', mode);
    } catch (e) {
      // Ignore storage write error
    }
  };

  // Smart Search Modals (Voice, Visual/Image, AI Prompt Search)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const handleAiApply = (aiData) => {
    if (aiData.keyword) {
      setSearchText(aiData.keyword);
    }
    setFilters((prev) => ({
      ...prev,
      ...(aiData.category ? { categories: [aiData.category] } : {}),
      ...(aiData.maxDistance ? { maxDistance: aiData.maxDistance } : {}),
      ...(aiData.maxPrice ? { maxPrice: aiData.maxPrice } : {}),
      ...(aiData.onlyAvailable ? { onlyAvailable: true } : {}),
    }));
    message.success(`Smart search configured for "${aiData.keyword || 'listings'}"`);
  };

  useEffect(() => {
    if (location.search) {
      const params = new URLSearchParams(location.search);
      const qParam = params.get('q');
      const catParam = params.get('category');
      if (qParam) {
        setSearchText(qParam);
      }
      if (catParam) {
        setFilters((prev) => ({
          ...prev,
          categories: [catParam],
        }));
      }
    }
  }, [location.search]);
  const getSavedLocation = () => {
    try {
      const saved = localStorage.getItem('rquest_user_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.coords) && parsed.coords.length === 2) {
          // If the saved location is the old hardcoded default, ignore it so fresh location is detected
          const isMockDefault =
            Math.abs(parsed.coords[0] - 12.9631025) < 0.0001 &&
            Math.abs(parsed.coords[1] - 80.25476) < 0.0001;
          if (!isMockDefault) {
            return parsed;
          }
        }
      }
    } catch (e) {
      // Ignore storage read error
    }
    return null;
  };

  const initialLoc = getSavedLocation();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [markerLocation, setMarkerLocation] = useState(
    initialLoc?.coords || [12.9631025, 80.25476]
  );
  const [position, setPosition] = useState(
    initialLoc?.coords || [12.9631025, 80.25476]
  );
  const [locationName, setLocationName] = useState(initialLoc?.name || '');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [searchMarkers, setSearchMarkers] = useState([]);
  const [itemListings, setItemListings] = useState([]);
  const [loading, setLoading] = useState(false);

  // User Saved Addresses integration
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isAddAddressModalOpen, setIsAddAddressModalOpen] = useState(false);

  const fetchUserAddresses = async () => {
    if (!user_data?.user_id) return;
    try {
      const res = await netWorkCall(apiConfig.user_addresses, 'GET', null, true);
      if (res?.data && res.data.length > 0) {
        setSavedAddresses(res.data);
        const defaultAddr = res.data.find((a) => a.is_default) || res.data[0];
        if (defaultAddr && !selectedAddressId) {
          handleSelectAddressForSearch(defaultAddr, false);
        }
      } else {
        setSavedAddresses([]);
      }
    } catch (err) {
      console.warn('Error fetching addresses on home:', err);
    }
  };

  useEffect(() => {
    fetchUserAddresses();
  }, [user_data?.user_id]);

  const handleSelectAddressForSearch = (addr, notify = true) => {
    if (!addr) return;
    setSelectedAddressId(addr.id);
    const newCoords = [Number(addr.latitude), Number(addr.longitude)];
    setMarkerLocation(newCoords);
    setPosition(newCoords);
    const displayName = `${addr.label}: ${addr.street_area || addr.city || 'Saved Area'}`;
    setLocationName(displayName);
    saveLocation(newCoords, displayName);
    if (notify) {
      message.success(`Searching near ${addr.label}`);
    }
  };

  const handleNewAddressCreated = (newAddr) => {
    fetchUserAddresses();
    if (newAddr) {
      handleSelectAddressForSearch(newAddr, true);
    }
  };

  const saveLocation = (coords, name) => {
    try {
      localStorage.setItem(
        'rquest_user_location',
        JSON.stringify({ coords, name })
      );
    } catch (e) {
      // Ignore storage write error
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
  };

  const updateMarker = (marker) => {
    setMarkerLocation(marker);
    setPosition(marker);
  };

  const handleOpenModal = () => {
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  const fetchUserLocation = async (isUserTriggered = false) => {
    setIsDetectingLocation(true);
    try {
      const coords = await getPreciseUserLocation(true);
      setMarkerLocation(coords);
      setPosition(coords);
      const name = await getLocationName(coords[0], coords[1]);
      if (name) {
        setLocationName(name);
        saveLocation(coords, name);
      }
      if (isUserTriggered) {
        message.success(`Location set to ${name || 'detected area'}`);
      }
    } catch (error) {
      console.warn('Geolocation detection error:', error);
      if (error?.isPermissionDenied) {
        message.error(
          'Location access is blocked in your browser. Please allow location access in your browser address bar (🔒 icon), or search your area on the map.',
          6
        );
      } else if (isUserTriggered) {
        message.warning('Could not detect exact location. You can choose or search your area on the map.');
      }
    } finally {
      setIsDetectingLocation(false);
    }
  };

  useEffect(() => {
    const saved = getSavedLocation();
    if (!saved) {
      fetchUserLocation(false);
    } else if (!saved.name) {
      getLocationName(saved.coords[0], saved.coords[1]).then((name) => {
        if (name) {
          setLocationName(name);
          saveLocation(saved.coords, name);
        }
      });
    }
  }, []);

  useEffect(() => {
    const [lat, lng] = markerLocation;
    if (!lat || !lng) return;

    let cancelled = false;
    const fetchLocation = async () => {
      try {
        const name = await getLocationName(lat, lng);
        if (!cancelled) {
          setLocationName(name);
          saveLocation([lat, lng], name);
        }
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
            setSearchMarkers(response.data);
            setSearchError(response.data.length === 0 ? 'No matching stores found nearby' : '');
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
  }, [markerLocation, searchText, searchMode]);

  // Reactive filtered and sorted results using applySearchFilters
  const filteredShops = useMemo(() => {
    return applySearchFilters(searchMarkers, filters, 'shops');
  }, [searchMarkers, filters]);

  const filteredItems = useMemo(() => {
    return applySearchFilters(itemListings, filters, 'items');
  }, [itemListings, filters]);

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
            style={{
              width: '100%',
              maxWidth: 720,
              borderRadius: 16,
              boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.06)',
              border: '1px solid #e2e8f0',
              marginBottom: 10,
            }}
            styles={{ body: { padding: screens.xs ? 10 : 12 } }}
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
                  suffix={
                    <AudioOutlined
                      style={{
                        color: '#6366f1',
                        cursor: 'pointer',
                        fontSize: 17,
                        padding: '4px',
                      }}
                      title="Voice Search"
                      onClick={() => setIsVoiceModalOpen(true)}
                    />
                  }
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

              {/* Other search opton temporary disabled */}
              <Flex
                gap={8}
                align="center"
                justify="center"
                wrap="wrap"
                style={{
                  paddingTop: 6,
                  borderTop: '1px dashed #f1f5f9',
                }}
              >
                <Button
                  size="small"
                  icon={<AudioOutlined style={{ color: '#ef4444' }} />}
                  onClick={() => setIsVoiceModalOpen(true)}
                  style={{
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 600,
                    height: 28,
                    borderColor: '#fca5a5',
                    background: '#fff1f2',
                    color: '#991b1b',
                  }}
                >
                  Voice Search
                </Button>

                <Button
                  size="small"
                  icon={<CameraOutlined style={{ color: '#0284c7' }} />}
                  onClick={() => setIsImageModalOpen(true)}
                  style={{
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 600,
                    height: 28,
                    borderColor: '#bae6fd',
                    background: '#f0f9ff',
                    color: '#0369a1',
                  }}
                >
                  Image Search
                </Button>

                <Button
                  size="small"
                  icon={<ThunderboltOutlined style={{ color: '#7c3aed' }} />}
                  onClick={() => setIsAiModalOpen(true)}
                  style={{
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 600,
                    height: 28,
                    borderColor: '#ddd6fe',
                    background: '#f5f3ff',
                    color: '#6d28d9',
                  }}
                >
                  AI Smart Search
                </Button>
              </Flex>
            </Flex>
          </Card>

          {/* Location Indicator & Saved Addresses Bar */}
          {/* Location context indicator & Map trigger (Unified One-Line) */}
          <Flex
            align="center"
            justify="center"
            gap={8}
            wrap="wrap"
            style={{
              width: '100%',
              maxWidth: 820,
              marginTop: 8,
              fontSize: 12,
              color: '#64748b',
            }}
          >
            <Flex align="center" gap={6}>
              <EnvironmentOutlined style={{ color: '#4f46e5', fontSize: 13 }} />
              <span style={{ fontWeight: 500 }}>Searching near:</span>
              {user_data?.user_id && savedAddresses.length > 0 ? (
                <Select
                  size="small"
                  value={selectedAddressId || 'custom_loc'}
                  onChange={(val) => {
                    if (val === 'custom_loc') {
                      setSelectedAddressId(null);
                      fetchUserLocation(true);
                    } else {
                      const addr = savedAddresses.find((a) => a.id === val);
                      if (addr) handleSelectAddressForSearch(addr, true);
                    }
                  }}
                  style={{ minWidth: 160, maxWidth: 280 }}
                  popupMatchSelectWidth={false}
                  dropdownRender={(menu) => (
                    <div>
                      {menu}
                      <div
                        style={{
                          padding: '6px 12px',
                          borderTop: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          color: '#4f46e5',
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setIsAddAddressModalOpen(true);
                        }}
                      >
                        + Add Address
                      </div>
                    </div>
                  )}
                  options={[
                    ...savedAddresses.map((addr) => {
                      const icon =
                        (addr.label || '').toLowerCase() === 'home'
                          ? '🏠'
                          : (addr.label || '').toLowerCase() === 'work'
                          ? '🏢'
                          : '📍';
                      return {
                        value: addr.id,
                        label: `${icon} ${addr.label}${addr.is_default ? ' (Default)' : ''} - ${
                          addr.street_area || addr.city || 'Saved Area'
                        }`,
                      };
                    }),
                    ...(selectedAddressId === null && locationName
                      ? [{ value: 'custom_loc', label: `📍 ${locationName}` }]
                      : []),
                  ]}
                />
              ) : (
                <Text strong style={{ color: '#1e293b' }}>
                  {locationName || (isDetectingLocation ? 'Detecting location...' : 'Current Location')}
                </Text>
              )}
              {isDetectingLocation && <Spin size="small" style={{ marginLeft: 4 }} />}
            </Flex>

            <Flex align="center" gap={4}>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <Button
                type="link"
                size="small"
                icon={<AimOutlined />}
                loading={isDetectingLocation}
                onClick={() => {
                  setSelectedAddressId(null);
                  fetchUserLocation(true);
                }}
                style={{ fontWeight: 600, padding: '0 4px', fontSize: 12 }}
              >
                Use Current Location
              </Button>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <Button
                type="link"
                size="small"
                onClick={() => {
                  setSelectedAddressId(null);
                  handleOpenModal();
                }}
                style={{ fontWeight: 700, padding: '0 4px', fontSize: 12 }}
              >
                Change on Map
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </div>

      {/* Main Content Area - Responsive Container */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: screens.xs ? '14px 12px' : screens.md ? '22px 20px' : '28px 24px',
        }}
      >
        {/* Modern E-Commerce Hyperlocal Filter System */}
        <SearchFilterBar
          searchMode={searchMode}
          filters={filters}
          onFilterChange={setFilters}
          onResetFilters={() => setFilters(DEFAULT_FILTERS)}
          totalResults={searchMode === 'shops' ? filteredShops.length : filteredItems.length}
          rawCount={searchMode === 'shops' ? searchMarkers.length : itemListings.length}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />

        {loading ? (
          <Flex justify="center" align="center" style={{ minHeight: '40vh' }}>
            <Spin size="large" tip="Finding nearby listings..." />
          </Flex>
        ) : searchMode === 'shops' ? (
          /* SHOPS VIEW */
          <div>
            <Flex justify="space-between" align="center" wrap="wrap" gap={10} style={{ marginBottom: 16 }}>
              <div>
                <Title
                  level={4}
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    color: '#0f172a',
                    fontSize: screens.xs ? 15 : 18,
                  }}
                >
                  {searchText ? `"${searchText}" near you` : 'Nearby Stores & Outlets'}{' '}
                  <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                    ({filteredShops.length} found)
                  </Text>
                </Title>
              </div>

              <Flex align="center" gap={8}>
                <Button
                  icon={<CompassOutlined />}
                  onClick={handleOpenModal}
                  style={{
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: screens.xs ? 12 : 13,
                    height: screens.xs ? 32 : 36,
                    color: '#4f46e5',
                    borderColor: '#c7d2fe',
                    background: '#eef2ff',
                  }}
                >
                  Map View
                </Button>

                {/* View Mode Switcher */}
                <Segmented
                  size={screens.xs ? 'small' : 'middle'}
                  value={viewMode}
                  onChange={handleViewModeChange}
                  options={[
                    { value: 'grid', icon: <AppstoreOutlined />, label: screens.xs ? undefined : 'Grid' },
                    { value: 'list', icon: <BarsOutlined />, label: screens.xs ? undefined : 'List' },
                  ]}
                  style={{ fontWeight: 600, background: '#f1f5f9' }}
                />
              </Flex>
            </Flex>

            {/* AI Recommendation Highlight Card */}
            {/* {filteredShops.length > 0 && (
              <AiRecommendationCard
                topResult={filteredShops[0]}
                searchMode="shops"
                onClick={() => history.push(`/shop/${filteredShops[0].id}`)}
              />
            )} */}

            {filteredShops.length === 0 ? (
              <Card style={{ borderRadius: 16, textAlign: 'center', padding: '40px 16px', border: '1px solid #e2e8f0' }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    searchMarkers.length > 0
                      ? 'No stores match your selected filters (e.g. radius or category)'
                      : searchError || 'No stores found within this area'
                  }
                >
                  {searchMarkers.length > 0 ? (
                    <Button
                      type="primary"
                      onClick={() => setFilters(DEFAULT_FILTERS)}
                      style={{ borderRadius: 8, fontWeight: 700 }}
                    >
                      Clear Active Filters
                    </Button>
                  ) : (
                    <Button type="primary" onClick={handleOpenModal} style={{ borderRadius: 8, fontWeight: 700 }}>
                      Adjust Location on Map
                    </Button>
                  )}
                </Empty>
              </Card>
            ) : viewMode === 'list' ? (
              /* LIST VIEW FOR SHOPS - Inspiration Data Table on Desktop, Native Cards on Mobile */
              <ShopTableView
                items={filteredShops}
                searchMode="shops"
                onOpenMap={handleOpenModal}
              />
            ) : (
              /* GRID VIEW FOR SHOPS (Perfect 1/2/3 grid alignment across Mobile, Tab, and Desktop) */
              <Row gutter={screens.xs ? [12, 12] : screens.md ? [16, 16] : [24, 24]}>
                {filteredShops.map((shop) => (
                  <Col xs={24} sm={12} md={12} lg={8} key={shop.id}>
                    <ShopCard
                      shopDetails={shop}
                      isChat={user_data?.user_id ? true : false}
                      viewMode="grid"
                    />
                  </Col>
                ))}
              </Row>
            )}
          </div>
        ) : (
          /* ITEMS & SERVICES VIEW */
          <div>
            <Flex justify="space-between" align="center" wrap="wrap" gap={10} style={{ marginBottom: 16 }}>
              <div>
                <Title
                  level={4}
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    color: '#0f172a',
                    fontSize: screens.xs ? 15 : 18,
                  }}
                >
                  {searchText ? `"${searchText}" near you` : 'Matching Products & Services'}{' '}
                  <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                    ({filteredItems.length} found)
                  </Text>
                </Title>
              </div>

              <Flex align="center" gap={8}>
                <Button
                  icon={<CompassOutlined />}
                  onClick={handleOpenModal}
                  style={{
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: screens.xs ? 12 : 13,
                    height: screens.xs ? 32 : 36,
                    color: '#4f46e5',
                    borderColor: '#c7d2fe',
                    background: '#eef2ff',
                  }}
                >
                  Map View
                </Button>

                {/* View Mode Switcher */}
                <Segmented
                  size={screens.xs ? 'small' : 'middle'}
                  value={viewMode}
                  onChange={handleViewModeChange}
                  options={[
                    { value: 'grid', icon: <AppstoreOutlined />, label: screens.xs ? undefined : 'Grid' },
                    { value: 'list', icon: <BarsOutlined />, label: screens.xs ? undefined : 'List' },
                  ]}
                  style={{ fontWeight: 600, background: '#f1f5f9' }}
                />
              </Flex>
            </Flex>

            {/* AI Recommendation Highlight Card */}
            {/* {filteredItems.length > 0 && (
              <AiRecommendationCard
                topResult={filteredItems[0]}
                searchMode="items"
                onClick={() => {
                  addItem(filteredItems[0].shop, filteredItems[0]);
                  openCart();
                }}
              />
            )} */}

            {filteredItems.length === 0 ? (
              <Card style={{ borderRadius: 16, textAlign: 'center', padding: '40px 16px', border: '1px solid #e2e8f0' }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    itemListings.length > 0
                      ? 'No products match your selected filters (e.g. price range or radius)'
                      : searchError || 'No matching items found'
                  }
                >
                  {itemListings.length > 0 ? (
                    <Button
                      type="primary"
                      onClick={() => setFilters(DEFAULT_FILTERS)}
                      style={{ borderRadius: 8, fontWeight: 700 }}
                    >
                      Clear Active Filters
                    </Button>
                  ) : (
                    <Button type="primary" onClick={() => setSearchMode('shops')} style={{ borderRadius: 8, fontWeight: 700 }}>
                      Browse All Stores Instead
                    </Button>
                  )}
                </Empty>
              </Card>
            ) : viewMode === 'list' ? (
              /* LIST VIEW FOR ITEMS & SERVICES - Table View on Desktop, Native Cards on Mobile */
              <ShopTableView
                items={filteredItems}
                searchMode="items"
                onOpenMap={handleOpenModal}
              />
            ) : (
              /* GRID VIEW FOR ITEMS & SERVICES */
              <Row gutter={screens.xs ? [12, 12] : screens.md ? [16, 16] : [24, 24]}>
                {filteredItems.map((item) => (
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
                      styles={{
                        body: {
                          padding: screens.xs ? 14 : 16,
                          display: 'flex',
                          flexDirection: 'column',
                          height: '100%',
                        },
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
                        {item.shop?.distance !== undefined && item.shop?.distance !== null && (
                          <span style={{ color: '#10b981', fontWeight: 600, marginLeft: 6 }}>
                            • {distanceConvertor(item.shop.distance)} km
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

        {/* Verified Trust Banner matching screenshot */}
        <TrustBanner />
      </div>

      {/* Full View Map Modal */}
      <Modal
        open={isModalVisible}
        onCancel={handleCloseModal}
        footer={null}
        width="100vw"
        wrapClassName="full-view-map-modal"
        closable={false}
        style={{
          top: 0,
          left: 0,
          margin: 0,
          padding: 0,
          maxWidth: '100vw',
          height: '100vh',
        }}
        styles={{
          body: {
            height: '100vh',
            padding: 0,
            margin: 0,
            overflow: 'hidden',
          },
        }}
      >
        <LeafletComponent
          isModalVisible={isModalVisible}
          markerLocation={markerLocation}
          setMarkerLocation={setMarkerLocation}
          updateMarker={updateMarker}
          searchMarkers={searchMode === 'shops' ? filteredShops : searchMarkers}
          position={position}
          setPosition={setPosition}
          onClose={handleCloseModal}
        />
      </Modal>

      {/* Quick Add Address Modal from Home Search */}
      {isAddAddressModalOpen && (
        <AddressModal
          open={isAddAddressModalOpen}
          onClose={() => setIsAddAddressModalOpen(false)}
          onSuccess={handleNewAddressCreated}
          userProfile={user_data}
        />
      )}

      {/* Voice Search Recognition Modal */}
      <VoiceSearchModal
        open={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSearch={(query) => {
          setSearchText(query);
          handleSearch(query);
        }}
      />

      {/* Visual Image Search Modal */}
      <ImageSearchModal
        open={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onSearch={(query) => {
          setSearchText(query);
          handleSearch(query);
        }}
      />

      {/* AI Smart Search Natural Language Parsing Modal */}
      <AiSearchModal
        open={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onAiApply={handleAiApply}
      />
    </div>
  );
};

export default HomeScreen;
