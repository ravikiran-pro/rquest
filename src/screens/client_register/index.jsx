import React, { useEffect, useState } from 'react';
import {
  Form,
  Input,
  Button,
  Typography,
  Row,
  Col,
  Tag,
  Steps,
  Card,
  Checkbox,
  message,
  Flex,
  Grid,
  Spin,
  Modal,
  Alert,
} from 'antd';
import {
  EnvironmentOutlined,
  PhoneOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  RocketOutlined,
  EditOutlined,
  CloseOutlined,
  AimOutlined,
} from '@ant-design/icons';
import { apiConfig, netWorkCall, getPreciseUserLocation } from '../../app/utils';
import { LeafletComponent } from '../../app/components';
import { useGlobalStore } from '../../app/services';
import { useLocation, useHistory } from 'react-router-dom';
import Routes from '../../app/routes/routes';
import ManageStore from './manage_store';

const { Title, Text, Paragraph } = Typography;

// 6 Universal Business Archetypes (with Dynamic Category Support)
const BUSINESS_ARCHETYPES = [
  {
    id: 'medical',
    label: 'Pharmacy & Healthcare',
    icon: '💊',
    desc: 'Medical Stores, Pharmacies, Clinics, First Aid & Wellness Supplies',
    defaultType: 'Health & Medicine',
    categoryId: 8,
    defaultUnits: ['strip', 'bottle', 'piece', 'box'],
    sampleImages: [
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600',
      'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600',
    ],
    starters: [
      { name: 'Paracetamol 500mg Tablets (Strip of 10)', price: 30, mrp: 35, unit: 'strip', listing_type: 'product', metadata: { section: 'OTC Medicines', dosage_form: 'Strip / Tablets', expiry_date: '2026-12-31', prescription_required: false } },
      { name: 'Digital Infrared Thermometer', price: 850, mrp: 1200, unit: 'piece', listing_type: 'product', metadata: { section: 'Healthcare Devices', dosage_form: 'Medical Equipment', prescription_required: false } },
      { name: 'Amoxicillin 500mg Capsules (Strip of 10)', price: 110, mrp: 130, unit: 'strip', listing_type: 'product', metadata: { section: 'Prescription Drugs', dosage_form: 'Capsules', expiry_date: '2026-08-31', prescription_required: true, schedule_drug: true } },
    ],
  },
  {
    id: 'food',
    label: 'Restaurant & Food Joint',
    icon: '🍽️',
    desc: 'Biryani, Cafes, Bakeries, Cloud Kitchens & Takeaway',
    defaultType: 'Food & Dining',
    categoryId: 7,
    defaultUnits: ['plate', 'portion', 'piece'],
    sampleImages: [
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
    ],
    starters: [
      { name: 'Special Chicken Dum Biryani', price: 220, unit: 'plate', listing_type: 'food', metadata: { section: 'Biryani & Rice', food_type: 'non-veg' } },
      { name: 'Crispy Chicken 65', price: 180, unit: 'plate', listing_type: 'food', metadata: { section: 'Starters', food_type: 'non-veg' } },
      { name: 'Paneer Butter Masala', price: 190, unit: 'portion', listing_type: 'food', metadata: { section: 'Gravies', food_type: 'veg' } },
    ],
  },
  {
    id: 'product',
    label: 'Retail & Grocery Store',
    icon: '🛒',
    desc: 'Kirana, Supermarkets, Fashion, Shoes & Electronics',
    defaultType: 'Provision Store',
    defaultUnits: ['kg', 'pack', 'piece'],
    sampleImages: [
      'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600',
      'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600',
    ],
    starters: [
      { name: 'Aashirvaad Shudh Chakki Atta (5kg)', price: 240, mrp: 275, unit: 'pack', listing_type: 'product', metadata: { section: 'Staples & Flours' } },
      { name: 'Gold Winner Sunflower Oil (1L)', price: 135, mrp: 155, unit: 'pouch', listing_type: 'product', metadata: { section: 'Oils & Ghee' } },
      { name: 'India Gate Basmati Rice (1kg)', price: 95, mrp: 110, unit: 'pack', listing_type: 'product', metadata: { section: 'Rice & Grains' } },
    ],
  },
  {
    id: 'service',
    label: 'Technician & Repairs',
    icon: '🔧',
    desc: 'Electricians, AC Service, Plumbers & Appliance Mechanics',
    defaultType: 'Hardawers and tools',
    defaultUnits: ['service', 'visit', 'hour'],
    sampleImages: [
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600',
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600',
    ],
    starters: [
      { name: 'Full Inspection & Safety Audit', price: 199, unit: 'visit', listing_type: 'service', metadata: { section: 'Inspection' } },
      { name: 'Appliance Repair / Installation', price: 299, unit: 'service', listing_type: 'service', metadata: { section: 'Repairs' } },
    ],
  },
  {
    id: 'wellness',
    label: 'Salon, Spa & Wellness',
    icon: '💆',
    desc: 'Massage Therapy, Unisex Salons, Grooming & Beauty',
    defaultType: 'Small business',
    defaultUnits: ['session'],
    sampleImages: [
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600',
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600',
    ],
    starters: [
      { name: 'Full Body Relaxation Massage (60 Mins)', price: 1199, unit: 'session', listing_type: 'service', metadata: { section: 'Massages', duration_mins: 60 } },
      { name: 'Hydra Glow Herbal Facial', price: 899, unit: 'session', listing_type: 'service', metadata: { section: 'Facials', duration_mins: 45 } },
    ],
  },
  {
    id: 'rental',
    label: 'Rentals, Vehicles & Venues',
    icon: '🏍️',
    desc: 'Bike & Car Rentals, Audio/Lighting, Banquet Halls, Sports Turf',
    defaultType: 'Small business',
    defaultUnits: ['day', 'hour'],
    sampleImages: [
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600',
      'https://images.unsplash.com/photo-1545128485-c400e7702796?w=600',
    ],
    starters: [
      { name: 'Daily Vehicle / Scooter Rental', price: 450, unit: 'day', listing_type: 'rental', metadata: { section: 'Vehicles', security_deposit: 1000 } },
      { name: 'Event Sound System Rental Set', price: 2500, unit: 'day', listing_type: 'rental', metadata: { section: 'Equipment', security_deposit: 3000 } },
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
  const [selectedArchetype, setSelectedArchetype] = useState('food');
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);
  const [position, setPosition] = useState([12.9631025, 80.25476]);
  const [submitting, setSubmitting] = useState(false);

  const [onboardingData, setOnboardingData] = useState({
    shop_name: '',
    category_id: null,
    sub_category_id: null,
    address: '',
    area: '',
    mobile_number: user_data?.mobile || '',
    website: '',
    directions: '',
    img_url: BUSINESS_ARCHETYPES[0].sampleImages[0],
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
          // Check if a specific shop was requested via query param ?shop_id=...
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

  const handleSelectArchetype = (archetypeId) => {
    setSelectedArchetype(archetypeId);
    const arch = BUSINESS_ARCHETYPES.find((a) => a.id === archetypeId);
    if (arch) {
      setOnboardingData((prev) => ({
        ...prev,
        img_url: arch.sampleImages[0],
      }));
    }
  };

  const handleNextStep = () => {
    if (currentStep === 0) {
      if (!onboardingData.shop_name.trim()) {
        message.error('Please enter your business or store name');
        return;
      }
    }
    if (currentStep === 1) {
      if (!onboardingData.address.trim() || !onboardingData.area.trim()) {
        message.error('Please enter store address and area');
        return;
      }
      if (!onboardingData.mobile_number.trim()) {
        message.error('Please provide a contact phone number');
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
      const activeArchetype = BUSINESS_ARCHETYPES.find((a) => a.id === selectedArchetype);
      const payload = {
        owner_id: user_data?.user_id,
        shop_name: onboardingData.shop_name,
        shop_type: activeArchetype?.defaultType || 'Small business',
        address: onboardingData.address,
        area: onboardingData.area,
        mobile_number: onboardingData.mobile_number,
        website: onboardingData.website || '',
        directions: onboardingData.directions || `https://www.google.com/maps/@${position[0]},${position[1]}`,
        img_url: onboardingData.img_url || activeArchetype?.sampleImages[0],
        category_id: onboardingData.category_id || activeArchetype?.categoryId || null,
        sub_category_id: onboardingData.sub_category_id || null,
        allow_multi_category: false,
        latitude: position[0],
        longitude: position[1],
        rating: 5.0,
      };

      const shopRes = await netWorkCall(apiConfig.register_shop, 'POST', JSON.stringify(payload), true);

      if (shopRes?.success && shopRes?.data) {
        const newShop = shopRes.data;
        message.success(`${newShop.shop_name} registered successfully!`);

        // Promote user role in memory immediately so navbar and permissions update seamlessly
        if (update_user_data && user_data) {
          update_user_data({
            ...user_data,
            role_id: 'a5e858d8-636c-4fc3-8c3a-0a76131c95e5',
            role: 'client',
            role_name: 'client',
          });
        }

        // Seed starter listings if opted in
        if (onboardingData.populate_starters && activeArchetype?.starters) {
          for (const starter of activeArchetype.starters) {
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
                metadata: starter.metadata || {},
                is_available: true,
              }),
              true
            );
          }
        }

        // Refresh shops list and open store management studio immediately
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

  // If a store is selected to be managed, render the tailored ManageStore control hub
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

  return (
    <div style={{ maxWidth: 1140, margin: '0 auto', padding: screens.xs ? '16px 12px 80px 12px' : '28px 20px 80px 20px' }}>
      {/* View A: Merchant Outlets Hub (When not onboarding) */}
      {!isFormEnable && (
        <div>
          {/* Top Header Card */}
          <Card
            style={{
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              marginBottom: 24,
              boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
            }}
            bodyStyle={{ padding: screens.xs ? 16 : 24 }}
          >
            <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
              <div>
                <Title level={3} style={{ margin: 0, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
                  Merchant Studio & Outlets Hub
                </Title>
                <Text type="secondary" style={{ fontSize: 14 }}>
                  Manage your direct stores ({allShops.length} registered), live customer orders, catalogs & rate cards.
                </Text>
              </div>

              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={() => {
                  setIsFormEnable(true);
                  setCurrentStep(0);
                }}
                style={{
                  borderRadius: 10,
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                }}
              >
                + Register New Outlet / Branch
              </Button>
            </Flex>
          </Card>

          {/* Outlets Grid */}
          {loadingShops ? (
            <Flex justify="center" align="center" style={{ minHeight: '30vh' }}>
              <Spin size="large" tip="Loading Your Stores..." />
            </Flex>
          ) : allShops.length === 0 ? (
            <Card style={{ borderRadius: 16, textAlign: 'center', padding: '50px 20px', border: '1px solid #e2e8f0' }}>
              <Title level={4}>No Stores Registered Yet</Title>
              <Paragraph type="secondary">
                Connect your business directly with customers in your locality with 0% aggregator markups.
              </Paragraph>
              <Button
                type="primary"
                size="large"
                onClick={() => setIsFormEnable(true)}
                style={{ borderRadius: 10, fontWeight: 700 }}
              >
                Start Guided Store Onboarding
              </Button>
            </Card>
          ) : (
            <Row gutter={screens.xs ? [12, 12] : [20, 20]}>
              {allShops.map((shop) => (
                <Col xs={24} sm={12} md={8} key={shop.id}>
                  <Card
                    hoverable
                    style={{
                      borderRadius: 16,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                    }}
                    bodyStyle={{ padding: 18 }}
                  >
                    <Flex gap={12} align="start" style={{ marginBottom: 12 }}>
                      <img
                        src={
                          shop.img_url ||
                          'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=300'
                        }
                        alt={shop.shop_name}
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 12,
                          objectFit: 'cover',
                          flexShrink: 0,
                          border: '1px solid #e2e8f0',
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Title level={5} ellipsis style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
                          {shop.shop_name}
                        </Title>
                        <Tag color="indigo" style={{ marginTop: 4, fontSize: 10, lineHeight: '18px', margin: '4px 0 0 0' }}>
                          {shop.shop_type || 'Store Outlet'}
                        </Tag>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                          <EnvironmentOutlined /> {shop.area || 'Local Outlet'}
                        </div>
                      </div>
                    </Flex>

                    <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ fontSize: 12, marginBottom: 16 }}>
                      {shop.address || 'Address not provided'}
                    </Paragraph>

                    <Button
                      type="primary"
                      block
                      icon={<EditOutlined />}
                      onClick={() => setManagedShop(shop)}
                      style={{
                        borderRadius: 8,
                        fontWeight: 700,
                        height: 40,
                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      }}
                    >
                      Open Store Studio & Catalog
                    </Button>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      )}

      {/* View B: Guided Store Onboarding Wizard */}
      {isFormEnable && (
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          {/* Top navigation */}
          {allShops.length > 0 && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => setIsFormEnable(false)}
              style={{ marginBottom: 16, fontWeight: 600, color: '#64748b' }}
            >
              Back to Merchant Studio
            </Button>
          )}

          {isOnboardingShop && (
            <Alert
              message={
                <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                  <span>
                    <strong>🚀 Step 2: Register Your Physical Storefront</strong> — Pin your shop on the map with 0% platform commission.
                  </span>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => history.push(Routes.app)}
                    style={{ padding: 0, fontWeight: 700 }}
                  >
                    Skip to Marketplace →
                  </Button>
                </Flex>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16, borderRadius: 12, border: '1px solid #c7d2fe' }}
            />
          )}

          <Card
            style={{
              borderRadius: 20,
              border: '1px solid #e2e8f0',
              boxShadow: '0 8px 30px rgba(15, 23, 42, 0.06)',
            }}
            bodyStyle={{ padding: screens.xs ? 18 : 28 }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Title level={3} style={{ margin: 0, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
                Store Onboarding & Registration
              </Title>
              <Text type="secondary" style={{ fontSize: 14 }}>
                Setup your local outlet in 4 quick steps with custom templates for your industry.
              </Text>
            </div>

            {/* Stepper */}
            <Steps
              current={currentStep}
              responsive
              size="small"
              style={{ marginBottom: 28 }}
              items={[
                { title: 'Business Type' },
                { title: 'Location' },
                { title: 'Operations' },
                { title: 'Launch' },
              ]}
            />

            {/* STEP 1: Business Archetype & Identity */}
            {currentStep === 0 && (
              <div>
                <Title level={5} style={{ marginBottom: 12, fontWeight: 700 }}>
                  1. What kind of business are you listing?
                </Title>
                <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                  {BUSINESS_ARCHETYPES.map((arch) => {
                    const isSelected = selectedArchetype === arch.id;
                    return (
                      <Col xs={24} sm={12} key={arch.id}>
                        <div
                          onClick={() => handleSelectArchetype(arch.id)}
                          style={{
                            padding: 14,
                            borderRadius: 14,
                            border: `2px solid ${isSelected ? '#4f46e5' : '#e2e8f0'}`,
                            background: isSelected ? '#f5f3ff' : '#ffffff',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: isSelected ? '0 4px 14px rgba(79, 70, 229, 0.15)' : 'none',
                          }}
                        >
                          <Flex align="center" gap={10} style={{ marginBottom: 6 }}>
                            <span style={{ fontSize: 24 }}>{arch.icon}</span>
                            <span style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>
                              {arch.label}
                            </span>
                          </Flex>
                          <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.4 }}>
                            {arch.desc}
                          </Text>
                        </div>
                      </Col>
                    );
                  })}
                </Row>

                <Form layout="vertical">
                  <Form.Item label="Store / Outlet Name" required>
                    <Input
                      size="large"
                      placeholder="e.g. Bismillah Biryani Centre, Sri Balaji Supermarket, City AC Care"
                      value={onboardingData.shop_name}
                      onChange={(e) =>
                        setOnboardingData({ ...onboardingData, shop_name: e.target.value })
                      }
                      style={{ borderRadius: 10 }}
                    />
                  </Form.Item>
                </Form>
              </div>
            )}

            {/* STEP 2: Location & Contact */}
            {currentStep === 1 && (
              <div>
                <Title level={5} style={{ marginBottom: 12, fontWeight: 700 }}>
                  2. Store Location & Neighborhood
                </Title>

                <Form layout="vertical">
                  <Row gutter={12}>
                    <Col xs={24} sm={14}>
                      <Form.Item label="Street Address" required>
                        <Input
                          placeholder="e.g. 24/A Perambur Barracks Road"
                          value={onboardingData.address}
                          onChange={(e) =>
                            setOnboardingData({ ...onboardingData, address: e.target.value })
                          }
                          style={{ borderRadius: 10 }}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={10}>
                      <Form.Item label="Area / Locality" required>
                        <Input
                          placeholder="e.g. Pulianthope, Jamaliya, Anna Nagar"
                          value={onboardingData.area}
                          onChange={(e) =>
                            setOnboardingData({ ...onboardingData, area: e.target.value })
                          }
                          style={{ borderRadius: 10 }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={12}>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Orders Phone / WhatsApp Number" required>
                        <Input
                          prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
                          placeholder="10-digit mobile number"
                          value={onboardingData.mobile_number}
                          onChange={(e) =>
                            setOnboardingData({ ...onboardingData, mobile_number: e.target.value })
                          }
                          style={{ borderRadius: 10 }}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Google Maps Direction Link (Optional)">
                        <Input
                          placeholder="https://maps.app.goo.gl/..."
                          value={onboardingData.directions}
                          onChange={(e) =>
                            setOnboardingData({ ...onboardingData, directions: e.target.value })
                          }
                          style={{ borderRadius: 10 }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  {/* Location Coordinates Map Picker */}
                  <div
                    style={{
                      background: '#f8fafc',
                      padding: 14,
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      marginBottom: 16,
                    }}
                  >
                    <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                          <EnvironmentOutlined style={{ color: '#4f46e5' }} /> GPS Proximity Pin
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          Lat: {position[0]?.toFixed(4)}, Lon: {position[1]?.toFixed(4)}
                        </div>
                      </div>
                      <Flex gap={8}>
                        <Button
                          icon={<AimOutlined />}
                          onClick={async () => {
                            const coords = await getPreciseUserLocation();
                            setPosition(coords);
                          }}
                          style={{ borderRadius: 8, fontWeight: 600 }}
                        >
                          Auto-Detect GPS
                        </Button>
                        <Button
                          type="primary"
                          onClick={() => setIsMapModalVisible(true)}
                          style={{ borderRadius: 8, fontWeight: 600 }}
                        >
                          Adjust Pin on Map
                        </Button>
                      </Flex>
                    </Flex>
                  </div>
                </Form>
              </div>
            )}

            {/* STEP 3: Operations & Fulfillment */}
            {currentStep === 2 && (
              <div>
                <Title level={5} style={{ marginBottom: 12, fontWeight: 700 }}>
                  3. Order Fulfillment & Payments
                </Title>

                <Form layout="vertical">
                  <Form.Item label="Order Fulfillment Accepted">
                    <Checkbox.Group
                      value={onboardingData.fulfillment_modes}
                      onChange={(vals) =>
                        setOnboardingData({ ...onboardingData, fulfillment_modes: vals })
                      }
                      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                    >
                      <Checkbox value="pickup">🏪 Direct In-Store Customer Pickup</Checkbox>
                      <Checkbox value="delivery">🛵 Hyper-Local Home Delivery (Self dispatch)</Checkbox>
                      <Checkbox value="service_visit">🚪 Doorstep / At-Home Service Visits</Checkbox>
                    </Checkbox.Group>
                  </Form.Item>

                  <Form.Item label="Direct Payment Modes Accepted">
                    <Checkbox.Group
                      value={onboardingData.payment_modes}
                      onChange={(vals) =>
                        setOnboardingData({ ...onboardingData, payment_modes: vals })
                      }
                      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                    >
                      <Checkbox value="direct_upi">📱 Direct UPI QR Code / GPay / PhonePe (0% Fee)</Checkbox>
                      <Checkbox value="cod">💵 Cash on Delivery / Cash on Service</Checkbox>
                    </Checkbox.Group>
                  </Form.Item>

                  <Form.Item label="Store Cover Image URL">
                    <Input
                      placeholder="https://images.unsplash.com/..."
                      value={onboardingData.img_url}
                      onChange={(e) =>
                        setOnboardingData({ ...onboardingData, img_url: e.target.value })
                      }
                      style={{ borderRadius: 10 }}
                    />
                  </Form.Item>
                </Form>
              </div>
            )}

            {/* STEP 4: Launch & Starter Catalog */}
            {currentStep === 3 && (
              <div>
                <Title level={5} style={{ marginBottom: 12, fontWeight: 700 }}>
                  4. Review & Ready to Launch
                </Title>

                {/* Live Card Preview */}
                <Card
                  style={{
                    borderRadius: 16,
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    marginBottom: 20,
                  }}
                  bodyStyle={{ padding: 16 }}
                >
                  <Flex gap={14} align="start">
                    <img
                      src={onboardingData.img_url}
                      alt="Store Cover"
                      style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover' }}
                    />
                    <div>
                      <Title level={4} style={{ margin: 0, fontWeight: 800 }}>
                        {onboardingData.shop_name || 'My Local Store'}
                      </Title>
                      <Tag color="indigo" style={{ marginTop: 4, fontWeight: 700 }}>
                        {BUSINESS_ARCHETYPES.find((a) => a.id === selectedArchetype)?.label}
                      </Tag>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                        <EnvironmentOutlined /> {onboardingData.address}, {onboardingData.area}
                      </div>
                      <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginTop: 4 }}>
                        • 0% Platform Commission • Direct WhatsApp: {onboardingData.mobile_number}
                      </div>
                    </div>
                  </Flex>
                </Card>

                {/* Starter Catalog Checkbox */}
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 20,
                  }}
                >
                  <Checkbox
                    checked={onboardingData.populate_starters}
                    onChange={(e) =>
                      setOnboardingData({ ...onboardingData, populate_starters: e.target.checked })
                    }
                  >
                    <span style={{ fontWeight: 700, color: '#166534' }}>
                      Pre-populate recommended starter catalog ({BUSINESS_ARCHETYPES.find((a) => a.id === selectedArchetype)?.starters?.length} items)
                    </span>
                  </Checkbox>
                  <div style={{ fontSize: 12, color: '#15803d', marginTop: 4, marginLeft: 24 }}>
                    Your store will launch with realistic items, images, and prices ready for customer discovery.
                  </div>
                </div>
              </div>
            )}

            {/* Step Navigation Controls */}
            <Flex justify="space-between" align="center" style={{ marginTop: 24 }}>
              {currentStep > 0 ? (
                <Button onClick={handlePrevStep} style={{ borderRadius: 8, fontWeight: 600 }}>
                  Previous
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
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  }}
                >
                  Continue <ArrowRightOutlined />
                </Button>
              ) : (
                <Button
                  type="primary"
                  size="large"
                  icon={<RocketOutlined />}
                  loading={submitting}
                  onClick={handleFinishOnboarding}
                  style={{
                    borderRadius: 10,
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    height: 44,
                    padding: '0 24px',
                  }}
                >
                  Launch Store & Open Studio
                </Button>
              )}
            </Flex>
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
