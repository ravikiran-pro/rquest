import React, { useEffect, useState } from 'react';
import {
  Form,
  Input,
  Button,
  Typography,
  Row,
  Col,
  Tag,
  Card,
  Checkbox,
  message,
  Flex,
  Grid,
  Spin,
  Modal,
} from 'antd';
import {
  EnvironmentOutlined,
  PhoneOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  RocketOutlined,
  EditOutlined,
  AimOutlined,
  ShoppingOutlined,
  CoffeeOutlined,
  MedicineBoxOutlined,
  ToolOutlined,
  SmileOutlined,
  ShopOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { apiConfig, netWorkCall, getPreciseUserLocation, getLocationName } from '../../app/utils';
import { LeafletComponent } from '../../app/components';
import { useGlobalStore } from '../../app/services';
import { useLocation, useHistory } from 'react-router-dom';
import ManageStore from './manage_store';
import './client_register.css';

const { Title, Text, Paragraph } = Typography;

// Real-world, clean local business categories (no cheesy emojis or AI placeholders)
const STORE_CATEGORIES = [
  {
    id: 'groceries',
    title: 'Grocery & Supermarket',
    icon: <ShoppingOutlined />,
    desc: 'Daily essentials, packaged goods, staples & provisions',
    shop_type: 'Provision Store',
    category_id: null,
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
    shop_type: 'Hardawers and tools',
    category_id: null,
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
    category_id: null,
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
    category_id: null,
    category_id: 12,
    defaultImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80',
    starters: [
      { name: 'Cotton Round-Neck T-Shirt', price: 399, mrp: 599, unit: 'piece', listing_type: 'product' },
      { name: 'Classic Leather Wallet', price: 450, mrp: 699, unit: 'piece', listing_type: 'product' },
    ],
  },
];

const ClientRegister = () => {
  const history = useHistory();
  const screens = Grid.useBreakpoint();
  const location = useLocation();

  const { user_data, update_user_data } = useGlobalStore((state) => state);

  const [allShops, setAllShops] = useState([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [managedShop, setManagedShop] = useState(null);
  const [isFormEnable, setIsFormEnable] = useState(false);

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
  const [position, setPosition] = useState([12.9716, 77.5946]);
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

  const fetchAllShops = async () => {
    setLoadingShops(true);
    try {
      const response = await netWorkCall(apiConfig.my_shops, 'POST', null, true);
      if (response?.success && response?.data) {
        setAllShops(response.data);
        if (response.data.length === 0) {
          setIsFormEnable(true); // Open onboarding if merchant has 0 shops
        } else {
          const params = new URLSearchParams(location.search);
          const queryShopId = params.get('shop_id');
          if (queryShopId) {
            const found = response.data.find((s) => s.id === queryShopId);
            if (found) setManagedShop(found);
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
        category_id: activeCat?.category_id || null,
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
            role_id: 'a5e858d8-636c-4fc3-8c3a-0a76131c95e5',
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
              }),
              true
            ).catch(() => {});
          }
        }

        await fetchAllShops();
        setIsFormEnable(false);
        setCurrentStep(0);
        setManagedShop(newShop);
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

  // If a store is selected, open the ManageStore hub
  if (managedShop) {
    return (
      <ManageStore
        shop={managedShop}
        allShops={allShops}
        onSwitchShop={(target) => setManagedShop(target)}
        onClose={() => setManagedShop(null)}
        onRefreshShop={fetchAllShops}
      />
    );
  }

  const activeCategoryObj = STORE_CATEGORIES.find((c) => c.id === selectedCategory);

  return (
    <div className="merchant-page-shell">
      {/* VIEW A: Merchant Outlets Hub (When not onboarding) */}
      {!isFormEnable && (
        <div>
          {/* Header Card */}
          <Card
            className="profile-clean-card"
            styles={{ body: { padding: screens.xs ? '18px 14px' : '22px 24px' } }}
          >
            <Flex justify="space-between" align="center" wrap="wrap" gap={14}>
              <div>
                <Title level={3} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
                  Merchant Studio & Outlets
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Manage your direct stores ({allShops.length} active), live customer orders & catalog.
                </Text>
              </div>

              <Button
                type="primary"
                size="large"
                onClick={() => {
                  setIsFormEnable(true);
                  setCurrentStep(0);
                }}
                style={{
                  borderRadius: 8,
                  fontWeight: 700,
                  background: '#0f172a',
                  borderColor: '#0f172a',
                  height: 42,
                }}
              >
                + Register New Outlet
              </Button>
            </Flex>
          </Card>

          {/* Outlets Grid */}
          {loadingShops ? (
            <Flex justify="center" align="center" style={{ minHeight: '30vh' }}>
              <Spin size="large" tip="Loading Your Stores..." />
            </Flex>
          ) : allShops.length === 0 ? (
            <Card
              className="profile-clean-card"
              style={{ textAlign: 'center', padding: screens.xs ? '30px 16px' : '50px 20px' }}
            >
              <Title level={4} style={{ color: '#0f172a', fontWeight: 800 }}>
                No Stores Registered Yet
              </Title>
              <Paragraph type="secondary" style={{ fontSize: 13, maxWidth: 440, margin: '0 auto 20px' }}>
                Connect your business directly with local customers in your neighborhood with 0% aggregator markups.
              </Paragraph>
              <Button
                type="primary"
                size="large"
                onClick={() => setIsFormEnable(true)}
                style={{
                  borderRadius: 8,
                  fontWeight: 700,
                  background: '#0f172a',
                  borderColor: '#0f172a',
                  height: 42,
                }}
              >
                Start Storefront Setup
              </Button>
            </Card>
          ) : (
            <Row gutter={screens.xs ? [12, 12] : [16, 16]}>
              {allShops.map((shop) => (
                <Col xs={24} sm={12} md={8} key={shop.id}>
                  <Card
                    hoverable
                    className="profile-clean-card"
                    styles={{ body: { padding: '16px' } }}
                  >
                    <Flex gap={12} align="start" style={{ marginBottom: 12 }}>
                      <img
                        src={shop.img_url || STORE_CATEGORIES[0].defaultImage}
                        alt={shop.shop_name}
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 10,
                          objectFit: 'cover',
                          flexShrink: 0,
                          border: '1px solid #e2e8f0',
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Title level={5} ellipsis style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
                          {shop.shop_name}
                        </Title>
                        <Tag
                          style={{
                            marginTop: 4,
                            fontSize: 11,
                            borderRadius: 6,
                            background: '#f1f5f9',
                            color: '#334155',
                            border: 'none',
                            fontWeight: 600,
                          }}
                        >
                          {shop.shop_type || 'Store Outlet'}
                        </Tag>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                          <EnvironmentOutlined /> {shop.area || 'Local Outlet'}
                        </div>
                      </div>
                    </Flex>

                    <Paragraph
                      type="secondary"
                      ellipsis={{ rows: 2 }}
                      style={{ fontSize: 12, marginBottom: 14, minHeight: 36 }}
                    >
                      {shop.address || 'Address not set'}
                    </Paragraph>

                    <Button
                      type="primary"
                      block
                      icon={<EditOutlined />}
                      onClick={() => setManagedShop(shop)}
                      style={{
                        borderRadius: 8,
                        fontWeight: 700,
                        height: 38,
                        background: '#0f172a',
                        borderColor: '#0f172a',
                      }}
                    >
                      Open Store Studio
                    </Button>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      )}

      {/* VIEW B: Interactive Guided Store Onboarding Wizard */}
      {isFormEnable && (
        <div style={{ maxWidth: 740, margin: '0 auto' }}>
          {allShops.length > 0 && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => setIsFormEnable(false)}
              style={{ marginBottom: 14, fontWeight: 600, color: '#64748b' }}
            >
              Back to Merchant Studio
            </Button>
          )}

          <Card
            className="profile-clean-card"
            styles={{ body: { padding: screens.xs ? '18px 14px' : '26px 28px' } }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <Title level={3} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
                Storefront Registration
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Step {currentStep + 1} of 4 • {
                  currentStep === 0
                    ? 'Business Details'
                    : currentStep === 1
                    ? 'Store Location'
                    : currentStep === 2
                    ? 'Fulfillment & Payments'
                    : 'Review & Launch'
                }
              </Text>
            </div>

            {/* Mobile-Friendly Step Dots Indicator */}
            <div className="store-step-indicator">
              {[0, 1, 2, 3].map((stepIdx) => (
                <div
                  key={stepIdx}
                  className={`store-step-dot ${
                    currentStep === stepIdx
                      ? 'active'
                      : currentStep > stepIdx
                      ? 'completed'
                      : ''
                  }`}
                />
              ))}
            </div>

            {/* STEP 0: Business Category & Identity */}
            {currentStep === 0 && (
              <div>
                <Title level={5} style={{ marginBottom: 8, fontWeight: 700, color: '#0f172a' }}>
                  1. Choose Your Business Category
                </Title>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 14 }}>
                  Select the category that best describes what you sell.
                </Text>

                <div className="store-category-grid">
                  {STORE_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <div
                        key={cat.id}
                        onClick={() => handleSelectCategory(cat.id)}
                        className={`store-category-card ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="store-category-icon">{cat.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="store-category-title">{cat.title}</div>
                          <div className="store-category-desc">{cat.desc}</div>
                        </div>
                        {isSelected && <CheckOutlined style={{ color: '#4f46e5', fontSize: 12 }} />}
                      </div>
                    );
                  })}
                </div>

                <Form layout="vertical">
                  <Form.Item label="Store / Outlet Name" required style={{ marginBottom: 14 }}>
                    <Input
                      size="large"
                      placeholder="e.g. City Supermarket, Biryani Pot, HealthPlus Pharmacy"
                      value={onboardingData.shop_name}
                      onChange={(e) =>
                        setOnboardingData({ ...onboardingData, shop_name: e.target.value })
                      }
                      style={{ borderRadius: 8 }}
                    />
                  </Form.Item>

                  <Form.Item label="Orders Phone / WhatsApp Number" required style={{ marginBottom: 0 }}>
                    <Input
                      size="large"
                      prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="10-digit mobile number for order notifications"
                      value={onboardingData.mobile_number}
                      onChange={(e) =>
                        setOnboardingData({ ...onboardingData, mobile_number: e.target.value })
                      }
                      style={{ borderRadius: 8 }}
                    />
                  </Form.Item>
                </Form>
              </div>
            )}

            {/* STEP 1: Store Location & Neighborhood */}
            {currentStep === 1 && (
              <div>
                <Title level={5} style={{ marginBottom: 4, fontWeight: 700, color: '#0f172a' }}>
                  2. Store Physical Location
                </Title>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
                  Pin your shop on the map so nearby shoppers can find you within 1–5 km.
                </Text>

                {/* 1-Tap GPS Detection Box */}
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    marginBottom: 16,
                  }}
                >
                  <Flex justify="space-between" align="center" wrap="wrap" gap={10}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                        <EnvironmentOutlined style={{ color: '#4f46e5' }} /> Store GPS Coordinates
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Lat: {position[0]?.toFixed(4)}, Lon: {position[1]?.toFixed(4)}
                      </div>
                    </div>
                    <Flex gap={8}>
                      <Button
                        size="small"
                        icon={<AimOutlined />}
                        loading={detectingGps}
                        onClick={handleAutoDetectGps}
                        style={{ borderRadius: 6, fontWeight: 600, fontSize: 12 }}
                      >
                        Auto-Detect GPS
                      </Button>
                      <Button
                        size="small"
                        type="primary"
                        ghost
                        onClick={() => setIsMapModalVisible(true)}
                        style={{ borderRadius: 6, fontWeight: 600, fontSize: 12 }}
                      >
                        Adjust Pin
                      </Button>
                    </Flex>
                  </Flex>
                </div>

                <Form layout="vertical">
                  <Form.Item label="Street Address" required style={{ marginBottom: 14 }}>
                    <Input
                      size="large"
                      placeholder="e.g. 24/A Perambur Barracks Road"
                      value={onboardingData.address}
                      onChange={(e) =>
                        setOnboardingData({ ...onboardingData, address: e.target.value })
                      }
                      style={{ borderRadius: 8 }}
                    />
                  </Form.Item>

                  <Form.Item label="Locality / Neighborhood" required style={{ marginBottom: 14 }}>
                    <Input
                      size="large"
                      placeholder="e.g. Indiranagar, Anna Nagar, HSR Layout"
                      value={onboardingData.area}
                      onChange={(e) =>
                        setOnboardingData({ ...onboardingData, area: e.target.value })
                      }
                      style={{ borderRadius: 8 }}
                    />
                  </Form.Item>

                  <Form.Item label="Google Maps Link (Optional)" style={{ marginBottom: 0 }}>
                    <Input
                      placeholder="https://maps.app.goo.gl/..."
                      value={onboardingData.directions}
                      onChange={(e) =>
                        setOnboardingData({ ...onboardingData, directions: e.target.value })
                      }
                      style={{ borderRadius: 8 }}
                    />
                  </Form.Item>
                </Form>
              </div>
            )}

            {/* STEP 2: Fulfillment & Payments */}
            {currentStep === 2 && (
              <div>
                <Title level={5} style={{ marginBottom: 4, fontWeight: 700, color: '#0f172a' }}>
                  3. Fulfillment & Payments
                </Title>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
                  Choose how neighborhood customers will order and pay.
                </Text>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#334155' }}>
                    Order Fulfillment Options
                  </label>
                  <div className="toggle-option-grid">
                    <div
                      onClick={() => handleToggleFulfillment('pickup')}
                      className={`toggle-option-card ${
                        onboardingData.fulfillment_modes.includes('pickup') ? 'active' : ''
                      }`}
                    >
                      <div>
                        <div className="toggle-option-title">Store Pickup</div>
                        <div className="toggle-option-desc">Customers collect orders at your counter</div>
                      </div>
                      {onboardingData.fulfillment_modes.includes('pickup') && (
                        <CheckOutlined style={{ color: '#4f46e5' }} />
                      )}
                    </div>

                    <div
                      onClick={() => handleToggleFulfillment('delivery')}
                      className={`toggle-option-card ${
                        onboardingData.fulfillment_modes.includes('delivery') ? 'active' : ''
                      }`}
                    >
                      <div>
                        <div className="toggle-option-title">Local Delivery</div>
                        <div className="toggle-option-desc">Direct neighborhood delivery dispatch</div>
                      </div>
                      {onboardingData.fulfillment_modes.includes('delivery') && (
                        <CheckOutlined style={{ color: '#4f46e5' }} />
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#334155' }}>
                    Accepted Payment Methods
                  </label>
                  <div className="toggle-option-grid">
                    <div
                      onClick={() => handleTogglePayment('direct_upi')}
                      className={`toggle-option-card ${
                        onboardingData.payment_modes.includes('direct_upi') ? 'active' : ''
                      }`}
                    >
                      <div>
                        <div className="toggle-option-title">Direct UPI / QR (0% Fee)</div>
                        <div className="toggle-option-desc">PhonePe, GPay, Paytm direct to your bank</div>
                      </div>
                      {onboardingData.payment_modes.includes('direct_upi') && (
                        <CheckOutlined style={{ color: '#4f46e5' }} />
                      )}
                    </div>

                    <div
                      onClick={() => handleTogglePayment('cod')}
                      className={`toggle-option-card ${
                        onboardingData.payment_modes.includes('cod') ? 'active' : ''
                      }`}
                    >
                      <div>
                        <div className="toggle-option-title">Cash on Delivery / Counter</div>
                        <div className="toggle-option-desc">Pay cash when collecting or receiving</div>
                      </div>
                      {onboardingData.payment_modes.includes('cod') && (
                        <CheckOutlined style={{ color: '#4f46e5' }} />
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#334155' }}>
                    Store Cover Photo URL (Optional)
                  </label>
                  <Input
                    placeholder="https://images.unsplash.com/..."
                    value={onboardingData.img_url}
                    onChange={(e) =>
                      setOnboardingData({ ...onboardingData, img_url: e.target.value })
                    }
                    style={{ borderRadius: 8 }}
                  />
                </div>
              </div>
            )}

            {/* STEP 3: Review & Launch */}
            {currentStep === 3 && (
              <div>
                <Title level={5} style={{ marginBottom: 4, fontWeight: 700, color: '#0f172a' }}>
                  4. Review Storefront
                </Title>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
                  Preview how your outlet card will appear to nearby customers.
                </Text>

                {/* Live Storefront Card Preview */}
                <div className="store-preview-card">
                  <Flex gap={12} align="start">
                    <img
                      src={onboardingData.img_url}
                      alt="Store Cover"
                      className="store-preview-media"
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Title level={5} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
                        {onboardingData.shop_name || 'My Local Store'}
                      </Title>
                      <Tag
                        style={{
                          marginTop: 4,
                          fontSize: 11,
                          borderRadius: 6,
                          background: '#eef2ff',
                          color: '#4338ca',
                          border: 'none',
                          fontWeight: 700,
                        }}
                      >
                        {activeCategoryObj?.title}
                      </Tag>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        <EnvironmentOutlined /> {onboardingData.address || 'Address'}, {onboardingData.area || 'Neighborhood'}
                      </div>
                      <div style={{ fontSize: 11, color: '#166534', fontWeight: 600, marginTop: 4 }}>
                        Direct Orders • Contact: {onboardingData.mobile_number}
                      </div>
                    </div>
                  </Flex>
                </div>

                {/* Pre-populate Starter Items Checkbox */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '12px 14px',
                    marginBottom: 16,
                  }}
                >
                  <Checkbox
                    checked={onboardingData.populate_starters}
                    onChange={(e) =>
                      setOnboardingData({ ...onboardingData, populate_starters: e.target.checked })
                    }
                  >
                    <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>
                      Pre-load starter sample catalog ({activeCategoryObj?.starters?.length} items)
                    </span>
                  </Checkbox>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 3, marginLeft: 24 }}>
                    Your store launches with realistic catalog items that you can edit anytime.
                  </div>
                </div>
              </div>
            )}

            {/* Stepper Navigation */}
            <div className="store-step-nav">
              {currentStep > 0 ? (
                <Button onClick={handlePrevStep} style={{ borderRadius: 8, fontWeight: 600 }}>
                  <ArrowLeftOutlined /> Previous
                </Button>
              ) : (
                <div />
              )}

              {currentStep < 3 ? (
                <Button
                  type="primary"
                  onClick={handleNextStep}
                  style={{
                    borderRadius: 8,
                    fontWeight: 700,
                    background: '#0f172a',
                    borderColor: '#0f172a',
                    padding: '0 24px',
                  }}
                >
                  Continue <ArrowRightOutlined />
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<RocketOutlined />}
                  loading={submitting}
                  onClick={handleFinishOnboarding}
                  style={{
                    borderRadius: 8,
                    fontWeight: 700,
                    background: '#0f172a',
                    borderColor: '#0f172a',
                    padding: '0 24px',
                  }}
                >
                  Launch Storefront & Studio
                </Button>
              )}
            </div>
          </Card>
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
          onClose={() => setIsMapModalVisible(false)}
        />
      </Modal>
    </div>
  );
};

export default ClientRegister;
