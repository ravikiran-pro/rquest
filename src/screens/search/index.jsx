import React, { useEffect, useState, useMemo } from 'react';
import {
  Button,
  Col,
  Row,
  Spin,
  Empty,
  Flex,
  Grid,
  Modal,
  message,
  Drawer,
  Popover,
} from 'antd';
import {
  SearchOutlined,
  EnvironmentOutlined,
  AimOutlined,
  CompassOutlined,
  ArrowLeftOutlined,
  AppstoreOutlined,
  BarsOutlined,
  FilterOutlined,
  CheckOutlined,
  DownOutlined,
  AudioOutlined,
  CameraOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import {
  LeafletComponent,
  ShopCard,
  ShopTableView,
  AddressModal,
  DEFAULT_FILTERS,
  applySearchFilters,
  countActiveFilters,
  matchesCategoryFilter,
  FILTER_CATEGORIES,
  VoiceSearchModal,
  ImageSearchModal,
  AiSearchModal,
  OfferingCard,
  FilterSidebar,
} from '../../app/components';
import {
  getLocationName,
  getPreciseUserLocation,
  netWorkCall,
} from '../../app/utils/helper';
import { apiConfig, getAvailableFilters } from '../../app/utils';
import { useGlobalStore, useCartStore } from '../../app/services';
import { useHistory, useLocation, Link } from 'react-router-dom';
import { radii } from '../../app/styles';
import Routes from '../../app/routes/routes';

const RADIUS_PRESETS = [
  { label: '1 km walking', val: 1 },
  { label: '2 km neighborhood', val: 2 },
  { label: '5 km cycling', val: 5 },
  { label: '10 km citywide', val: 10 },
  { label: 'All distances', val: null },
];

const SearchScreen = () => {
  const history = useHistory();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const { user_data } = useGlobalStore((state) => state);
  const { addItem, openCart } = useCartStore((state) => state);

  // Parse Initial URL Query Params
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialQ = queryParams.get('q') || '';
  const initialCat = queryParams.get('category');
  const initialMode = queryParams.get('mode') === 'items' ? 'items' : 'shops';
  const initialRadius = queryParams.get('radius') ? Number(queryParams.get('radius')) : 2;

  const [searchText, setSearchText] = useState(initialQ);
  const [searchMode, setSearchMode] = useState(initialMode);
  const [filters, setFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
    maxDistance: initialRadius,
    categories: initialCat ? [initialCat] : [],
  }));

  const [searchError, setSearchError] = useState('');
  const [visibleCount, setVisibleCount] = useState(18);
  const [isMobileFilterDrawerOpen, setIsMobileFilterDrawerOpen] = useState(false);
  const [isRadiusPopoverOpen, setIsRadiusPopoverOpen] = useState(false);

  // View Mode: 'grid' or 'list'
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('rquest_view_mode') || 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('rquest_view_mode', mode);
    } catch {
      // ignore storage err
    }
  };

  // Smart Search Modals
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

  // Listen to URL changes (e.g. Back button or new category redirects)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qParam = params.get('q');
    const catParam = params.get('category');
    const modeParam = params.get('mode');
    const radParam = params.get('radius');

    if (qParam !== null) setSearchText(qParam);
    if (modeParam === 'shops' || modeParam === 'items') setSearchMode(modeParam);

    setFilters((prev) => ({
      ...prev,
      categories: catParam ? [catParam] : prev.categories,
      maxDistance: radParam ? Number(radParam) : prev.maxDistance,
    }));
  }, [location.search]);

  // Location handling
  const getSavedLocation = () => {
    try {
      const saved = localStorage.getItem('rquest_user_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.coords) && parsed.coords.length === 2) {
          const isMockDefault =
            Math.abs(parsed.coords[0] - 12.9631025) < 0.0001 &&
            Math.abs(parsed.coords[1] - 80.25476) < 0.0001;
          if (!isMockDefault) return parsed;
        }
      }
    } catch {
      // ignore storage err
    }
    return null;
  };

  const initialLoc = getSavedLocation();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [markerLocation, setMarkerLocation] = useState(
    initialLoc?.coords || [12.9352, 77.6245]
  );
  const [position, setPosition] = useState(
    initialLoc?.coords || [12.9352, 77.6245]
  );
  const [locationName, setLocationName] = useState(
    initialLoc?.name || 'Koramangala 4th Block, Bengaluru'
  );
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [searchMarkers, setSearchMarkers] = useState([]);
  const [itemListings, setItemListings] = useState([]);
  const [filterFields, setFilterFields] = useState([]);
  const [loading, setLoading] = useState(false);

  // User Saved Addresses
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
      console.warn('Error fetching addresses on search:', err);
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
      localStorage.setItem('rquest_user_location', JSON.stringify({ coords, name }));
    } catch {
      // ignore
    }
  };

  const updateMarker = (marker) => {
    setMarkerLocation(marker);
    setPosition(marker);
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
      console.warn('Geolocation error:', error);
      if (error?.isPermissionDenied) {
        message.error(
          'Location access is blocked in your browser. Please allow location access in your address bar or search on the map.',
          6
        );
      } else if (isUserTriggered) {
        message.warning('Could not detect exact location. You can choose on the map.');
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
        if (!cancelled && name) {
          setLocationName(name);
          saveLocation([lat, lng], name);
        }
      } catch {
        if (!cancelled) setLocationName('Koramangala 4th Block, Bengaluru');
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
          : [12.9352, 77.6245];

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
          const body = JSON.stringify({
            lat: coords[0],
            lon: coords[1],
            search: searchText || '',
            limit: 200,
          });

          const response = await netWorkCall(apiConfig.listings_search, 'POST', body, false);
          if (!isCancelled && response?.data) {
            const offeredFields = Array.isArray(response.filter_fields) ? response.filter_fields : [];
            setFilterFields(offeredFields);
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

  // Category counts computed for the sidebar
  const categoryCounts = useMemo(() => {
    const counts = {};
    const rawList = searchMode === 'shops' ? searchMarkers : itemListings;
    const facetedList = applySearchFilters(rawList, { ...filters, categories: [] }, searchMode);
    facetedList.forEach((item) => {
      FILTER_CATEGORIES.forEach((cat) => {
        if (matchesCategoryFilter(item, cat.id, searchMode)) {
          counts[cat.id] = (counts[cat.id] || 0) + 1;
        }
      });
    });
    return counts;
  }, [searchMode, searchMarkers, itemListings, filters]);

  const availableFieldFilters = useMemo(() => {
    if (searchMode !== 'items' || filterFields.length === 0) return [];
    const itemsBeforeFieldFilters = applySearchFilters(itemListings, { ...filters, fields: {} }, 'items');
    return getAvailableFilters(filterFields, itemsBeforeFieldFilters);
  }, [searchMode, filterFields, itemListings, filters]);

  // Active filter tags for the dismissible tag strip
  const activeFilterTags = useMemo(() => {
    const tags = [];
    if (filters.maxDistance !== null && filters.maxDistance !== undefined) {
      tags.push({
        key: 'distance',
        label: `Within ${filters.maxDistance} km`,
        onRemove: () => setFilters((prev) => ({ ...prev, maxDistance: null })),
      });
    }
    if (filters.categories && filters.categories.length > 0) {
      filters.categories.forEach((catId) => {
        const cat = FILTER_CATEGORIES.find((c) => c.id === catId);
        tags.push({
          key: `cat-${catId}`,
          label: cat?.label || catId,
          onRemove: () =>
            setFilters((prev) => ({
              ...prev,
              categories: prev.categories.filter((id) => id !== catId),
            })),
        });
      });
    }
    if (searchMode === 'items' && (filters.minPrice !== null || filters.maxPrice !== null)) {
      tags.push({
        key: 'price',
        label: `₹${filters.minPrice || 0} - ₹${filters.maxPrice || '1,000+'}`,
        onRemove: () => setFilters((prev) => ({ ...prev, minPrice: null, maxPrice: null })),
      });
    }
    if (filters.minRating !== null && filters.minRating !== undefined) {
      tags.push({
        key: 'rating',
        label: `★ ${filters.minRating}+`,
        onRemove: () => setFilters((prev) => ({ ...prev, minRating: null })),
      });
    }
    if (filters.onlyAvailable) {
      tags.push({
        key: 'available',
        label: 'Physical Shelf Stock',
        onRemove: () => setFilters((prev) => ({ ...prev, onlyAvailable: false })),
      });
    }
    return tags;
  }, [filters, searchMode]);

  const currentResults = searchMode === 'shops' ? filteredShops : filteredItems;
  const totalCount = currentResults.length;
  const visibleItems = currentResults.slice(0, visibleCount);
  const activeFiltersCount = countActiveFilters(filters, searchMode);

  const cleanAreaName = useMemo(() => {
    if (!locationName) return 'Koramangala';
    return locationName.split(',')[0].trim();
  }, [locationName]);

  const handleSearchSubmit = () => {
    setVisibleCount(18);
  };

  return (
    <div style={{ minHeight: '100%', background: '#FDF9F4', color: '#1C1C19', padding: isMobile ? '16px 12px 40px' : '24px 28px 60px' }}>
      <div style={{ maxWidth: 1680, width: '100%', margin: '0 auto' }}>
        {/* Navigation Breadcrumb & Page Header */}
        <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
          <Link
            to={Routes.home}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: '#0B2D6B',
              fontWeight: 700,
              fontSize: 13.5,
              textDecoration: 'none',
            }}
          >
            <ArrowLeftOutlined style={{ fontSize: 13 }} />
            <span>Back to Home</span>
          </Link>
          <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 600 }}>
            {totalCount} {searchMode === 'shops' ? 'stores' : 'items'} found near {cleanAreaName}
          </div>
        </Flex>

        {/* Live Search & Filter Bar */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #ECE7DF',
            borderRadius: 20,
            padding: isMobile ? '14px 14px' : '16px 20px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            marginBottom: 20,
          }}
        >
          {/* Top Row: Search Input + Radius + Modals */}
          <div
            className="rquest-search-pill"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? 8 : 12,
              background: '#F8F4EF',
              border: '1px solid #E5E7EB',
              borderRadius: radii.full,
              padding: isMobile ? '4px 6px 4px 12px' : '5px 8px 5px 16px',
              marginBottom: 14,
            }}
          >
            {/* Radius Selector */}
            <Popover
              trigger="click"
              open={isRadiusPopoverOpen}
              onOpenChange={setIsRadiusPopoverOpen}
              placement="bottomLeft"
              content={
                <div style={{ width: 230, padding: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 8, padding: '0 4px' }}>
                    Walking & Delivery Radius
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {RADIUS_PRESETS.map((item) => {
                      const isSelected = (filters.maxDistance ?? null) === item.val;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            setFilters((prev) => ({ ...prev, maxDistance: item.val }));
                            setIsRadiusPopoverOpen(false);
                          }}
                          style={{
                            textAlign: 'left',
                            padding: '7px 10px',
                            borderRadius: radii.md,
                            border: 'none',
                            background: isSelected ? '#EFF6FF' : 'transparent',
                            color: isSelected ? '#0B2D6B' : '#374151',
                            fontWeight: isSelected ? 700 : 500,
                            fontSize: 13,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span>{item.label}</span>
                          {isSelected && <CheckOutlined style={{ color: '#0B2D6B', fontSize: 12 }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              }
            >
              <button
                type="button"
                style={{
                  background: 'transparent',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: isMobile ? 12 : 13.5,
                  fontWeight: 600,
                  color: '#111827',
                  cursor: 'pointer',
                  padding: '4px 0',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <CompassOutlined style={{ color: '#0B2D6B', fontSize: 15 }} />
                <span>{filters.maxDistance ? `${filters.maxDistance} km` : 'All distances'}</span>
                <DownOutlined style={{ fontSize: 10, color: '#6B7280' }} />
              </button>
            </Popover>

            <div style={{ width: 1, height: 24, background: '#E5E7EB', flexShrink: 0 }} />

            {/* Keyword Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <SearchOutlined style={{ color: '#9CA3AF', fontSize: 16, flexShrink: 0 }} />
              <input
                type="text"
                className="rquest-search-input"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                placeholder={
                  searchMode === 'shops'
                    ? "Search stores — 'bakery', 'hardware', 'kirana'..."
                    : "Search items & services — 'sourdough', 'pipe repair'..."
                }
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: isMobile ? 13 : 14.5,
                  color: '#111827',
                  width: '100%',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => setSearchText('')}
                  style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 2 }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Smart Search Buttons: Voice, Image, AI */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setIsVoiceModalOpen(true)}
                title="Voice Search"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#6B7280',
                  cursor: 'pointer',
                  padding: 6,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AudioOutlined style={{ fontSize: 15 }} />
              </button>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(true)}
                title="Image Search"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#6B7280',
                  cursor: 'pointer',
                  padding: 6,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CameraOutlined style={{ fontSize: 15 }} />
              </button>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                title="AI Smart Search"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#0159C5',
                  cursor: 'pointer',
                  padding: 6,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RobotOutlined style={{ fontSize: 15 }} />
              </button>
            </div>

            {/* Submit Arrow */}
            <button
              type="button"
              onClick={handleSearchSubmit}
              style={{
                width: isMobile ? 34 : 38,
                height: isMobile ? 34 : 38,
                borderRadius: '50%',
                background: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              <SearchOutlined />
            </button>
          </div>

          {/* Controls Row: Mode switch, Location pin, View mode, Mobile filter */}
          <Flex justify="space-between" align="center" wrap="wrap" gap={10}>
            <Flex align="center" gap={8} wrap="wrap">
              {/* Stores vs Items Mode Switcher */}
              <div
                style={{
                  display: 'inline-flex',
                  background: '#F1EDE8',
                  borderRadius: 9999,
                  padding: 3,
                }}
              >
                <button
                  type="button"
                  onClick={() => setSearchMode('shops')}
                  style={{
                    background: searchMode === 'shops' ? '#0B2D6B' : 'transparent',
                    color: searchMode === 'shops' ? '#FFFFFF' : '#111827',
                    border: 'none',
                    borderRadius: 9999,
                    padding: '6px 14px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  🏪 Stores &amp; Outlets ({filteredShops.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMode('items')}
                  style={{
                    background: searchMode === 'items' ? '#0B2D6B' : 'transparent',
                    color: searchMode === 'items' ? '#FFFFFF' : '#111827',
                    border: 'none',
                    borderRadius: 9999,
                    padding: '6px 14px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  🛍 Items &amp; Services ({filteredItems.length})
                </button>
              </div>

              {/* Geolocation Pin Pill */}
              <button
                type="button"
                onClick={() => setIsModalVisible(true)}
                style={{
                  background: '#F8F4EF',
                  border: '1px solid #ECE7DF',
                  borderRadius: 9999,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#111827',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <EnvironmentOutlined style={{ color: '#0B2D6B' }} />
                <span>{cleanAreaName}</span>
                {isDetectingLocation ? (
                  <Spin size="small" />
                ) : (
                  <span style={{ color: '#0159C5', fontWeight: 700 }}>· Change</span>
                )}
                {savedAddresses.length > 0 && (
                  <span style={{ fontSize: 10.5, color: '#64748B', fontWeight: 500 }}>
                    ({savedAddresses.length} saved)
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => fetchUserLocation(true)}
                title="Detect precise location"
                style={{
                  background: '#F8F4EF',
                  border: '1px solid #ECE7DF',
                  borderRadius: 9999,
                  padding: '6px 10px',
                  fontSize: 12,
                  color: '#0B2D6B',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <AimOutlined />
                <span>Nearby</span>
              </button>

              {/* Mobile Filters Trigger */}
              {isMobile && (
                <button
                  type="button"
                  onClick={() => setIsMobileFilterDrawerOpen(true)}
                  style={{
                    background: activeFiltersCount > 0 ? '#EFF6FF' : '#F8F4EF',
                    border: `1px solid ${activeFiltersCount > 0 ? '#BFDBFE' : '#ECE7DF'}`,
                    borderRadius: 9999,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: activeFiltersCount > 0 ? '#1E40AF' : '#111827',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <FilterOutlined />
                  <span>Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}</span>
                </button>
              )}
            </Flex>

            {/* Right Controls: View Mode & Reset */}
            <Flex align="center" gap={8}>
              <div
                style={{
                  display: 'inline-flex',
                  background: '#F1EDE8',
                  borderRadius: radii.md,
                  padding: 2,
                }}
              >
                <button
                  type="button"
                  onClick={() => handleViewModeChange('grid')}
                  title="Grid View"
                  style={{
                    background: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
                    color: viewMode === 'grid' ? '#0B2D6B' : '#64748B',
                    border: 'none',
                    borderRadius: radii.xs,
                    padding: '5px 8px',
                    cursor: 'pointer',
                  }}
                >
                  <AppstoreOutlined style={{ fontSize: 14 }} />
                </button>
                <button
                  type="button"
                  onClick={() => handleViewModeChange('list')}
                  title="List View"
                  style={{
                    background: viewMode === 'list' ? '#FFFFFF' : 'transparent',
                    color: viewMode === 'list' ? '#0B2D6B' : '#64748B',
                    border: 'none',
                    borderRadius: radii.xs,
                    padding: '5px 8px',
                    cursor: 'pointer',
                  }}
                >
                  <BarsOutlined style={{ fontSize: 14 }} />
                </button>
              </div>

              {(activeFiltersCount > 0 || searchText) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchText('');
                    setFilters(DEFAULT_FILTERS);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748B',
                    fontSize: 12.5,
                    cursor: 'pointer',
                    padding: '4px 6px',
                  }}
                >
                  Reset all ✕
                </button>
              )}
            </Flex>
          </Flex>

          {/* Active Filter Tags */}
          {activeFilterTags.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B' }}>Active filters:</span>
              {activeFilterTags.map((tag) => (
                <span
                  key={tag.key}
                  style={{
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: 9999,
                    padding: '2px 8px 2px 10px',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: '#1E40AF',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>{tag.label}</span>
                  <button
                    type="button"
                    onClick={tag.onRemove}
                    style={{ background: 'none', border: 'none', color: '#1E40AF', cursor: 'pointer', padding: 0 }}
                  >
                    ✕
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_FILTERS)}
                style={{ background: 'none', border: 'none', color: '#0159C5', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Results Grid with Sidebar */}
        <Row gutter={isMobile ? [0, 16] : [24, 24]}>
          {!isMobile && (
            <Col md={8} lg={7} xl={6} xxl={5}>
              <FilterSidebar
                filters={filters}
                onFilterChange={setFilters}
                onResetFilters={() => setFilters(DEFAULT_FILTERS)}
                searchMode={searchMode}
                categoryCounts={categoryCounts}
                fieldFilters={availableFieldFilters}
              />
            </Col>
          )}

          <Col xs={24} md={16} lg={17} xl={18} xxl={19}>
            {loading ? (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <Spin size="large" />
                <div style={{ marginTop: 12, color: '#64748B', fontSize: 13 }}>Scanning neighborhood radius...</div>
              </div>
            ) : visibleItems.length === 0 ? (
              <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #ECE7DF', padding: '48px 20px', textAlign: 'center' }}>
                <Empty
                  description={
                    <div>
                      <div style={{ fontWeight: 700, color: '#111827', fontSize: 16, marginBottom: 6 }}>
                        {searchError || 'No matching stores or items in this radius'}
                      </div>
                      <div style={{ color: '#64748B', fontSize: 13 }}>
                        Try expanding your search radius to 10 km or clearing filters.
                      </div>
                    </div>
                  }
                />
                <Flex justify="center" gap={10} style={{ marginTop: 16 }}>
                  <Button
                    type="primary"
                    onClick={() => setFilters((prev) => ({ ...prev, maxDistance: 10, categories: [] }))}
                    style={{ borderRadius: radii.md }}
                  >
                    Expand Radius to 10 km
                  </Button>
                  <Button
                    onClick={() => {
                      setSearchText('');
                      setFilters(DEFAULT_FILTERS);
                    }}
                    style={{ borderRadius: radii.md }}
                  >
                    Clear All Filters
                  </Button>
                </Flex>
              </div>
            ) : viewMode === 'list' ? (
              <ShopTableView
                shops={visibleItems}
                userLocation={markerLocation}
                onRowClick={(shop) => history.push(`/shop/${shop.id}`)}
              />
            ) : (
              <Row gutter={[20, 20]}>
                {searchMode === 'shops'
                  ? visibleItems.map((shop) => (
                      <Col xs={24} sm={12} md={24} lg={12} xl={8} xxl={8} key={shop.id}>
                        <ShopCard shopDetails={shop} shop={shop} />
                      </Col>
                    ))
                  : visibleItems.map((item) => (
                      <Col xs={24} sm={12} md={24} lg={12} xl={8} xxl={8} key={item.id}>
                        <OfferingCard
                          item={item}
                          onAddToCart={(it) => {
                            addItem(it);
                            openCart();
                          }}
                        />
                      </Col>
                    ))}
              </Row>
            )}

            {/* Pagination Load More */}
            {visibleItems.length < totalCount && (
              <div style={{ textAlign: 'center', marginTop: 28 }}>
                <Button
                  size="large"
                  onClick={() => setVisibleCount((prev) => prev + 18)}
                  style={{
                    borderRadius: radii.full,
                    padding: '0 28px',
                    fontWeight: 700,
                    borderColor: '#E5E7EB',
                  }}
                >
                  Load More Results ({totalCount - visibleItems.length} remaining)
                </Button>
              </div>
            )}
          </Col>
        </Row>
      </div>

      {/* Modals */}
      {/* 1. Leaflet Interactive Map Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EnvironmentOutlined style={{ color: '#0B2D6B' }} />
            <span>Select Your Neighborhood Location</span>
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={720}
        destroyOnHidden
      >
        <div style={{ height: 420, width: '100%', marginTop: 12 }}>
          <LeafletComponent
            markerLocation={markerLocation}
            updateMarker={updateMarker}
            position={position}
            searchMarkers={searchMarkers}
            radius={filters.maxDistance}
          />
        </div>
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12.5, color: '#64748B' }}>
            Current: <strong>{locationName || 'Selected coordinates'}</strong>
          </div>
          <Button
            type="primary"
            onClick={() => setIsModalVisible(false)}
            style={{ borderRadius: radii.md }}
          >
            Apply Location
          </Button>
        </div>
      </Modal>

      {/* 2. Voice Search Modal */}
      <VoiceSearchModal
        open={isVoiceModalOpen}
        visible={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSearch={(transcript) => {
          setSearchText(transcript);
          setIsVoiceModalOpen(false);
        }}
      />

      {/* 3. Image Search Modal */}
      <ImageSearchModal
        open={isImageModalOpen}
        visible={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onSearch={(term) => {
          setSearchText(term);
          setIsImageModalOpen(false);
        }}
        onSelect={(term) => {
          setSearchText(term);
          setIsImageModalOpen(false);
        }}
      />

      {/* 4. AI Smart Search Modal */}
      <AiSearchModal
        open={isAiModalOpen}
        visible={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onAiApply={handleAiApply}
        onApply={handleAiApply}
      />

      {/* 5. Address Manager Modal */}
      <AddressModal
        open={isAddAddressModalOpen}
        visible={isAddAddressModalOpen}
        onClose={() => setIsAddAddressModalOpen(false)}
        onSuccess={handleNewAddressCreated}
        initialCoords={markerLocation}
      />

      {/* 6. Mobile Filter Drawer */}
      <Drawer
        title="Filter Listings"
        placement="bottom"
        height="80%"
        open={isMobileFilterDrawerOpen}
        onClose={() => setIsMobileFilterDrawerOpen(false)}
      >
        <FilterSidebar
          filters={filters}
          onFilterChange={setFilters}
          onResetFilters={() => setFilters(DEFAULT_FILTERS)}
          searchMode={searchMode}
          categoryCounts={categoryCounts}
          fieldFilters={availableFieldFilters}
        />
        <div style={{ marginTop: 20 }}>
          <Button
            type="primary"
            block
            onClick={() => setIsMobileFilterDrawerOpen(false)}
            style={{ borderRadius: radii.md }}
          >
            Apply Filters ({totalCount} results)
          </Button>
        </div>
      </Drawer>
    </div>
  );
};

export default SearchScreen;
