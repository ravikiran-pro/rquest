import React, { useEffect, useState } from 'react';
import {
  Form,
  Input,
  Button,
  Typography,
  Row,
  Col,
  Tag,
  Checkbox,
  message,
  Flex,
  Spin,
  Modal,
  Alert,
} from 'antd';
import {
  EnvironmentOutlined,
  PhoneOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  EditOutlined,
  AimOutlined,
  ShoppingOutlined,
  CoffeeOutlined,
  MedicineBoxOutlined,
  ToolOutlined,
  SmileOutlined,
  ShopOutlined,
  CheckOutlined,
  EyeOutlined,
  ShareAltOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import { apiConfig, netWorkCall, getPreciseUserLocation, getLocationName } from '../../app/utils';
import { LeafletComponent } from '../../app/components';
import { useGlobalStore } from '../../app/services';
import { useHistory, useLocation } from 'react-router-dom';
import ManageStore from './manage_store';
import { colors } from '../../app/styles/theme';
import './client_register.css';
import './onboarding.css';

const { Title, Text, Paragraph } = Typography;

// Real-world, clean local business categories (no cheesy emojis or AI placeholders)
const STORE_CATEGORIES = [
  {
    id: 'groceries',
    title: 'Grocery & Supermarket',
    icon: <ShoppingOutlined />,
    desc: 'Daily essentials, packaged goods, staples & provisions',
    shop_type: 'Provision Store',
    category_id: 0,
    defaultImage: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=80',
    starters: [
      { name: 'Chakki Atta Flour (5kg)', price: 235, mrp: 260, unit: 'pack', listing_type: 'product' },
      { name: 'Refined Sunflower Oil (1L)', price: 130, mrp: 150, unit: 'pouch', listing_type: 'product' },
      { name: 'Basmati Rice (1kg)', price: 95, mrp: 110, unit: 'pack', listing_type: 'product' },
    ],
  },
  {
    id: 'food',
    title: 'Restaurant & Eatery',
    icon: <CoffeeOutlined />,
    desc: 'Hot meals, snacks, cafes, bakeries & cloud kitchens',
    shop_type: 'Food & Dining',
    category_id: 7,
    defaultImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=80',
    starters: [
      { name: 'Chicken Dum Biryani (Full)', price: 220, unit: 'plate', listing_type: 'food' },
      { name: 'Paneer Butter Masala', price: 180, unit: 'portion', listing_type: 'food' },
      { name: 'Fresh Mint Lime Juice', price: 50, unit: 'glass', listing_type: 'food' },
    ],
  },
  {
    id: 'pharmacy',
    title: 'Pharmacy & Wellness',
    icon: <MedicineBoxOutlined />,
    desc: 'Medicines, first aid, healthcare devices & wellness products',
    shop_type: 'Health & Medicine',
    category_id: 8,
    defaultImage: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
    starters: [
      { name: 'Paracetamol 500mg (Strip of 10)', price: 30, mrp: 35, unit: 'strip', listing_type: 'product' },
      { name: 'Digital Thermometer', price: 450, mrp: 600, unit: 'piece', listing_type: 'product' },
      { name: 'First Aid Antiseptic Liquid (100ml)', price: 65, mrp: 72, unit: 'bottle', listing_type: 'product' },
    ],
  },
  {
    id: 'repairs',
    title: 'Technician & Home Repairs',
    icon: <ToolOutlined />,
    desc: 'Electricians, plumbers, AC service, appliance repair',
    shop_type: 'Hardware and tools',
    category_id: 4,
    defaultImage: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&auto=format&fit=crop&q=80',
    starters: [
      { name: 'Doorstep Inspection & Safety Check', price: 199, unit: 'visit', listing_type: 'service' },
      { name: 'AC Filter Cleaning & Gas Check', price: 499, unit: 'service', listing_type: 'service' },
    ],
  },
  {
    id: 'salon',
    title: 'Salon, Spa & Beauty',
    icon: <SmileOutlined />,
    desc: 'Hair styling, grooming, spa & wellness services',
    shop_type: 'Small business',
    category_id: 14,
    defaultImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&auto=format&fit=crop&q=80',
    starters: [
      { name: 'Men’s Haircut & Styling', price: 150, unit: 'session', listing_type: 'service' },
      { name: 'Herbal Glow Facial (45 min)', price: 699, unit: 'session', listing_type: 'service' },
    ],
  },
  {
    id: 'retail',
    title: 'Local Retail & Boutique',
    icon: <ShopOutlined />,
    desc: 'Clothing, footwear, stationery, gifts & home goods',
    shop_type: 'Small business',
    category_id: 12,
    defaultImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80',
    starters: [
      { name: 'Cotton Round-Neck T-Shirt', price: 399, mrp: 599, unit: 'piece', listing_type: 'product' },
      { name: 'Classic Leather Wallet', price: 450, mrp: 699, unit: 'piece', listing_type: 'product' },
    ],
  },
];


const DEFAULT_CENTER = [12.9716, 77.5946];
const MERCHANT_ROLE_ID = 'a5e858d8-636c-4fc3-8c3a-0a76131c95e5';
const STEP_LABELS = ['Business', 'Location', 'Fulfillment', 'Review'];
const STEP_TITLES = ['Business details', 'Store location', 'Fulfillment & payments', 'Review & launch'];
const MAP_TILE_URL = 'https://{s}.google.com/vt?lyrs=m&x={x}&y={y}&z={z}';
const MAP_TILE_SUBDOMAINS = ['mt0', 'mt1', 'mt2', 'mt3'];

// Turns the platform settings (GET platform/settings) into a notice when new registrations are off
const registrationNoticeFromSettings = (settings) => {
  if (!settings) return null;
  if (settings.maintenance_mode) {
    return {
      title: 'Store registrations are paused',
      description: settings.maintenance_message || 'Rquest is down for maintenance. Please check back shortly.',
    };
  }
  if (settings.allow_new_shop_registrations === false) {
    return {
      title: 'New store registrations are closed',
      description: 'Please check back later or contact Rquest support.',
    };
  }
  return null;
};

const storeUrl = (shop) => `${window.location.origin}/shop/${shop.id}`;

const ClientRegister = () => {
  const location = useLocation();
  const history = useHistory();

  const { user_data, update_user_data } = useGlobalStore((state) => state);

  const [allShops, setAllShops] = useState([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [managedShop, setManagedShop] = useState(null);
  const [isFormEnable, setIsFormEnable] = useState(false);
  const [platformSettings, setPlatformSettings] = useState(null);
  // Set when the server refuses a registration (403 REGISTRATIONS_CLOSED or 503 maintenance)
  const [closedNotice, setClosedNotice] = useState(null);

  const isOnboardingShop = new URLSearchParams(location.search).get('onboarding') === 'shop';

  useEffect(() => {
    if (isOnboardingShop) {
      setIsFormEnable(true);
    }
  }, [isOnboardingShop]);

  // Guided Onboarding Wizard State
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('groceries');
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);
  const [position, setPosition] = useState(DEFAULT_CENTER);
  const [pinSet, setPinSet] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [onboardingData, setOnboardingData] = useState({
    shop_name: '',
    address: '',
    area: '',
    mobile_number: user_data?.mobile || '',
    website: '',
    directions: '',
    img_url: STORE_CATEGORIES[0].defaultImage,
    fulfillment_modes: ['pickup', 'delivery'],
    payment_modes: ['direct_upi', 'cod'],
    populate_starters: true,
  });

  // Public platform settings: is new store registration open right now?
  useEffect(() => {
    let cancelled = false;
    netWorkCall(apiConfig.platform_settings, 'GET', null, false)
      .then((res) => {
        if (!cancelled && res?.success && res.data) setPlatformSettings(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const registrationNotice = closedNotice || registrationNoticeFromSettings(platformSettings);
  const registrationsOpen = !registrationNotice;

  const fetchAllShops = async () => {
    setLoadingShops(true);
    try {
      const response = await netWorkCall(apiConfig.my_shops, 'POST', null, true);
      if (response?.success && response?.data) {
        setAllShops(response.data);
        if (response.data.length === 0) {
          setIsFormEnable(true); // Open onboarding if merchant has 0 shops
        } else {
          // The ?shop_id= outlet opens only when no outlet is already being managed,
          // so a refresh after a save never pulls the owner back to the URL's outlet.
          const params = new URLSearchParams(location.search);
          const queryShopId = params.get('shop_id');
          if (queryShopId) {
            const found = response.data.find((s) => s.id === queryShopId);
            if (found) setManagedShop((prev) => prev ?? found);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching shops:', err);
    } finally {
      setLoadingShops(false);
    }
  };

  useEffect(() => {
    fetchAllShops();
  }, []);

  const startRegistration = () => {
    setIsFormEnable(true);
    setCurrentStep(0);
  };

  // Outlet switch from inside ManageStore: keep the URL's ?shop_id= in step
  // so a refresh or back navigation lands on the same outlet.
  const handleSwitchShop = (target) => {
    setManagedShop(target);
    const params = new URLSearchParams(location.search);
    params.set('shop_id', target.id);
    history.replace({ pathname: location.pathname, search: `?${params.toString()}`, hash: location.hash });
  };

  const shareStore = async (shop) => {
    const url = storeUrl(shop);
    try {
      if (navigator.share) {
        await navigator.share({ title: shop.shop_name, url });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        message.success('Store link copied');
        return;
      }
      message.info(url);
    } catch (err) {
      if (err?.name !== 'AbortError') message.error('Could not share this store');
    }
  };

  const handleSelectCategory = (catId) => {
    setSelectedCategory(catId);
    const cat = STORE_CATEGORIES.find((c) => c.id === catId);
    if (cat) {
      setOnboardingData((prev) => ({
        ...prev,
        img_url: cat.defaultImage,
      }));
    }
  };

  const handleAutoDetectGps = async () => {
    setDetectingGps(true);
    try {
      const coords = await getPreciseUserLocation(true);
      if (coords && coords.length === 2) {
        setPosition(coords);
        setPinSet(true);
        const name = await getLocationName(coords[0], coords[1]);
        if (name) {
          setOnboardingData((prev) => ({
            ...prev,
            area: prev.area || name,
          }));
          message.success('GPS coordinates detected and applied');
        }
      }
    } catch (err) {
      console.warn('GPS detection error:', err);
      message.warning('Could not detect location. You can adjust the pin on the map.');
    } finally {
      setDetectingGps(false);
    }
  };

  const handleToggleFulfillment = (mode) => {
    setOnboardingData((prev) => {
      const exists = prev.fulfillment_modes.includes(mode);
      const updated = exists
        ? prev.fulfillment_modes.filter((m) => m !== mode)
        : [...prev.fulfillment_modes, mode];
      return { ...prev, fulfillment_modes: updated.length > 0 ? updated : ['pickup'] };
    });
  };

  const handleTogglePayment = (mode) => {
    setOnboardingData((prev) => {
      const exists = prev.payment_modes.includes(mode);
      const updated = exists
        ? prev.payment_modes.filter((m) => m !== mode)
        : [...prev.payment_modes, mode];
      return { ...prev, payment_modes: updated.length > 0 ? updated : ['direct_upi'] };
    });
  };

  const handleNextStep = () => {
    if (currentStep === 0) {
      if (!onboardingData.shop_name.trim()) {
        message.error('Please enter your store or business name');
        return;
      }
      if (!onboardingData.mobile_number.trim()) {
        message.error('Please enter a phone number for customer orders');
        return;
      }
    }
    if (currentStep === 1) {
      if (!onboardingData.address.trim() || !onboardingData.area.trim()) {
        message.error('Please provide store street address and locality');
        return;
      }
    }
    setCurrentStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleFinishOnboarding = async () => {
    setSubmitting(true);
    try {
      const activeCat = STORE_CATEGORIES.find((c) => c.id === selectedCategory);
      const payload = {
        owner_id: user_data?.user_id,
        shop_name: onboardingData.shop_name.trim(),
        shop_type: activeCat?.shop_type || 'Small business',
        address: onboardingData.address.trim(),
        area: onboardingData.area.trim(),
        mobile_number: onboardingData.mobile_number.trim(),
        website: onboardingData.website ? onboardingData.website.trim() : '',
        directions: onboardingData.directions || `https://www.google.com/maps/@${position[0]},${position[1]}`,
        img_url: onboardingData.img_url || activeCat?.defaultImage,
        category_id: activeCat?.category_id !== undefined && activeCat?.category_id !== null ? activeCat.category_id : null,
        sub_category_id: null,
        allow_multi_category: false,
        latitude: position[0],
        longitude: position[1],
        rating: 5.0,
      };

      const shopRes = await netWorkCall(apiConfig.register_shop, 'POST', JSON.stringify(payload), true);

      if (shopRes?.success && shopRes?.data) {
        const newShop = shopRes.data;
        message.success(`${newShop.shop_name} registered successfully!`);

        // Promote role in client memory immediately
        if (update_user_data && user_data) {
          update_user_data({
            ...user_data,
            role_id: MERCHANT_ROLE_ID,
            role: 'client',
            role_name: 'client',
          });
        }

        // Seed starter listings if opted in
        if (onboardingData.populate_starters && activeCat?.starters) {
          for (const starter of activeCat.starters) {
            await netWorkCall(
              apiConfig.listings_create,
              'POST',
              JSON.stringify({
                shop_id: newShop.id,
                name: starter.name,
                price: starter.price,
                mrp: starter.mrp || null,
                unit: starter.unit,
                listing_type: starter.listing_type,
                metadata: {},
                is_available: true,
                // Starter items may skip the category form's required fields
                is_starter: true,
              }),
              true
            ).catch(() => {});
          }
        }

        await fetchAllShops();
        setIsFormEnable(false);
        setCurrentStep(0);
        setManagedShop(newShop);
      } else if (shopRes?.code === 'REGISTRATIONS_CLOSED' || shopRes?.code === 'MAINTENANCE') {
        // 403 (registrations closed) or 503 (maintenance): show the server's words and stop
        setClosedNotice({
          title: shopRes.error || 'Store registrations are unavailable',
          description: shopRes.message || '',
        });
      } else {
        message.error(shopRes?.message || 'Error registering store');
      }
    } catch (err) {
      console.error('Onboarding submit error:', err);
      message.error('Registration failed. Please check network and details.');
    } finally {
      setSubmitting(false);
    }
  };

  // If a store is selected, open the ManageStore hub inside the warm merchant canvas
  if (managedShop) {
    return (
      <div className="merchant-page-wrapper onb-page">
        <div className="merchant-ambient-dots" />
        <ManageStore
          shop={managedShop}
          allShops={allShops}
          onSwitchShop={handleSwitchShop}
          onClose={() => setManagedShop(null)}
          onRefreshShop={fetchAllShops}
        />
      </div>
    );
  }

  const activeCategoryObj = STORE_CATEGORIES.find((c) => c.id === selectedCategory);
  const categoryTitle = activeCategoryObj?.title;
  const areaLine = [onboardingData.address || 'Address', onboardingData.area || 'Neighborhood'].join(', ');

  const registrationAlert = registrationNotice && (
    <Alert
      className="onb-submit-alert"
      type="warning"
      showIcon
      message={registrationNotice.title}
      description={registrationNotice.description}
    />
  );

  const renderCategoryGrid = () => (
    <div className="store-category-grid">
      {STORE_CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => handleSelectCategory(cat.id)}
            className={`store-category-card ${isSelected ? 'selected' : ''}`}
          >
            <div className="store-category-icon">{cat.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="store-category-title">{cat.title}</div>
              <div className="store-category-desc">{cat.desc}</div>
            </div>
            {isSelected && <CheckOutlined className="onb-check" />}
          </button>
        );
      })}
    </div>
  );

  const renderReviewRow = (label, value, stepIdx) => (
    <div className="onb-review-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
      <Button type="link" size="small" icon={<EditOutlined />} onClick={() => setCurrentStep(stepIdx)} aria-label={`Edit ${label}`}>
        Edit
      </Button>
    </div>
  );

  return (
    <div className="merchant-page-wrapper onb-page">
      <div className="merchant-ambient-dots" />
      <div className="merchant-page-shell onb-shell">
        {/* VIEW A: Merchant Outlets Hub (When not onboarding) */}
        {!isFormEnable && (
          <div>
            <div className="onb-hub-head">
              <div className="onb-hub-head-text">
                <Title level={3} className="onb-title">
                  Merchant Studio &amp; Outlets
                </Title>
                <Text className="onb-sub">
                  Manage your stores ({allShops.length} active), live customer orders &amp; catalog.
                </Text>
              </div>
              <Button
                type="primary"
                size="large"
                className="onb-hub-cta"
                icon={<PlusOutlined />}
                disabled={!registrationsOpen}
                onClick={startRegistration}
              >
                Register new store
              </Button>
            </div>

            {registrationAlert}

            {/* Stores grid */}
            {loadingShops ? (
              <Flex justify="center" align="center" style={{ minHeight: '30vh' }}>
                <Spin size="large" aria-label="Loading your stores" />
              </Flex>
            ) : allShops.length === 0 ? (
              <div className="onb-state">
                <div className="onb-state-icon">
                  <ShopOutlined />
                </div>
                <Title level={4} className="onb-state-title">
                  Register your first store
                </Title>
                <Paragraph className="onb-state-text">
                  Put your store in front of nearby customers. List your products, receive orders and connect directly
                  with your neighbourhood.
                </Paragraph>
                <ul className="onb-state-points">
                  <li>
                    <CheckOutlined /> List your products
                  </li>
                  <li>
                    <CheckOutlined /> Take direct orders
                  </li>
                  <li>
                    <CheckOutlined /> Share one storefront link
                  </li>
                </ul>
                <Button type="primary" size="large" disabled={!registrationsOpen} onClick={startRegistration}>
                  Start storefront setup
                </Button>
              </div>
            ) : (
              <div className="onb-store-grid">
                {allShops.map((shop) => (
                  <article key={shop.id} className="onb-store-card">
                    <div className="onb-store-top">
                      <div className="onb-thumb">
                        <img src={shop.img_url || STORE_CATEGORIES[0].defaultImage} alt="" />
                      </div>
                      <div className="onb-store-info">
                        <h3 className="onb-store-name" title={shop.shop_name}>
                          {shop.shop_name}
                        </h3>
                        <div className="onb-store-meta">
                          <Tag>{shop.shop_type || 'Store outlet'}</Tag>
                          <span className="onb-store-area">
                            <EnvironmentOutlined />
                            {shop.area || 'Local outlet'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className={`onb-store-address ${shop.address ? '' : 'onb-store-address--empty'}`}>
                      {shop.address || 'Address not set'}
                    </p>

                    <div className="onb-store-actions">
                      <Button
                        type="primary"
                        className="onb-action-primary"
                        icon={<EditOutlined />}
                        onClick={() => setManagedShop(shop)}
                      >
                        Manage
                      </Button>
                      <Button icon={<EyeOutlined />} onClick={() => history.push(`/shop/${shop.id}`)}>
                        View storefront
                      </Button>
                      <Button icon={<ShareAltOutlined />} onClick={() => shareStore(shop)}>
                        Share
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW B: Interactive Guided Store Onboarding Wizard */}
        {isFormEnable && (
          <div className="onb-wizard">
            {allShops.length > 0 && (
              <Button
                type="text"
                className="onb-back"
                icon={<ArrowLeftOutlined />}
                onClick={() => setIsFormEnable(false)}
              >
                Back to Merchant Studio
              </Button>
            )}

            <div className="onb-card">
              <div className="onb-wizard-head">
                <Title level={3} className="onb-title">
                  Storefront Registration
                </Title>
              </div>

              {registrationAlert}

              {/* Step progress: numbered, labels collapse to a caption on phones */}
              <ol className="onb-steps" aria-label="Registration progress">
                {STEP_LABELS.map((label, idx) => {
                  const state = idx < currentStep ? 'is-done' : idx === currentStep ? 'is-current' : '';
                  return (
                    <li key={label} className={`onb-step ${state}`} aria-current={idx === currentStep ? 'step' : undefined}>
                      <button
                        type="button"
                        className="onb-step-btn"
                        disabled={idx > currentStep}
                        onClick={() => setCurrentStep(idx)}
                        aria-label={`Step ${idx + 1}: ${label}`}
                      >
                        <span className="onb-step-num">{idx < currentStep ? <CheckOutlined /> : idx + 1}</span>
                        <span className="onb-step-label">{label}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <div className="onb-step-caption">
                Step {currentStep + 1} of {STEP_LABELS.length}: <strong>{STEP_TITLES[currentStep]}</strong>
              </div>

              {/* STEP 0: Business Category & Identity */}
              {currentStep === 0 && (
                <div>
                  <div className="onb-section-title">1. Choose your business category</div>
                  <span className="onb-section-hint">Select the category that best describes what you sell.</span>

                  {renderCategoryGrid()}

                  <Form layout="vertical">
                    <Row gutter={[16, 0]}>
                      <Col xs={24} md={12}>
                        <Form.Item label="Store / outlet name" required>
                          <Input
                            size="large"
                            placeholder="e.g. City Supermarket, Biryani Pot, HealthPlus Pharmacy"
                            value={onboardingData.shop_name}
                            onChange={(e) => setOnboardingData({ ...onboardingData, shop_name: e.target.value })}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item label="Orders phone / WhatsApp number" required>
                          <Input
                            size="large"
                            prefix={<PhoneOutlined style={{ color: colors.textLight }} />}
                            placeholder="10-digit mobile number"
                            value={onboardingData.mobile_number}
                            onChange={(e) => setOnboardingData({ ...onboardingData, mobile_number: e.target.value })}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </div>
              )}

              {/* STEP 1: Store Location & Neighborhood */}
              {currentStep === 1 && (
                <div>
                  <div className="onb-section-title">2. Store physical location</div>
                  <span className="onb-section-hint">
                    Pin your shop on the map so nearby shoppers can find you within 1–5 km.
                  </span>

                  <div className="onb-loc-card">
                    <div className={`onb-loc-status ${pinSet ? 'is-set' : ''}`}>
                      <span className="onb-loc-status-icon">
                        <EnvironmentOutlined />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div className="onb-loc-status-title">{pinSet ? 'Pin saved' : 'Pin not set yet'}</div>
                        <div className="onb-loc-status-sub">
                          Lat {position[0]?.toFixed(4)}, Lon {position[1]?.toFixed(4)}
                        </div>
                      </div>
                    </div>

                    <div className="onb-map-inline">
                      <MapContainer
                        key={position.join(',')}
                        center={position}
                        zoom={15}
                        scrollWheelZoom={false}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer url={MAP_TILE_URL} subdomains={MAP_TILE_SUBDOMAINS} />
                        <CircleMarker
                          center={position}
                          radius={9}
                          pathOptions={{ color: colors.primary, fillColor: colors.primary, fillOpacity: 0.9 }}
                        />
                      </MapContainer>
                    </div>

                    <div className="onb-loc-actions">
                      <Button icon={<AimOutlined />} loading={detectingGps} onClick={handleAutoDetectGps}>
                        Auto-detect GPS
                      </Button>
                      <Button icon={<EditOutlined />} onClick={() => setIsMapModalVisible(true)}>
                        Adjust pin
                      </Button>
                    </div>
                  </div>

                  <Form layout="vertical">
                    <Row gutter={[16, 0]}>
                      <Col xs={24} md={12}>
                        <Form.Item label="Street address" required>
                          <Input
                            size="large"
                            placeholder="e.g. 24/A Perambur Barracks Road"
                            value={onboardingData.address}
                            onChange={(e) => setOnboardingData({ ...onboardingData, address: e.target.value })}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item label="Locality / neighbourhood" required>
                          <Input
                            size="large"
                            placeholder="e.g. Indiranagar, Anna Nagar, HSR Layout"
                            value={onboardingData.area}
                            onChange={(e) => setOnboardingData({ ...onboardingData, area: e.target.value })}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24}>
                        <Form.Item label="Google Maps link (optional)">
                          <Input
                            size="large"
                            placeholder="https://maps.app.goo.gl/..."
                            value={onboardingData.directions}
                            onChange={(e) => setOnboardingData({ ...onboardingData, directions: e.target.value })}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </div>
              )}

              {/* STEP 2: Fulfillment & Payments */}
              {currentStep === 2 && (
                <div>
                  <div className="onb-section-title">3. Fulfillment &amp; payments</div>
                  <span className="onb-section-hint">Choose how neighbourhood customers will order and pay.</span>

                  <div className="onb-block">
                    <span className="onb-section-hint" style={{ fontWeight: 600, color: colors.textMain, marginBottom: 8 }}>
                      Order fulfillment options
                    </span>
                    <div className="toggle-option-grid">
                      {[
                        { key: 'pickup', title: 'Store pickup', desc: 'Customers collect orders at your counter' },
                        { key: 'delivery', title: 'Local delivery', desc: 'Direct neighbourhood delivery dispatch' },
                      ].map((opt) => {
                        const active = onboardingData.fulfillment_modes.includes(opt.key);
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            aria-pressed={active}
                            onClick={() => handleToggleFulfillment(opt.key)}
                            className={`toggle-option-card ${active ? 'active' : ''}`}
                          >
                            <div>
                              <div className="toggle-option-title">{opt.title}</div>
                              <div className="toggle-option-desc">{opt.desc}</div>
                            </div>
                            {active && <CheckOutlined className="onb-check" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="onb-block">
                    <span className="onb-section-hint" style={{ fontWeight: 600, color: colors.textMain, marginBottom: 8 }}>
                      Accepted payment methods
                    </span>
                    <div className="toggle-option-grid">
                      {[
                        { key: 'direct_upi', title: 'Direct UPI / QR (0% fee)', desc: 'PhonePe, GPay, Paytm direct to your bank' },
                        { key: 'cod', title: 'Cash on delivery / counter', desc: 'Pay cash when collecting or receiving' },
                      ].map((opt) => {
                        const active = onboardingData.payment_modes.includes(opt.key);
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            aria-pressed={active}
                            onClick={() => handleTogglePayment(opt.key)}
                            className={`toggle-option-card ${active ? 'active' : ''}`}
                          >
                            <div>
                              <div className="toggle-option-title">{opt.title}</div>
                              <div className="toggle-option-desc">{opt.desc}</div>
                            </div>
                            {active && <CheckOutlined className="onb-check" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Form layout="vertical">
                    <div className="onb-cover-row">
                      <Form.Item label="Store cover photo URL (optional)">
                        <Input
                          size="large"
                          placeholder="https://images.unsplash.com/..."
                          value={onboardingData.img_url}
                          onChange={(e) => setOnboardingData({ ...onboardingData, img_url: e.target.value })}
                        />
                      </Form.Item>
                      <div className="onb-thumb onb-thumb--lg" aria-hidden="true">
                        {onboardingData.img_url ? <img src={onboardingData.img_url} alt="" /> : <ShopOutlined />}
                      </div>
                    </div>
                  </Form>
                </div>
              )}

              {/* STEP 3: Review & Launch */}
              {currentStep === 3 && (
                <div>
                  <div className="onb-section-title">4. Review storefront</div>
                  <span className="onb-section-hint">Preview how your outlet card will appear to nearby customers.</span>

                  <article className="onb-store-card" style={{ marginBottom: 16 }}>
                    <div className="onb-store-top">
                      <div className="onb-thumb onb-thumb--lg">
                        {onboardingData.img_url ? <img src={onboardingData.img_url} alt="" /> : <ShopOutlined />}
                      </div>
                      <div className="onb-store-info">
                        <h3 className="onb-store-name">{onboardingData.shop_name || 'My local store'}</h3>
                        <div className="onb-store-meta">
                          <Tag>{categoryTitle}</Tag>
                        </div>
                        <div className="onb-store-meta">
                          <span className="onb-store-area">
                            <EnvironmentOutlined />
                            {areaLine}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: colors.semantic.success, fontWeight: 600, marginTop: 6 }}>
                          Direct orders &middot; Contact: {onboardingData.mobile_number}
                        </div>
                      </div>
                    </div>
                  </article>

                  <dl className="onb-review-list">
                    {renderReviewRow('Store name', onboardingData.shop_name || '-', 0)}
                    {renderReviewRow('Category', categoryTitle || '-', 0)}
                    {renderReviewRow('Phone', onboardingData.mobile_number || '-', 0)}
                    {renderReviewRow('Address', areaLine, 1)}
                    {renderReviewRow(
                      'Fulfillment',
                      onboardingData.fulfillment_modes.map((m) => (m === 'pickup' ? 'Store pickup' : 'Local delivery')).join(', '),
                      2
                    )}
                    {renderReviewRow(
                      'Payments',
                      onboardingData.payment_modes
                        .map((m) => (m === 'direct_upi' ? 'Direct UPI / QR' : 'Cash on delivery / counter'))
                        .join(', '),
                      2
                    )}
                  </dl>

                  <div className="onb-starter-box">
                    <Checkbox
                      checked={onboardingData.populate_starters}
                      onChange={(e) => setOnboardingData({ ...onboardingData, populate_starters: e.target.checked })}
                    >
                      <span style={{ fontWeight: 600, color: colors.textMain, fontSize: 13 }}>
                        Pre-load starter sample catalog ({activeCategoryObj?.starters?.length} items)
                      </span>
                    </Checkbox>
                    <div className="onb-starter-hint">
                      Your store launches with sample catalog items that you can edit anytime.
                    </div>
                  </div>
                </div>
              )}

              {/* Stepper navigation: sticky above the bottom nav on phones and tablets */}
              <div className="onb-nav">
                {currentStep > 0 ? (
                  <Button onClick={handlePrevStep} icon={<ArrowLeftOutlined />}>
                    Previous
                  </Button>
                ) : (
                  <span />
                )}

                {currentStep < STEP_LABELS.length - 1 ? (
                  <Button type="primary" className="onb-nav-primary" onClick={handleNextStep}>
                    Continue <ArrowRightOutlined />
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    className="onb-nav-primary"
                    icon={<CheckOutlined />}
                    loading={submitting}
                    disabled={!registrationsOpen}
                    onClick={handleFinishOnboarding}
                  >
                    Launch storefront &amp; studio
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Full View Map Pin Modal */}
        <Modal
          open={isMapModalVisible}
          onCancel={() => setIsMapModalVisible(false)}
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
            isModalVisible={isMapModalVisible}
            markerLocation={position}
            setMarkerLocation={setPosition}
            updateMarker={(marker) => setPosition(marker)}
            searchMarkers={null}
            position={position}
            setPosition={setPosition}
            onClose={() => {
              setPinSet(true);
              setIsMapModalVisible(false);
            }}
          />
        </Modal>
      </div>
    </div>
  );
};

export default ClientRegister;
