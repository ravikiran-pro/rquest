import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Typography, Row, Col, Tag, message, Flex, Spin, Modal, Alert } from 'antd';
import {
  EnvironmentOutlined,
  PhoneOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  EditOutlined,
  AimOutlined,
  ShopOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  ShareAltOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import { apiConfig, netWorkCall, getPreciseUserLocation, getLocationName, USER_ROLES } from '../../app/utils';
import { LeafletComponent } from '../../app/components';
import { useGlobalStore } from '../../app/services';
import { useHistory, useLocation } from 'react-router-dom';
import ManageStore from './manage_store';
import { colors } from '../../app/styles/theme';
import './client_register.css';
import './onboarding.css';

const { Title, Text, Paragraph } = Typography;

// Pictures. The category names, ids and sub-categories come from GET /shops/my_categories.
const IMG = {
  grocery: '/images/stock/1578916171728-46686eac8d58.jpg',
  restaurant: '/images/stock/1555396273-367ea4eb4db5.jpg',
  pharmacy: '/images/stock/1584308666744-24d5c474f2ae.jpg',
  repairs: '/images/stock/1621905251189-08b45d6a269e.jpg',
  salon: '/images/stock/1560066984-138dadb4c035.jpg',
  retail: '/images/stock/1542838132-92c53300491e.jpg',
};

// Cover picture per category (keys match src/api/data/taxonomy.js), used until the owner picks one
const CATEGORY_IMAGES = {
  food_groceries: IMG.grocery,
  health_wellness: IMG.pharmacy,
  fashion_beauty: IMG.salon,
  electronics_appliances: IMG.retail,
  home_property: IMG.repairs,
  vehicles_travel: IMG.repairs,
  lifestyle_events: IMG.retail,
  business_professional: IMG.retail,
};

// Pictures for sub-categories that have a better one than their category's
const SUB_IMAGES = {
  restaurant: IMG.restaurant,
  fast_food: IMG.restaurant,
  cafe: IMG.restaurant,
  home_kitchen: IMG.restaurant,
  catering: IMG.restaurant,
  salon: IMG.salon,
  beauty_parlour: IMG.salon,
  makeup_artist: IMG.salon,
  home_repair: IMG.repairs,
  electronics_repair: IMG.repairs,
};

// Used only if the server does not send limits.max_sub_categories
const DEFAULT_MAX_SUB_CATEGORIES = 5;

const DEFAULT_CENTER = [12.9716, 77.5946];
const MERCHANT_ROLE_ID = USER_ROLES.MERCHANT;
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
  // Sub-category ids the owner picked, in pick order
  const [selectedSubIds, setSelectedSubIds] = useState([]);
  const [subSearch, setSubSearch] = useState('');
  // The category tree from the server: [{ id, key, name, sub_categories: [...] }]
  const [categoryTree, setCategoryTree] = useState([]);
  const [categoryTreeError, setCategoryTreeError] = useState(false);
  const [maxSubCategories, setMaxSubCategories] = useState(DEFAULT_MAX_SUB_CATEGORIES);
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
    img_url: IMG.grocery,
    fulfillment_modes: ['pickup', 'delivery'],
    payment_modes: ['direct_upi', 'cod'],
  });

  useEffect(() => {
    let cancelled = false;
    netWorkCall(apiConfig.my_categories, 'GET', null, false)
      .then((res) => {
        if (cancelled) return;
        if (res?.success && Array.isArray(res.data)) {
          setCategoryTree(res.data);
          const limit = Number(res.limits?.max_sub_categories);
          if (limit > 0) setMaxSubCategories(limit);
        } else {
          setCategoryTreeError(true);
        }
      })
      .catch(() => !cancelled && setCategoryTreeError(true));
    return () => {
      cancelled = true;
    };
  }, []);

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

  const imageFor = (catKey, subKey) => SUB_IMAGES[subKey] || CATEGORY_IMAGES[catKey] || IMG.retail;

  // Finds a server sub-category by id, with its category
  const findSub = (id) => {
    for (const cat of categoryTree) {
      const sub = cat.sub_categories?.find((sc) => sc.id === id);
      if (sub) return { cat, sub };
    }
    return null;
  };

  // The cover picture follows the first pick, as it did with the single pick before
  const updateSelection = (nextIds) => {
    setSelectedSubIds(nextIds);
    const first = nextIds.length ? findSub(nextIds[0]) : null;
    if (first) {
      setOnboardingData((prev) => ({ ...prev, img_url: imageFor(first.cat.key, first.sub.key) }));
    }
  };

  const toggleSubCategory = (id) => {
    if (selectedSubIds.includes(id)) {
      updateSelection(selectedSubIds.filter((x) => x !== id));
    } else if (selectedSubIds.length < maxSubCategories) {
      updateSelection([...selectedSubIds, id]);
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
      if (selectedSubIds.length === 0) {
        message.error('Please choose at least one business type');
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
      const picks = selectedSubIds.map(findSub).filter(Boolean);
      const payload = {
        owner_id: user_data?.user_id,
        shop_name: onboardingData.shop_name.trim(),
        shop_type: picks.map((p) => p.sub.name).join(', ').slice(0, 255) || 'Local business',
        address: onboardingData.address.trim(),
        area: onboardingData.area.trim(),
        mobile_number: onboardingData.mobile_number.trim(),
        website: onboardingData.website ? onboardingData.website.trim() : '',
        directions: onboardingData.directions || `https://www.google.com/maps/@${position[0]},${position[1]}`,
        img_url: onboardingData.img_url || IMG.grocery,
        sub_category_ids: selectedSubIds,
        // Several business types let the product form pick a sub-category per listing
        allow_multi_category: selectedSubIds.length > 1,
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

  const selectedPicks = selectedSubIds.map(findSub).filter(Boolean);
  const atSubLimit = selectedSubIds.length >= maxSubCategories;
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

  // Groups sub-categories under their category headings; the search matches names, keywords and descriptions
  const pickerQuery = subSearch.trim().toLowerCase();
  const pickerGroups = categoryTree
    .map((cat) => ({
      cat,
      subs: (cat.sub_categories || []).filter(
        (sc) =>
          !pickerQuery ||
          `${cat.name} ${sc.name} ${(sc.keywords || []).join(' ')} ${sc.description || ''}`.toLowerCase().includes(pickerQuery)
      ),
    }))
    .filter((group) => group.subs.length > 0);

  const jumpToGroup = (catKey) => {
    document.getElementById(`onb-group-${catKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderSubCategoryPicker = () => {
    if (categoryTreeError) {
      return (
        <Alert
          className="onb-submit-alert"
          type="error"
          showIcon
          message="Could not load business types. Check your connection and reload."
        />
      );
    }
    if (!categoryTree.length) {
      return (
        <Flex justify="center" align="center" style={{ minHeight: '20vh' }}>
          <Spin aria-label="Loading business types" />
        </Flex>
      );
    }

    return (
      <div className="onb-picker">
        <Input
          size="large"
          allowClear
          prefix={<SearchOutlined style={{ color: colors.textLight }} />}
          placeholder='Search, e.g. "tiffin", "xerox", "AC repair"'
          value={subSearch}
          onChange={(e) => setSubSearch(e.target.value)}
          aria-label="Search business types"
          className="onb-picker-search"
        />

        {/* Phones: category headings become horizontal tabs that jump to their group */}
        {pickerGroups.length > 0 && (
          <nav className="onb-group-tabs" aria-label="Jump to category">
            {pickerGroups.map(({ cat }) => (
              <button key={cat.key} type="button" className="onb-group-tab" onClick={() => jumpToGroup(cat.key)}>
                {cat.name}
              </button>
            ))}
          </nav>
        )}

        {pickerGroups.length === 0 && (
          <div className="onb-picker-empty">No business types match “{subSearch.trim()}”. Try a shorter word.</div>
        )}

        {pickerGroups.map(({ cat, subs }) => (
          <section key={cat.key} id={`onb-group-${cat.key}`} className="onb-group" aria-label={cat.name}>
            <h3 className="onb-group-title">{cat.name}</h3>
            <div className="onb-chip-grid">
              {subs.map((sc) => {
                const isOn = selectedSubIds.includes(sc.id);
                const isDisabled = !isOn && atSubLimit;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    aria-pressed={isOn}
                    disabled={isDisabled}
                    title={sc.description || sc.name}
                    onClick={() => toggleSubCategory(sc.id)}
                    className={`onb-chip ${isOn ? 'is-selected' : ''}`}
                  >
                    {isOn && <CheckOutlined aria-hidden="true" />}
                    <span>{sc.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {/* Sticky footer for the picker: count, removable picks and the cap notice */}
        <div className="onb-pick-tray" role="region" aria-label="Selected business types">
          <div className="onb-pick-count">
            <strong>
              {selectedSubIds.length} of {maxSubCategories}
            </strong>
            <span>selected</span>
          </div>
          {selectedPicks.length > 0 ? (
            <div className="onb-pick-tags">
              {selectedPicks.map(({ sub }) => (
                <button
                  key={sub.id}
                  type="button"
                  className="onb-pick-tag"
                  onClick={() => toggleSubCategory(sub.id)}
                  aria-label={`Remove ${sub.name}`}
                >
                  <span>{sub.name}</span>
                  <CloseOutlined aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : (
            <div className="onb-pick-empty">Pick at least one business type to continue.</div>
          )}
          {atSubLimit && (
            <div className="onb-pick-limit" role="status">
              You can add up to {maxSubCategories} categories. Remove one to add another.
            </div>
          )}
        </div>
      </div>
    );
  };

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
                        <img src={shop.img_url || IMG.grocery} alt="" />
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
                  <div className="onb-section-title">1. Choose your business types</div>
                  <span className="onb-section-hint">
                    Pick up to {maxSubCategories} that describe what you sell. Customers find you under each one.
                  </span>

                  {renderSubCategoryPicker()}

                  <Form layout="vertical" style={{ marginTop: 20 }}>
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
                          placeholder="https://example.com/product-photo"
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
                          {selectedPicks.map(({ sub }) => (
                            <Tag key={sub.id}>{sub.name}</Tag>
                          ))}
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
                    {renderReviewRow(
                      'Business types',
                      selectedPicks.length ? (
                        <span className="onb-review-tags">
                          {selectedPicks.map(({ sub }) => (
                            <span key={sub.id} className="onb-review-tag">
                              {sub.name}
                            </span>
                          ))}
                        </span>
                      ) : (
                        '-'
                      ),
                      0
                    )}
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
