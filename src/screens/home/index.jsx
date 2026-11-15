import React, { useEffect, useState, useMemo } from 'react';
import {
  Button,
  Col,
  Row,
  Flex,
  Grid,
  Modal,
  message,
  Popover,
} from 'antd';
import {
  SearchOutlined,
  EnvironmentOutlined,
  CompassOutlined,
  ArrowRightOutlined,
  CheckCircleFilled,
  CheckOutlined,
  StarFilled,
  DownOutlined,
  AppstoreOutlined,
  PlayCircleOutlined,
  ShoppingOutlined,
  ToolOutlined,
  MedicineBoxOutlined,
  GiftOutlined,
  AudioOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import {
  LeafletComponent,
  AddressModal,
  DEFAULT_FILTERS,
  VoiceSearchModal,
  ImageSearchModal,
  AiSearchModal,
  KineticHeadline,
  ShopperCursors,
  FloatingArtifacts,
  LivingRadarMap,
  TiltCard,
  CategoryStall,
  NightShiftSection,
  LiveDashboardMock,
} from '../../app/components';
import {
  getLocationName,
  getPreciseUserLocation,
  netWorkCall,
} from '../../app/utils/helper';
import { apiConfig } from '../../app/utils';
import { useGlobalStore, useChatStore } from '../../app/services';
import { useHistory, useLocation } from 'react-router-dom';
import { radii } from '../../app/styles';
import Routes from '../../app/routes/routes';

const RADIUS_PRESETS = [
  { label: '1 km walking', val: 1 },
  { label: '2 km neighborhood', val: 2 },
  { label: '5 km cycling', val: 5 },
  { label: '10 km citywide', val: 10 },
  { label: 'All distances', val: null },
];

// Featured showcase shops from designs/Main.png
const FEATURED_SHOPS = [
  {
    id: 'sunrise-bakehouse',
    name: 'Sunrise Bakehouse',
    category: 'BAKERY · ARTISANAL BREADS',
    image: '/images/shop-sunrise-bakehouse.png',
    distance: 0.4,
    rating: 4.8,
    reviewsCount: 184,
    description: 'Freshly pulled batch of multi-grain boules, almond croissants, and brioche burger buns...',
    perk: 'Pickup in 10m',
    perkIcon: '🕒',
    isOpen: true,
    verified: true,
    area: '4th Block',
  },
  {
    id: 'green-basket-kirana',
    name: 'Green Basket Kirana',
    category: 'KIRANA · FARM FRESH',
    image: '/images/shop-green-basket.png',
    distance: 0.9,
    rating: 4.6,
    reviewsCount: 312,
    description: 'Farm harvest arrived 6 AM today: hydroponic spinach, Ooty carrots, cold-pressed mustard oil,',
    perk: 'Delivery in 20m',
    perkIcon: '🚚',
    isOpen: true,
    verified: true,
    area: '1st Block',
  },
  {
    id: 'fixit-hardware',
    name: 'FixIt Hardware & Tools',
    category: 'HARDWARE · ELECTRICAL',
    image: '/images/shop-fixit-hardware.png',
    distance: 1.2,
    rating: 4.9,
    reviewsCount: 96,
    description: 'Plumbing spares, LED fixtures, wall anchors, and instant tool rentals with in-store technician...',
    perk: 'Tools & Help',
    perkIcon: '🔧',
    isOpen: true,
    verified: true,
    area: '80 Feet Rd',
  },
  {
    id: 'petal-stem-botanics',
    name: 'Petal & Stem Botanics',
    category: 'FLORIST · HAND BOUQUETS',
    image: '/images/shop-petal-stem.png',
    distance: 1.6,
    rating: 4.7,
    reviewsCount: 78,
    description: 'Fresh morning cut lilies, bespoke celebration bouquets, terrarium moss, and hand-tied...',
    perk: 'Hand Tied',
    perkIcon: '🪴',
    isOpen: true,
    verified: true,
    area: 'Coral Parkway',
  },
];

// Categories in focus matching designs/Main.png
const CATEGORIES_IN_FOCUS = [
  {
    id: 'Provision Store',
    title: 'Fresh Kirana & Grocery',
    count: '42 shops',
    iconBg: '#E0F2FE',
    iconColor: '#0284C7',
    icon: <ShoppingOutlined style={{ fontSize: 24, color: '#0284C7' }} />,
    categoryFilter: 'Provision Store',
  },
  {
    id: 'Food & Dining',
    title: 'Bakeries & Cafes',
    count: '18 shops',
    iconBg: '#FFEDD5',
    iconColor: '#EA580C',
    icon: <span style={{ fontSize: 24 }}>🥐</span>,
    categoryFilter: 'Food & Dining',
  },
  {
    id: 'Technicians',
    title: 'Hardware & Spares',
    count: '14 shops',
    iconBg: '#F1F5F9',
    iconColor: '#475569',
    icon: <ToolOutlined style={{ fontSize: 24, color: '#475569' }} />,
    categoryFilter: 'Technicians',
  },
  {
    id: 'Health & Medicine',
    title: 'Local Pharmacy & Care',
    count: '11 shops',
    iconBg: '#FFE4E6',
    iconColor: '#E11D48',
    icon: <MedicineBoxOutlined style={{ fontSize: 24, color: '#E11D48' }} />,
    categoryFilter: 'Health & Medicine',
  },
  {
    id: 'Small business',
    title: 'Florists & Gifts',
    count: '9 shops',
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    icon: <GiftOutlined style={{ fontSize: 24, color: '#D97706' }} />,
    categoryFilter: 'Small business',
  },
  {
    id: 'Technicians-repairs',
    title: 'Home Repairs & Tech',
    count: '16 providers',
    iconBg: '#EDE9FE',
    iconColor: '#7C3AED',
    icon: <AppstoreOutlined style={{ fontSize: 24, color: '#7C3AED' }} />,
    categoryFilter: 'Technicians',
  },
];

const HomeScreen = () => {
  const history = useHistory();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const { user_data } = useGlobalStore((state) => state);

  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, maxDistance: 2 });
  const [isMerchantExplainerOpen, setIsMerchantExplainerOpen] = useState(false);
  const [isRadiusPopoverOpen, setIsRadiusPopoverOpen] = useState(false);

  // Smart Search Modals
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const handleAiApply = (aiData) => {
    setIsAiModalOpen(false);
    const params = new URLSearchParams();
    if (aiData.keyword) params.set('q', aiData.keyword);
    if (aiData.category) params.set('category', aiData.category);
    if (aiData.maxDistance) params.set('radius', aiData.maxDistance);
    if (aiData.maxPrice) params.set('maxPrice', aiData.maxPrice);
    history.push(`/search?${params.toString()}`);
  };

  useEffect(() => {
    if (location.search) {
      const params = new URLSearchParams(location.search);
      const qParam = params.get('q');
      const catParam = params.get('category');
      if (qParam || catParam) {
        history.replace(`/search${location.search}`);
      }
    }
  }, [location.search, history]);

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
    initialLoc?.coords || [12.9352, 77.6245] // Koramangala, Bengaluru default coordinate
  );
  const [position, setPosition] = useState(
    initialLoc?.coords || [12.9352, 77.6245]
  );
  const [locationName, setLocationName] = useState(
    initialLoc?.name || 'Koramangala 4th Block, Bengaluru'
  );
  const [searchMarkers, setSearchMarkers] = useState([]);
  const [, setLoading] = useState(false);

  // User Saved Addresses
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isAddAddressModalOpen, setIsAddAddressModalOpen] = useState(false);

  const fetchUserAddresses = async () => {
    if (!user_data?.user_id) return;
    try {
      const res = await netWorkCall(apiConfig.user_addresses, 'GET', null, true);
      if (res?.data && res.data.length > 0) {
        const defaultAddr = res.data.find((a) => a.is_default) || res.data[0];
        if (defaultAddr && !selectedAddressId) {
          handleSelectAddressForSearch(defaultAddr, false);
        }
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

  const handleSearchSubmit = () => {
    const params = new URLSearchParams();
    if (searchText.trim()) params.set('q', searchText.trim());
    if (filters.maxDistance) params.set('radius', filters.maxDistance);
    history.push(`/search?${params.toString()}`);
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

  // Fetch nearby verified shops for radar and merchant counts
  useEffect(() => {
    let isCancelled = false;

    const performSearch = async () => {
      setLoading(true);
      const coords =
        markerLocation && markerLocation.length === 2
          ? markerLocation
          : [12.9352, 77.6245];

      try {
        const body = JSON.stringify({
          lat: coords[0],
          lon: coords[1],
          search: '',
        });

        const response = await netWorkCall(apiConfig.shops_search, 'POST', body, false);
        if (!isCancelled && response?.data) {
          setSearchMarkers(response.data);
        }
      } catch (error) {
        if (!isCancelled) console.error('Error fetching shops on home:', error);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    performSearch();
    return () => {
      isCancelled = true;
    };
  }, [markerLocation]);

  const activeMerchantCount = useMemo(() => {
    return new Set(searchMarkers.map((s) => s.id).filter(Boolean)).size || searchMarkers.length || 48;
  }, [searchMarkers]);

  const handleQuickCategory = (catKey) => {
    const keyMap = {
      bakery: { category: 'Food & Dining', query: 'bakery' },
      grocery: { category: 'Provision Store', query: 'grocery' },
      hardware: { category: 'Technicians', query: 'hardware' },
      pharmacy: { category: 'Health & Medicine', query: 'pharmacy' },
      florist: { category: 'Small business', query: 'florist' },
    };
    const target = keyMap[catKey];
    if (target) {
      history.push(
        `/search?category=${encodeURIComponent(target.category)}&q=${encodeURIComponent(target.query)}`
      );
    }
  };

  const handleCategoryCardClick = (catFilter) => {
    history.push(`/search?category=${encodeURIComponent(catFilter)}`);
  };

  const handleVisitFeaturedShop = (shopId) => {
    // If a matching shop exists in real DB searchMarkers, navigate to it
    const matched = searchMarkers.find(
      (s) =>
        s.id === shopId ||
        (s.name && s.name.toLowerCase().includes(shopId.replace('-', ' ').split(' ')[0]))
    );
    if (matched?.id) {
      history.push(`/shop/${matched.id}`);
    } else {
      // Navigate or view storefront
      history.push(`/shop/${shopId}`);
    }
  };

  const cleanAreaName = useMemo(() => {
    if (!locationName) return 'Koramangala';
    return locationName.split(',')[0].trim();
  }, [locationName]);

  // Scroll Listener for Sticky Neighborhood Bar & Active Motion
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [isStickyDismissed, setIsStickyDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      setShowStickyBar(scrollY > 320);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // IntersectionObserver Scroll Reveal for elements entering the viewport
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const elements = document.querySelectorAll('.reveal-on-scroll:not(.is-revealed)');
    if (!('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -30px 0px',
      }
    );

    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [searchMarkers.length]);

  return (
    <div style={{ minHeight: '100%', background: '#FDF9F4', color: '#1C1C19' }}>
      {/* =========================================================================
          SECTION 1: HERO SECTION (designs/main-inspiration-gpt.png)
          ========================================================================= */}
      <section
        style={{
          position: 'relative',
          background: 'linear-gradient(180deg, #FDF9F4 0%, #FAF6F0 100%)',
          padding: isMobile ? '28px 16px 36px' : '48px 24px 56px',
          borderBottom: '1px solid #ECE7DF',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        {/* Full-Bleed Organic Environmental Waves (main-inspiration-gpt.png) */}
        <div className="hero-blob-lime-right" />
        <div className="hero-blob-lavender-left" />

        {/* Floating Ambient Neighborhood Artifacts with Parallax & Hover - Desktop only */}
        {!isMobile && <FloatingArtifacts onSelectCategory={handleQuickCategory} />}

        {/* Ambient Real-Time Shopper Presence Cursors - Desktop only */}
        {!isMobile && <ShopperCursors />}

        <div style={{ maxWidth: 1240, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Row gutter={isMobile ? [0, 32] : [40, 24]} align="middle">
            {/* Left Column: Eyebrow badge, Title, Subtitle, Search bar, Trust, Quick chips */}
            <Col xs={24} lg={13}>
              {/* Pill Badge */}
              <div style={{ marginBottom: 16 }}>
                <span className="hero-hyper-badge">
                  <span className="hero-hyper-dot" />
                  HYPERLOCAL NEIGHBORHOOD COMMERCE
                </span>
              </div>

              {/* Dynamic Living Headline with Kinetic Typewriter, Lime Highlight & Spark Bursts */}
              <KineticHeadline isMobile={isMobile} />

              {/* Subtitle */}
              <p
                style={{
                  fontSize: isMobile ? 14.5 : 16.5,
                  color: '#4B5563',
                  lineHeight: 1.6,
                  maxWidth: 540,
                  margin: '0 0 28px',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Discover verified neighborhood merchants within your immediate radius — browse genuine inventory,
                message directly, and collect in minutes or request same-day doorstep dispatch.
              </p>

              {/* Search Container (Radius + Omnisearch + Submit) */}
              <div
                className="rquest-search-pill"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: radii.full,
                  padding: isMobile ? '5px 6px 5px 12px' : '6px 8px 6px 18px',
                  boxShadow: '0 8px 24px -4px rgba(11, 45, 107, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? 8 : 12,
                  width: '100%',
                  maxWidth: 620,
                  marginBottom: 16,
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                {/* Radius selector dropdown */}
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
                      fontSize: isMobile ? 12.5 : 13.5,
                      fontWeight: 600,
                      color: '#111827',
                      cursor: 'pointer',
                      padding: '4px 0',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    <CompassOutlined style={{ color: '#0B2D6B', fontSize: 15 }} />
                    <span>{filters.maxDistance ? `${filters.maxDistance} km radius` : 'All radius'}</span>
                    <DownOutlined style={{ fontSize: 10, color: '#6B7280' }} />
                  </button>
                </Popover>

                {/* Divider Line */}
                <div style={{ width: 1, height: 26, background: '#E5E7EB', flexShrink: 0 }} />

                {/* Search Text Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <SearchOutlined style={{ color: '#9CA3AF', fontSize: 16, flexShrink: 0 }} />
                  <input
                    type="text"
                    className="rquest-search-input"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                    placeholder={
                      isMobile
                        ? "Search 'sourdough bread', '25W bulb'..."
                        : "Search shops or items — 'sourdough bread', '25W bulb'..."
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
                </div>

                {/* Voice Search Button */}
                <button
                  type="button"
                  onClick={() => setIsVoiceModalOpen(true)}
                  title="Voice Search"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#6B7280',
                    cursor: 'pointer',
                    padding: '6px 4px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AudioOutlined style={{ fontSize: 15 }} />
                </button>

                {/* Search Submit Circle Button with Arrow */}
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  style={{
                    width: isMobile ? 38 : 44,
                    height: isMobile ? 38 : 44,
                    borderRadius: '50%',
                    background: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isMobile ? 14 : 16,
                    flexShrink: 0,
                    transition: 'all 0.18s ease',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.25)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <ArrowRightOutlined />
                </button>
              </div>

              {/* Trust Proof Points Row */}
              <Flex
                align="center"
                gap={isMobile ? 12 : 20}
                wrap="wrap"
                style={{ fontSize: isMobile ? 12 : 13, color: '#374151', marginBottom: 20 }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                  <span className="trust-proof-dot" style={{ background: '#10B981' }} />
                  <span>{activeMerchantCount > 0 ? `${activeMerchantCount} shops online` : '142 shops online'}</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                  <span className="trust-proof-dot" style={{ background: '#2563EB' }} />
                  <span>Verified neighborhood merchants</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                  <span className="trust-proof-dot" style={{ background: '#B45309' }} />
                  <span>Zero commission markup</span>
                </span>
              </Flex>

              {/* Quick Category Chips Row - Styled to match main-inspiration-gpt.png */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  overflowX: 'auto',
                  paddingBottom: 4,
                  WebkitOverflowScrolling: 'touch',
                }}
                className="no-scrollbar"
              >
                <button
                  type="button"
                  className="quick-chip-gpt"
                  onClick={() => handleQuickCategory('bakery')}
                >
                  <span className="chip-emoji" style={{ fontSize: 15 }}>🥐</span>
                  <span>Bakery</span>
                </button>
                <button
                  type="button"
                  className="quick-chip-gpt"
                  onClick={() => handleQuickCategory('grocery')}
                >
                  <span className="chip-emoji" style={{ fontSize: 15 }}>🛒</span>
                  <span>Grocery</span>
                </button>
                <button
                  type="button"
                  className="quick-chip-gpt"
                  onClick={() => handleQuickCategory('hardware')}
                >
                  <span className="chip-emoji" style={{ fontSize: 15 }}>🔧</span>
                  <span>Hardware</span>
                </button>
                <button
                  type="button"
                  className="quick-chip-gpt"
                  onClick={() => handleQuickCategory('pharmacy')}
                >
                  <span className="chip-emoji" style={{ fontSize: 14, color: '#E11D48', fontWeight: 800 }}>➕</span>
                  <span>Pharmacy</span>
                </button>
                <button
                  type="button"
                  className="quick-chip-gpt"
                  onClick={() => handleQuickCategory('florist')}
                >
                  <span className="chip-emoji" style={{ fontSize: 15 }}>🌸</span>
                  <span>Florist</span>
                </button>
              </div>
            </Col>

            {/* Right Column: Living Interactive Animated Radar Map */}
            <Col xs={24} lg={11}>
              <div
                style={{
                  position: 'relative',
                  maxWidth: isMobile ? 360 : 510,
                  margin: '0 auto',
                }}
              >
                <LivingRadarMap onSelectShop={handleVisitFeaturedShop} />
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: OPEN NEAR YOU RIGHT NOW (designs/main-inspiration-gpt.png)
          ========================================================================= */}
      <section
        style={{
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
          padding: isMobile ? '36px 16px 20px' : '56px 24px 30px',
        }}
      >
        {/* Full-Bleed Organic Environmental Shapes (main-inspiration-gpt.png) */}
        <div className="cards-blob-lime-left" />
        <div className="cards-blob-lavender-right" />

        <div style={{ maxWidth: 1240, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Section Header Row */}
        <Flex
          justify="space-between"
          align="center"
          wrap="wrap"
          gap={12}
          className="reveal-on-scroll"
          style={{ marginBottom: 24, position: 'relative', zIndex: 1 }}
        >
          <Flex align="center" gap={12} wrap="wrap">
            <h2
              style={{
                fontSize: isMobile ? 24 : 32,
                fontWeight: 800,
                color: '#110E28',
                letterSpacing: '-0.025em',
                fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
                margin: 0,
              }}
            >
              Open near you right now
            </h2>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                background: '#DCFCE7',
                color: '#15803D',
                borderRadius: 9999,
                padding: '4px 12px',
                fontSize: 11.5,
                fontWeight: 700,
              }}
            >
              <span className="sticky-radar-pulse" style={{ width: 7, height: 7 }} />
              <span>Live radar scanning {filters.maxDistance ? `${filters.maxDistance} km` : '2 km'}</span>
            </span>
          </Flex>

          <button
            type="button"
            onClick={() => history.push('/search')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#0159C5',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: 0,
            }}
          >
            <span>
              View all {activeMerchantCount} shops in {cleanAreaName}
            </span>
            <span style={{ fontSize: 13 }}>→</span>
          </button>
        </Flex>

        {/* 4 Featured Neighborhood Shop Cards Grid */}
        <Row gutter={[20, 20]} style={{ position: 'relative', zIndex: 1 }}>
          {FEATURED_SHOPS.map((shop, idx) => (
            <Col xs={24} sm={12} lg={6} key={shop.id}>
              <TiltCard maxTilt={5} scale={1.02}>
                <div className={`shop-card-main reveal-on-scroll reveal-delay-${(idx % 4) + 1}`} style={{ height: '100%' }}>
                {/* Image Container with Badges */}
                <div style={{ position: 'relative', width: '100%', height: 165, overflow: 'hidden' }}>
                  <img
                    src={shop.image}
                    alt={shop.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      transition: 'transform 0.3s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  />


                </div>

                {/* Card Body */}
                <div style={{ padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {/* Category Eyebrow & Star Rating */}
                  <Flex justify="space-between" align="center" style={{ marginBottom: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#B45309',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '75%',
                      }}
                    >
                      {shop.category}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#111827', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <StarFilled style={{ color: '#F59E0B', fontSize: 11 }} />
                      {shop.rating}
                    </span>
                  </Flex>

                  {/* Shop Name */}
                  <h3
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#110E28',
                      margin: '0 0 6px',
                      letterSpacing: '-0.015em',
                      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {shop.name}
                  </h3>

                  {/* Status & Distance Tag Buttons (moved out of image overlay) */}
                  <Flex align="center" gap={6} style={{ marginBottom: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      aria-label={shop.isOpen ? 'Open now' : 'Currently closed'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 10px',
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 600,
                        lineHeight: 1,
                        cursor: 'pointer',
                        background: shop.isOpen ? '#ECFDF5' : '#FEF2F2',
                        color: shop.isOpen ? '#047857' : '#B91C1C',
                        border: `1px solid ${shop.isOpen ? '#A7F3D0' : '#FECACA'}`,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = shop.isOpen ? '#D1FAE5' : '#FEE2E2'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = shop.isOpen ? '#ECFDF5' : '#FEF2F2'; }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          display: 'inline-block',
                          background: shop.isOpen ? '#10B981' : '#EF4444',
                        }}
                      />
                      {shop.isOpen ? 'Open' : 'Closed'}
                    </button>
                    <button
                      type="button"
                      aria-label={`${shop.distance} km away`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 600,
                        lineHeight: 1,
                        cursor: 'pointer',
                        background: '#F1F5F9',
                        color: '#475569',
                        border: '1px solid #E2E8F0',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#E2E8F0'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#F1F5F9'; }}
                    >
                      <EnvironmentOutlined style={{ fontSize: 10 }} />
                      {shop.distance} km away
                    </button>
                  </Flex>

                  {/* Description */}
                  <p
                    style={{
                      fontSize: 12.5,
                      color: '#4B5563',
                      lineHeight: 1.45,
                      margin: '0 0 14px',
                      flex: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {shop.description}
                  </p>

                  {/* Footer: Perk & Visit Shop Button */}
                  <Flex justify="space-between" align="center" style={{ paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
                    <span style={{ fontSize: 12, color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span>{shop.perkIcon}</span> {shop.perk}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleVisitFeaturedShop(shop.id)}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: 9999,
                        padding: '4px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#111827',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#0B2D6B';
                        e.currentTarget.style.color = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#0B2D6B';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#FFFFFF';
                        e.currentTarget.style.color = '#111827';
                        e.currentTarget.style.borderColor = '#E5E7EB';
                      }}
                    >
                      Visit shop
                    </button>
                  </Flex>
                </div>
              </div>
            </TiltCard>
          </Col>
          ))}
        </Row>
        </div>
      </section>



      {/* =========================================================================
          SECTION 3: CATEGORIES IN FOCUS (designs/Main.png)
          ========================================================================= */}
      <section
        style={{
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
          padding: isMobile ? '24px 16px 36px' : '36px 24px 56px',
        }}
      >
        {/* Ambient Floating Illustration Blobs */}
        <div className="category-blob-sky" />
        <div className="category-blob-peach" />

        <div style={{ maxWidth: 1240, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div className="reveal-on-scroll" style={{ marginBottom: 24, position: 'relative', zIndex: 1 }}>
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 800,
              color: '#0B2D6B',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            CATEGORIES IN FOCUS
          </div>
          <h2
            className="font-headline"
            style={{
              fontSize: isMobile ? 24 : 32,
              fontWeight: 700,
              color: '#111827',
              margin: 0,
            }}
          >
            Explore everyday neighborhood essentials
          </h2>
        </div>

        {/* 6 Category Stalls Grid with Micro-Animations */}
        <Row gutter={[16, 16]} style={{ position: 'relative', zIndex: 1 }}>
          {CATEGORIES_IN_FOCUS.map((cat, idx) => (
            <Col xs={12} sm={8} lg={4} key={cat.title}>
              <div className={`reveal-on-scroll reveal-delay-${(idx % 6) + 1}`}>
                <CategoryStall
                  title={cat.title}
                  count={cat.count}
                  icon={cat.icon}
                  iconBg={cat.iconBg}
                  iconColor={cat.iconColor}
                  onClick={() => handleCategoryCardClick(cat.categoryFilter)}
                />
              </div>
            </Col>
          ))}
        </Row>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: THE NIGHT SHIFT NOCTURNE (AgentPark-Inspired Cinematic Chapter)
          ========================================================================= */}
      <NightShiftSection
        onOpenRadar={handleOpenModal}
        onOpenChat={() => useChatStore.getState().handleChatOpen(null, null)}
      />

      {/* =========================================================================
          SECTION 5: MERCHANT CTA BANNER ("Own a shop?") (designs/Main.png)
          ========================================================================= */}
      <section
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: isMobile ? '0 16px 48px' : '0 24px 64px',
        }}
      >
        <div
          className="reveal-on-scroll"
          style={{
            background: '#F7EDE4',
            borderRadius: 28,
            padding: isMobile ? '28px 20px' : '44px 44px',
            border: '1px solid #EADBCC',
          }}
        >
          <Row gutter={isMobile ? [0, 24] : [32, 24]} align="middle">
            {/* Left Column: Heading, Subtitle, Checkmarks */}
            <Col xs={24} lg={15}>
              {/* Pill Eyebrow */}
              <div style={{ marginBottom: 12 }}>
                <span
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E5D5C5',
                    color: '#5B3A29',
                    borderRadius: 9999,
                    padding: '4px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>🏪</span> MERCHANT PARTNER COMMUNITY
                </span>
              </div>

              {/* Section Headline */}
              <h2
                className="font-headline"
                style={{
                  fontSize: isMobile ? 24 : 34,
                  fontWeight: 700,
                  color: '#1C1917',
                  margin: '0 0 10px',
                  lineHeight: 1.25,
                }}
              >
                Own a shop? Reach customers searching nearby.
              </h2>

              {/* Subtitle */}
              <p
                style={{
                  fontSize: isMobile ? 14 : 15,
                  color: '#4B5563',
                  lineHeight: 1.55,
                  margin: '0 0 20px',
                  maxWidth: 680,
                }}
              >
                List your storefront in under 5 minutes from your mobile phone. Enjoy{' '}
                <strong style={{ color: '#1C1917' }}>zero listing fees</strong>, direct instant UPI bank settlements,
                and zero commission cuts on retail sales.
              </p>

              {/* Checklist Proof Row */}
              <Flex
                align="center"
                gap={isMobile ? 12 : 24}
                wrap="wrap"
                style={{ fontSize: isMobile ? 12.5 : 13.5, color: '#1C1917', fontWeight: 600 }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircleFilled style={{ color: '#059669', fontSize: 15 }} />
                  <span>Zero middleman commission</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircleFilled style={{ color: '#059669', fontSize: 15 }} />
                  <span>Your customer relationships</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircleFilled style={{ color: '#059669', fontSize: 15 }} />
                  <span>Free digital catalog setup</span>
                </span>
              </Flex>
            </Col>

            {/* Right Column: Interactive Live Merchant Console Mock & CTA Buttons */}
            <Col xs={24} lg={9}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  alignItems: isMobile ? 'stretch' : 'flex-end',
                }}
              >
                {/* Live Console with Animated Tickers & Order Toasts */}
                <div style={{ width: '100%', maxWidth: 360 }}>
                  <LiveDashboardMock />
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    flexWrap: 'wrap',
                    justifyContent: isMobile ? 'stretch' : 'flex-end',
                    width: '100%',
                  }}
                >
                  {/* Sell on Rquest Dark Pill Button */}
                  <button
                    type="button"
                    onClick={() => history.push(Routes.client)}
                    style={{
                      background: '#23150F',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: radii.full,
                      padding: '12px 26px',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 4px 12px rgba(35, 21, 15, 0.25)',
                      transition: 'all 0.18s ease',
                      flex: isMobile ? '1 1 100%' : 'initial',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    <span>Sell on Rquest</span>
                    <span style={{ fontSize: 14 }}>→</span>
                  </button>

                  {/* See How It Works White Pill Button */}
                  <button
                    type="button"
                    onClick={() => setIsMerchantExplainerOpen(true)}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #D7C6B4',
                      color: '#1C1917',
                      borderRadius: radii.full,
                      padding: '11px 22px',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'all 0.18s ease',
                      flex: isMobile ? '1 1 100%' : 'initial',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#FAF6F0')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                  >
                    <PlayCircleOutlined style={{ fontSize: 15 }} />
                    <span>See how it works</span>
                  </button>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* =========================================================================
          MODALS & DRAWERS
          ========================================================================= */}
      {/* 1. Leaflet Interactive Map Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EnvironmentOutlined style={{ color: '#0B2D6B' }} />
            <span>Select Your Neighborhood Location</span>
          </div>
        }
        open={isModalVisible}
        onCancel={handleCloseModal}
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
            onClick={handleCloseModal}
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
          setIsVoiceModalOpen(false);
          history.push(`/search?q=${encodeURIComponent(transcript)}`);
        }}
      />

      {/* 3. Image Search Modal */}
      <ImageSearchModal
        open={isImageModalOpen}
        visible={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onSearch={(term) => {
          setIsImageModalOpen(false);
          history.push(`/search?q=${encodeURIComponent(term)}`);
        }}
        onSelect={(term) => {
          setIsImageModalOpen(false);
          history.push(`/search?q=${encodeURIComponent(term)}`);
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

      {/* 6. Merchant "How It Works" Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🏪</span>
            <span style={{ fontFamily: 'var(--font-headline)', fontSize: 20, fontWeight: 700 }}>
              How Selling on Rquest Works
            </span>
          </div>
        }
        open={isMerchantExplainerOpen}
        onCancel={() => setIsMerchantExplainerOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsMerchantExplainerOpen(false)}>
            Close
          </Button>,
          <Button
            key="register"
            type="primary"
            onClick={() => {
              setIsMerchantExplainerOpen(false);
              history.push(Routes.client);
            }}
            style={{ borderRadius: radii.md }}
          >
            Start Free Store Setup →
          </Button>,
        ]}
        width={560}
      >
        <div style={{ padding: '12px 0' }}>
          <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#EFF6FF',
                color: '#0B2D6B',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              1
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: 14, marginBottom: 2 }}>
                List Your Store in 5 Minutes
              </div>
              <div style={{ color: '#64748B', fontSize: 13, lineHeight: 1.5 }}>
                Add your store address, category, business hours, and snap photos of products or daily specials directly on your phone.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#ECFDF5',
                color: '#047857',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              2
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: 14, marginBottom: 2 }}>
                Instant Neighborhood Radar Visibility
              </div>
              <div style={{ color: '#64748B', fontSize: 13, lineHeight: 1.5 }}>
                Nearby residents within your 1–5 km radius see your live inventory and status when searching for everyday essentials.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#FEF3C7',
                color: '#92400E',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              3
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: 14, marginBottom: 2 }}>
                Direct Messaging & 100% Direct UPI
              </div>
              <div style={{ color: '#64748B', fontSize: 13, lineHeight: 1.5 }}>
                Chat in real time with customers to clarify orders. Receive 100% of customer payments directly to your bank account with 0% commissions.
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* 7. Sticky Floating Neighborhood Radar Pill Bar during Scroll */}
      {showStickyBar && !isStickyDismissed && (
        <div className="sticky-neighborhood-bar">
          <div className="sticky-radar-pulse" />
          <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: '#110E28', whiteSpace: 'nowrap' }}>
            ⚡ {activeMerchantCount > 0 ? `${activeMerchantCount} verified shops` : 'Verified shops'}
            {!isMobile && (
              <>
                {' open in '}
                <span style={{ color: '#0159C5' }}>{cleanAreaName}</span>
              </>
            )}
          </span>
          <button
            type="button"
            onClick={() => {
              history.push('/search');
            }}
            style={{
              background: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: radii.full,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.2)',
            }}
          >
            <span>Search ↑</span>
          </button>
          <button
            type="button"
            onClick={() => setIsStickyDismissed(true)}
            title="Dismiss notification"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              fontSize: 13,
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CloseOutlined />
          </button>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;
