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
  Select,
  Drawer,
} from 'antd';
import {
  SearchOutlined,
  EnvironmentOutlined,
  AimOutlined,
  AppstoreOutlined,
  BarsOutlined,
  AudioOutlined,
  CameraOutlined,
  CompassOutlined,
  FilterOutlined,
  CloseCircleOutlined,
  SafetyCertificateOutlined,
  CheckOutlined,
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
import { useHistory, useLocation } from 'react-router-dom';
import { colors, radii, shadows } from '../../app/styles';

const RADIUS_PRESETS = [
  { label: '1 km', fullLabel: 'Within 1 km', val: 1 },
  { label: '2 km', fullLabel: 'Within 2 km', val: 2 },
  { label: '5 km', fullLabel: 'Within 5 km', val: 5 },
  { label: '10 km', fullLabel: 'Within 10 km', val: 10 },
  { label: 'All', fullLabel: 'All Distances', val: null },
];

const HomeScreen = () => {
  const history = useHistory();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const { user_data } = useGlobalStore((state) => state);
  const { addItem, openCart } = useCartStore((state) => state);

  const [searchText, setSearchText] = useState('');
  const [searchMode, setSearchMode] = useState('items'); // 'shops' or 'items'
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, maxDistance: 2 });
  const [searchError, setSearchError] = useState('');
  const [visibleCount, setVisibleCount] = useState(18);
  const [isMobileFilterDrawerOpen, setIsMobileFilterDrawerOpen] = useState(false);

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
      const modeParam = params.get('mode');
      if (qParam) {
        setSearchText(qParam);
      }
      if (catParam) {
        setFilters((prev) => ({
          ...prev,
          categories: [catParam],
        }));
      }
      if (modeParam === 'shops' || modeParam === 'items') {
        setSearchMode(modeParam);
      }
    }
  }, [location.search]);

  const getSavedLocation = () => {
    try {
      const saved = localStorage.getItem('rquest_user_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.coords) && parsed.coords.length === 2) {
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
  // Custom-field filters the server offers for the current item results
  const [filterFields, setFilterFields] = useState([]);
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
    setVisibleCount(18);
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

  // Reset pagination when query or mode changes
  useEffect(() => {
    setVisibleCount(18);
  }, [searchText, searchMode]);

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
            limit: 200,
          });

          const response = await netWorkCall(apiConfig.listings_search, 'POST', body, false);
          if (!isCancelled && response?.data) {
            const offeredFields = Array.isArray(response.filter_fields) ? response.filter_fields : [];
            setFilterFields(offeredFields);
            // Drop custom-field filters the new results no longer offer
            setFilters((prev) => {
              const kept = Object.fromEntries(
                Object.entries(prev.fields || {}).filter(([key]) =>
                  offeredFields.some((field) => field.key === key)
                )
              );
              return Object.keys(kept).length === Object.keys(prev.fields || {}).length
                ? prev
                : { ...prev, fields: kept };
            });
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

  // Category counts computed for the sidebar (respecting active radius, price, rating, and availability filters)
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

  // Count active verified neighborhood merchants within the filtered results / radius
  const activeMerchantCount = useMemo(() => {
    if (searchMode === 'shops') {
      return new Set(filteredShops.map((s) => s.id).filter(Boolean)).size;
    }
    return new Set(filteredItems.map((i) => i.shop?.id || i.shop_id).filter(Boolean)).size;
  }, [searchMode, filteredShops, filteredItems]);

  // Custom-field filters worth showing: only fields and values present in the
  // items left after every other filter (distance, price, rating...)
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
    if (searchMode === 'items') {
      Object.entries(filters.fields || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        const label = filterFields.find((field) => field.key === key)?.label || key;
        tags.push({
          key: `field-${key}`,
          label: value === true ? label : `${label}: ${value}`,
          onRemove: () =>
            setFilters((prev) => {
              const next = { ...(prev.fields || {}) };
              delete next[key];
              return { ...prev, fields: next };
            }),
        });
      });
    }
    if (filters.verifiedToday) {
      tags.push({
        key: 'verifiedToday',
        label: 'Verified in Store Today',
        onRemove: () => setFilters((prev) => ({ ...prev, verifiedToday: false })),
      });
    }
    if (filters.immediatePickup) {
      tags.push({
        key: 'immediatePickup',
        label: 'Ready for Immediate Pickup',
        onRemove: () => setFilters((prev) => ({ ...prev, immediatePickup: false })),
      });
    }
    if (filters.sortBy && filters.sortBy !== 'distance_asc') {
      const sortLabels = {
        price_asc: 'Price: Low to High',
        price_desc: 'Price: High to Low',
        rating_desc: 'Highest Rated',
        name_asc: 'Name (A to Z)',
      };
      tags.push({
        key: 'sort',
        label: sortLabels[filters.sortBy] || filters.sortBy,
        onRemove: () => setFilters((prev) => ({ ...prev, sortBy: 'distance_asc' })),
      });
    }
    return tags;
  }, [filters, searchMode, filterFields]);

  const currentResults = searchMode === 'shops' ? filteredShops : filteredItems;
  const totalCount = currentResults.length;
  const visibleItems = currentResults.slice(0, visibleCount);
  const activeFiltersCount = countActiveFilters(filters, searchMode);

  return (
    <div style={{ minHeight: '100%', background: colors.bg, paddingBottom: isMobile ? 84 : 60 }}>
      {/* Top Section: Segmented Switcher, Omnisearch Bar, Geofence Sub-bar */}
      <div
        style={{
          background: colors.bg,
          borderBottom: `1px solid ${colors.border}`,
          padding: isMobile ? '12px 14px 10px' : '22px 24px 18px',
        }}
      >
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          {/* Row 1: Segmented Switcher & Neighborhood Beacon */}
          <Flex
            justify="space-between"
            align="center"
            wrap="wrap"
            gap={10}
            style={{ marginBottom: isMobile ? 10 : 14 }}
          >
            {/* Segmented Switcher: [ Items & Services ] [ Stores & Outlets ] */}
            <div
              style={{
                display: 'flex',
                width: isMobile ? '100%' : 'auto',
                background: colors.surfaceContainer,
                borderRadius: radii.full,
                padding: 3,
                border: `1px solid ${colors.border}`,
              }}
            >
              <button
                type="button"
                onClick={() => setSearchMode('items')}
                style={{
                  flex: isMobile ? 1 : 'initial',
                  background: searchMode === 'items' ? colors.primary : 'transparent',
                  color: searchMode === 'items' ? colors.white : colors.textMain,
                  border: 'none',
                  borderRadius: radii.full,
                  padding: isMobile ? '7px 0' : '7px 18px',
                  fontSize: isMobile ? 12.5 : 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.18s ease',
                }}
              >
                <span>🛍</span> Items & Services
              </button>

              <button
                type="button"
                onClick={() => setSearchMode('shops')}
                style={{
                  flex: isMobile ? 1 : 'initial',
                  background: searchMode === 'shops' ? colors.primary : 'transparent',
                  color: searchMode === 'shops' ? colors.white : colors.textMain,
                  border: 'none',
                  borderRadius: radii.full,
                  padding: isMobile ? '7px 0' : '7px 18px',
                  fontSize: isMobile ? 12.5 : 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.18s ease',
                }}
              >
                <span>🏪</span> Stores & Outlets
              </button>
            </div>

            {/* Merchant Beacon on Right (Desktop only to prevent clutter on mobile) */}
            {!isMobile && (
              <Flex align="center" gap={8} style={{ fontSize: 13, color: colors.textMuted }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: colors.semantic.success,
                    boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)',
                  }}
                />
                <span>
                  <strong style={{ color: colors.textMain }}>{activeMerchantCount}</strong>{' '}
                  verified neighborhood merchants active in radius
                </span>
              </Flex>
            )}
          </Flex>

          {/* Row 2: Omnisearch Single Card */}
          <div
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.xl,
              boxShadow: shadows.sm,
              padding: isMobile ? '6px 10px' : '6px 8px 6px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
            }}
          >
            <SearchOutlined style={{ fontSize: 17, color: colors.textLight, flexShrink: 0 }} />

            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchText)}
              placeholder={
                searchMode === 'shops'
                  ? 'Search stores by name, area...'
                  : 'Milk, biryani, AC repair...'
              }
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: isMobile ? 13 : 14.5,
                color: colors.textMain,
                fontFamily: 'Inter, sans-serif',
                minWidth: 0,
              }}
            />

            {/* Voice Search Button */}
            <button
              type="button"
              onClick={() => setIsVoiceModalOpen(true)}
              title="Voice Search"
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.textMuted,
                fontSize: 16,
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: radii.md,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AudioOutlined />
            </button>

            {/* Camera / Image Search Button */}
            <button
              type="button"
              onClick={() => setIsImageModalOpen(true)}
              title="Image Search"
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.textMuted,
                fontSize: 16,
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: radii.md,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CameraOutlined />
            </button>

            {/* Embedded AI Smart Finder Button (+ AI on mobile) */}
            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              style={{
                background: '#EEF2FF',
                border: '1px solid #C7D2FE',
                borderRadius: radii.full,
                color: '#4338CA',
                padding: isMobile ? '4px 10px' : '6px 14px',
                fontSize: isMobile ? 11.5 : 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <span>✨</span>
              <span>{isMobile ? '+ AI' : 'AI Smart Finder'}</span>
            </button>

            {/* Find Nearby Primary CTA (Desktop only) */}
            {!isMobile && (
              <button
                type="button"
                onClick={() => handleSearch(searchText)}
                style={{
                  background: colors.primary,
                  color: colors.white,
                  border: 'none',
                  borderRadius: radii.md,
                  padding: '9px 22px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  boxShadow: '0 1px 3px rgba(11, 45, 107, 0.25)',
                }}
              >
                Find Nearby <span style={{ fontSize: 13 }}>→</span>
              </button>
            )}
          </div>

          {/* Row 3: Locality & Radius pills row */}
          {isMobile ? (
            /* Mobile Scrollable Strip */
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                overflowX: 'auto',
                paddingTop: 10,
                paddingBottom: 2,
                WebkitOverflowScrolling: 'touch',
              }}
              className="no-scrollbar"
            >
              {/* Location Pill */}
              <button
                type="button"
                onClick={handleOpenModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.full,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: colors.textMain,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <EnvironmentOutlined style={{ color: colors.primary, fontSize: 13 }} />
                <span>{locationName ? locationName.split(',')[0] : 'Koramangala 4th Blk'}</span>
                <span style={{ fontSize: 10, opacity: 0.6 }}>🏢</span>
              </button>

              {/* Distance Quick Pills */}
              {RADIUS_PRESETS.map((preset) => {
                const isActive = (filters.maxDistance ?? null) === preset.val;
                return (
                  <button
                    key={preset.val ?? 'all'}
                    type="button"
                    onClick={() => {
                      setFilters((prev) => ({
                        ...prev,
                        maxDistance: prev.maxDistance === preset.val ? null : preset.val,
                      }));
                    }}
                    style={{
                      background: isActive ? colors.primary : colors.surface,
                      color: isActive ? colors.white : colors.textMain,
                      border: `1px solid ${isActive ? colors.primary : colors.border}`,
                      borderRadius: radii.full,
                      padding: '4px 12px',
                      fontSize: 12,
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  const customVal = window.prompt(
                    'Enter search radius in km:',
                    filters.maxDistance || '3'
                  );
                  if (customVal && !isNaN(parseFloat(customVal))) {
                    setFilters((prev) => ({ ...prev, maxDistance: parseFloat(customVal) }));
                  }
                }}
                style={{
                  background: colors.surface,
                  color: colors.textMain,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.full,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Custom 🎚
              </button>
            </div>
          ) : (
            /* Desktop Geofence & Locality Sub-bar */
            <Flex
              justify="space-between"
              align="center"
              wrap="wrap"
              gap={12}
              style={{
                marginTop: 14,
                fontSize: 12.5,
                color: colors.textMuted,
              }}
            >
              <Flex align="center" gap={8} wrap="wrap">
                <EnvironmentOutlined style={{ color: colors.primary, fontSize: 14 }} />

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
                    style={{ minWidth: 150, maxWidth: 260 }}
                    popupMatchSelectWidth={false}
                    dropdownRender={(menu) => (
                      <div>
                        {menu}
                        <div
                          style={{
                            padding: '6px 12px',
                            borderTop: `1px solid ${colors.border}`,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            color: colors.primary,
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
                      ...savedAddresses.map((addr) => ({
                        value: addr.id,
                        label: `${addr.label}${addr.is_default ? ' (Default)' : ''} - ${
                          addr.street_area || addr.city || 'Saved Area'
                        }`,
                      })),
                      ...(selectedAddressId === null && locationName
                        ? [{ value: 'custom_loc', label: `📍 ${locationName}` }]
                        : []),
                    ]}
                  />
                ) : (
                  <strong style={{ color: colors.textMain }}>
                    {locationName || (isDetectingLocation ? 'Detecting location...' : 'Koramangala 4th Block, Bengaluru')}
                  </strong>
                )}

                {isDetectingLocation && <Spin size="small" />}

                <button
                  type="button"
                  onClick={handleOpenModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.secondary,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: 12.5,
                  }}
                >
                  Change on Map
                </button>

                <span>•</span>
                <button
                  type="button"
                  onClick={() => fetchUserLocation(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.textMuted,
                    cursor: 'pointer',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12.5,
                  }}
                >
                  <AimOutlined style={{ fontSize: 13 }} />
                  <span>Nearby</span>
                </button>

                <span>•</span>
                <span>
                  {filters.maxDistance
                    ? `Showing ${searchMode === 'shops' ? 'stores' : 'offerings'} within ${Number(filters.maxDistance).toFixed(1)} km`
                    : `Showing all ${searchMode === 'shops' ? 'stores' : 'offerings'} nearby`}
                </span>
              </Flex>

              <Flex align="center" gap={6} wrap="wrap">
                <span style={{ fontWeight: 600, color: colors.textMuted, marginRight: 2 }}>Radius:</span>
                {RADIUS_PRESETS.map((preset) => {
                  const isActive = (filters.maxDistance ?? null) === preset.val;
                  return (
                    <button
                      key={preset.val ?? 'all'}
                      type="button"
                      onClick={() => {
                        setFilters((prev) => ({
                          ...prev,
                          maxDistance: prev.maxDistance === preset.val ? null : preset.val,
                        }));
                      }}
                      style={{
                        background: isActive ? colors.primary : colors.surface,
                        color: isActive ? colors.white : colors.textMain,
                        border: `1px solid ${isActive ? colors.primary : colors.border}`,
                        borderRadius: radii.full,
                        padding: '4px 12px',
                        fontSize: 12,
                        fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {preset.fullLabel}
                    </button>
                  );
                })}
              </Flex>
            </Flex>
          )}

          {/* Row 4: Quick Filter Strip on Mobile matching media_1794134817614_8426e4ff.png */}
          {isMobile && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                overflowX: 'auto',
                paddingTop: 8,
                paddingBottom: 2,
                WebkitOverflowScrolling: 'touch',
              }}
              className="no-scrollbar"
            >
              {/* Filter Trigger Button */}
              <button
                type="button"
                onClick={() => setIsMobileFilterDrawerOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: activeFiltersCount > 0 ? colors.primaryLight : colors.surface,
                  border: `1px solid ${activeFiltersCount > 0 ? colors.primary : colors.border}`,
                  borderRadius: radii.full,
                  padding: '4px 10px',
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: activeFiltersCount > 0 ? colors.primary : colors.textMain,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <FilterOutlined style={{ fontSize: 12 }} />
                <span>Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}</span>
              </button>

              {/* Within 2 km Active Chip */}
              <button
                type="button"
                onClick={() => {
                  setFilters((prev) => ({
                    ...prev,
                    maxDistance: prev.maxDistance === 2 ? null : 2,
                  }));
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: filters.maxDistance === 2 ? '#f0fdf4' : colors.surface,
                  border: `1px solid ${filters.maxDistance === 2 ? '#86efac' : colors.border}`,
                  borderRadius: radii.full,
                  padding: '4px 10px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: filters.maxDistance === 2 ? '#166534' : colors.textMain,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <span>Within 2 km</span>
                {filters.maxDistance === 2 && <CheckOutlined style={{ fontSize: 11 }} />}
              </button>

              {/* Under ₹100 Price Preset */}
              <button
                type="button"
                onClick={() => {
                  setFilters((prev) => ({
                    ...prev,
                    minPrice: prev.maxPrice === 100 ? null : 0,
                    maxPrice: prev.maxPrice === 100 ? null : 100,
                  }));
                }}
                style={{
                  background: filters.maxPrice === 100 ? colors.primaryLight : colors.surface,
                  border: `1px solid ${filters.maxPrice === 100 ? colors.primary : colors.border}`,
                  borderRadius: radii.full,
                  padding: '4px 10px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: filters.maxPrice === 100 ? colors.primary : colors.textMain,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Under ₹100
              </button>

              {/* Physical Stock / Verified */}
              <button
                type="button"
                onClick={() => {
                  setFilters((prev) => ({
                    ...prev,
                    onlyAvailable: !prev.onlyAvailable,
                  }));
                }}
                style={{
                  background: filters.onlyAvailable ? '#f0fdf4' : colors.surface,
                  border: `1px solid ${filters.onlyAvailable ? '#86efac' : colors.border}`,
                  borderRadius: radii.full,
                  padding: '4px 10px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: filters.onlyAvailable ? '#166534' : colors.textMain,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Verified in Store
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area: 2 Columns Layout on Desktop, Stream on Mobile */}
      <div
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: isMobile ? '12px 12px 24px' : '24px 20px 80px',
        }}
      >
        <Row gutter={isMobile ? [0, 0] : [24, 24]}>
          {/* Left Column: Filter Sidebar (Desktop md+) */}
          {!isMobile && (
            <Col md={7} lg={6}>
              {/* Scrolls inside itself when the filters are taller than the screen */}
              <div
                style={{
                  position: 'sticky',
                  top: 20,
                  maxHeight: 'calc(100vh - 40px)',
                  overflowY: 'auto',
                  scrollbarWidth: 'thin',
                }}
              >
                <FilterSidebar
                  filters={filters}
                  onFilterChange={setFilters}
                  onResetFilters={() => setFilters(DEFAULT_FILTERS)}
                  searchMode={searchMode}
                  categoryCounts={categoryCounts}
                  fieldFilters={availableFieldFilters}
                />
              </div>
            </Col>
          )}

          {/* Right Column: Results Stream */}
          <Col xs={24} md={17} lg={18}>
            {/* Results Stream Header: Count, Subtitle, Sort, View mode */}
            <Flex
              justify="space-between"
              align="center"
              wrap="nowrap"
              gap={10}
              style={{ marginBottom: 12 }}
            >
              <Flex align="center" gap={6} style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: colors.semantic.success,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: isMobile ? 13 : 18,
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontWeight: 800,
                    color: colors.textMain,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {totalCount} {searchMode === 'shops' ? 'stores' : 'offerings'}
                  <span style={{ fontWeight: 500, color: colors.textMuted, marginLeft: 4 }}>
                    live in your radius
                  </span>
                </span>
              </Flex>

              <Flex align="center" gap={6} style={{ flexShrink: 0 }}>
                {/* Sort Selector (Desktop only) */}
                {!isMobile && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12.5,
                      color: colors.textMuted,
                      marginRight: 6,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>Sort:</span>
                    <Select
                      value={filters.sortBy || 'distance_asc'}
                      onChange={(val) => setFilters((prev) => ({ ...prev, sortBy: val }))}
                      size="middle"
                      style={{ minWidth: 175 }}
                      options={[
                        { value: 'distance_asc', label: 'Nearest first (Distance)' },
                        ...(searchMode === 'items'
                          ? [
                              { value: 'price_asc', label: 'Price: Low to High' },
                              { value: 'price_desc', label: 'Price: High to Low' },
                            ]
                          : []),
                        { value: 'rating_desc', label: 'Highest Rated (4.5+ ★)' },
                        { value: 'name_asc', label: 'Name (A to Z)' },
                      ]}
                    />
                  </div>
                )}

                {/* View Mode Switcher: Grid / List / Map */}
                <div
                  style={{
                    display: 'inline-flex',
                    background: colors.surfaceContainer,
                    borderRadius: radii.md,
                    padding: 2,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleViewModeChange('grid')}
                    title="Grid View"
                    style={{
                      background: viewMode === 'grid' ? colors.white : 'transparent',
                      color: viewMode === 'grid' ? colors.primary : colors.textMuted,
                      border: 'none',
                      borderRadius: radii.xs,
                      padding: isMobile ? '4px 7px' : '5px 9px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    <AppstoreOutlined style={{ fontSize: 14 }} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleViewModeChange('list')}
                    title="List View"
                    style={{
                      background: viewMode === 'list' ? colors.white : 'transparent',
                      color: viewMode === 'list' ? colors.primary : colors.textMuted,
                      border: 'none',
                      borderRadius: radii.xs,
                      padding: isMobile ? '4px 7px' : '5px 9px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    <BarsOutlined style={{ fontSize: 14 }} />
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenModal}
                    title="Map View"
                    style={{
                      background: 'transparent',
                      color: colors.textMuted,
                      border: 'none',
                      borderRadius: radii.xs,
                      padding: isMobile ? '4px 7px' : '5px 9px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <CompassOutlined style={{ fontSize: 14 }} />
                  </button>
                </div>
              </Flex>
            </Flex>

            {/* Desktop Active Filter Chips Strip */}
            {!isMobile && activeFilterTags.length > 0 && (
              <Flex wrap="wrap" gap={8} align="center" style={{ marginBottom: 16 }}>
                {activeFilterTags.map((tag) => (
                  <span
                    key={tag.key}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: colors.white,
                      border: `1px solid ${colors.border}`,
                      borderRadius: radii.full,
                      padding: '4px 11px',
                      fontSize: 12,
                      color: colors.textMain,
                      fontWeight: 500,
                    }}
                  >
                    <span>{tag.label}</span>
                    <CloseCircleOutlined
                      onClick={tag.onRemove}
                      style={{ fontSize: 12, color: colors.textMuted, cursor: 'pointer' }}
                    />
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.secondary,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '2px 6px',
                  }}
                >
                  Clear All
                </button>
              </Flex>
            )}

            {/* Results Content */}
            {loading ? (
              <Flex justify="center" align="center" style={{ minHeight: '40vh' }}>
                <Spin size="large" tip="Finding nearby offerings..." />
              </Flex>
            ) : totalCount === 0 ? (
              <div
                style={{
                  background: colors.surface,
                  borderRadius: radii.xl,
                  border: `1px solid ${colors.border}`,
                  textAlign: 'center',
                  padding: '48px 20px',
                }}
              >
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    (searchMode === 'shops' ? searchMarkers.length : itemListings.length) > 0
                      ? 'No offerings match your active filters (e.g. radius, category, or price)'
                      : searchError || `No ${searchMode === 'shops' ? 'stores' : 'offerings'} found in this area`
                  }
                >
                  {(searchMode === 'shops' ? searchMarkers.length : itemListings.length) > 0 ? (
                    <Button
                      type="primary"
                      onClick={() => setFilters(DEFAULT_FILTERS)}
                      style={{ borderRadius: radii.md, fontWeight: 700 }}
                    >
                      Clear Active Filters
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      onClick={handleOpenModal}
                      style={{ borderRadius: radii.md, fontWeight: 700 }}
                    >
                      Adjust Location on Map
                    </Button>
                  )}
                </Empty>
              </div>
            ) : viewMode === 'list' ? (
              /* Table / List View */
              <ShopTableView
                items={visibleItems}
                searchMode={searchMode}
                onOpenMap={handleOpenModal}
              />
            ) : (
              /* Offerings / Stores Stream (Mobile High-Density Stack & Desktop 3-Column Grid) */
              <div>
                <Row gutter={isMobile ? [0, 10] : [20, 20]}>
                  {searchMode === 'items'
                    ? visibleItems.map((item, index) => (
                        <React.Fragment key={item.id}>
                          <Col xs={24} sm={12} lg={8}>
                            <OfferingCard
                              item={item}
                              onOrder={(it) => {
                                addItem(it.shop, it);
                                openCart();
                              }}
                              onClick={() => {
                                const shopId = item.shop?.id || item.shop_id;
                                if (shopId) history.push(`/shop/${shopId}`);
                              }}
                            />
                          </Col>

                          {/* Mobile Inline 100% Direct Store Checkout Banner after 2nd card */}
                          {isMobile && index === 1 && (
                            <Col xs={24}>
                              <div
                                style={{
                                  background: '#EEF2FF',
                                  border: '1px solid #C7D2FE',
                                  borderRadius: radii.xl,
                                  padding: '12px 14px',
                                  margin: '2px 0 10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 12,
                                }}
                              >
                                <div
                                  style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: radii.md,
                                    background: colors.primary,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: colors.white,
                                    fontSize: 18,
                                    flexShrink: 0,
                                  }}
                                >
                                  <SafetyCertificateOutlined />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 800,
                                      color: colors.textMain,
                                      marginBottom: 2,
                                    }}
                                  >
                                    100% Direct Store Checkout
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: colors.textMuted,
                                      lineHeight: 1.35,
                                    }}
                                  >
                                    Zero aggregator markups. Pay your neighbourhood shopkeeper
                                    directly via UPI upon physical stock confirmation.
                                  </div>
                                </div>
                              </div>
                            </Col>
                          )}
                        </React.Fragment>
                      ))
                    : visibleItems.map((shop) => (
                        <Col xs={24} sm={12} lg={8} key={shop.id}>
                          <ShopCard
                            shopDetails={shop}
                            isChat={user_data?.user_id ? true : false}
                            viewMode={isMobile ? 'list' : 'grid'}
                          />
                        </Col>
                      ))}
                </Row>

                {/* Mobile Discovery Footer matching media_1794134817614_8426e4ff.png */}
                {isMobile && (
                  <div style={{ textAlign: 'center', padding: '24px 16px 12px' }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: '#E6F0FF',
                        color: colors.secondary,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                        marginBottom: 8,
                      }}
                    >
                      <EnvironmentOutlined />
                    </div>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 800,
                        color: colors.textMain,
                        marginBottom: 3,
                      }}
                    >
                      Discovering more in {locationName ? locationName.split(',')[0] : 'Koramangala'}...
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: colors.textMuted,
                        maxWidth: 300,
                        margin: '0 auto',
                        lineHeight: 1.4,
                      }}
                    >
                      New neighbourhood store physical inventories refresh automatically every 5 minutes.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Load More Button matching mockup */}
            {!loading && visibleCount < totalCount && (
              <div style={{ textAlign: 'center', marginTop: isMobile ? 18 : 32 }}>
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 18)}
                  style={{
                    background: colors.white,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radii.full,
                    padding: isMobile ? '8px 20px' : '10px 24px',
                    fontSize: isMobile ? 12.5 : 13.5,
                    fontWeight: 700,
                    color: colors.textMain,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = colors.primary;
                    e.currentTarget.style.color = colors.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.color = colors.textMain;
                  }}
                >
                  ⌄ Load {Math.min(18, totalCount - visibleCount)} More{' '}
                  {searchMode === 'shops' ? 'Stores' : 'Offerings'}
                  {filters.maxDistance ? ` (Within ${filters.maxDistance} km)` : ''}
                </button>
              </div>
            )}

            {/* Hyper-request notice */}
            {!loading && totalCount > 0 && (
              <p
                style={{
                  textAlign: 'center',
                  marginTop: 18,
                  marginBottom: 8,
                  fontSize: 12.5,
                  color: colors.textMuted,
                }}
              >
                Need something not listed?{' '}
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.secondary,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Broadcast an open hyper-request
                </button>{' '}
                to {activeMerchantCount} neighborhood shops.
              </p>
            )}
          </Col>
        </Row>
      </div>

      {/* Mobile Filters Drawer */}
      <Drawer
        title="Filter Offerings"
        placement="left"
        onClose={() => setIsMobileFilterDrawerOpen(false)}
        open={isMobileFilterDrawerOpen}
        width={320}
        styles={{ body: { padding: 12, background: colors.bg } }}
      >
        <FilterSidebar
          filters={filters}
          onFilterChange={(newFilters) => {
            setFilters(newFilters);
          }}
          onResetFilters={() => setFilters(DEFAULT_FILTERS)}
          searchMode={searchMode}
          categoryCounts={categoryCounts}
          fieldFilters={availableFieldFilters}
        />
      </Drawer>

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
