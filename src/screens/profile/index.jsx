import React, { useState, useEffect, useRef } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Grid,
  Input,
  List,
  message,
  Progress,
  Row,
  Segmented,
  Skeleton,
  Space,
  Statistic,
  Steps,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import {
  UserOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  PlusOutlined,
  ShopOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
  CheckCircleFilled,
  MinusCircleOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  CompassOutlined,
  AimOutlined,
  ShoppingOutlined,
  CoffeeOutlined,
  MedicineBoxOutlined,
  ToolOutlined,
  SmileOutlined,
  CheckOutlined,
  CarOutlined,
} from '@ant-design/icons';
import { useHistory, useLocation } from 'react-router-dom';
import { useGlobalStore } from '../../app/services';
import { netWorkCall, apiConfig, checkUserRole, getPreciseUserLocation, getLocationName } from '../../app/utils';
import Routes from '../../app/routes/routes';
import { AddressCard, AddressModal, ResponsiveSheet } from '../../app/components/profile';
import './profile.css';

const { Title, Text } = Typography;

const SUPER_ADMIN_ROLE_ID = 'd5e858d8-636c-4fc3-8c3a-0a76131c95e9';
const DEFAULT_COORDS = [12.9716, 77.5946];

const SHOPPING_INTERESTS = [
  { id: 'groceries', name: 'Groceries & kirana', desc: 'Daily essentials and pantry staples', icon: <ShoppingOutlined /> },
  { id: 'dining', name: 'Restaurants & dining', desc: 'Fresh meals, snacks and cafés', icon: <CoffeeOutlined /> },
  { id: 'pharmacy', name: 'Pharmacy & wellness', desc: 'Medicines and health supplies', icon: <MedicineBoxOutlined /> },
  { id: 'services', name: 'Technicians & repairs', desc: 'AC, electrical and plumbing', icon: <ToolOutlined /> },
  { id: 'salon', name: 'Salon & personal care', desc: 'Grooming and spa appointments', icon: <SmileOutlined /> },
  { id: 'retail', name: 'Local retail & stores', desc: 'Fashion, stationery and electronics', icon: <ShopOutlined /> },
];

const ADDRESS_LABEL_OPTIONS = ['Home', 'Work', 'Other'];

const ProfileScreen = () => {
  const history = useHistory();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const { user_data, update_user_data } = useGlobalStore((state) => state);
  const { isAdmin, isMerchant } = checkUserRole(user_data);
  const isSuperAdmin = Boolean(
    isAdmin ||
      user_data?.role_id === SUPER_ADMIN_ROLE_ID ||
      user_data?.username === 'admin' ||
      user_data?.username === 'root'
  );

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [myShops, setMyShops] = useState([]);
  const [activeTabKey, setActiveTabKey] = useState('addresses');
  const [savingProfile, setSavingProfile] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  // Setup guide (onboarding wizard)
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [assistantCoords, setAssistantCoords] = useState(DEFAULT_COORDS);
  const [interests, setInterests] = useState(['groceries', 'dining']);

  const [profileForm] = Form.useForm();
  const [contactForm] = Form.useForm();
  const [addressForm] = Form.useForm();
  const emailInputRef = useRef(null);

  const displayName = profile?.username || user_data?.username || 'User';
  const avatarInitial = displayName.charAt(0).toUpperCase() || 'U';

  // The skeleton shows only on first load; later refreshes update in place
  const fetchProfileAndAddresses = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const promises = [
        netWorkCall(apiConfig.user_profile, 'GET', null, true),
        netWorkCall(apiConfig.user_addresses, 'GET', null, true),
      ];

      if (isMerchant) {
        promises.push(netWorkCall(apiConfig.my_shops, 'POST', null, true));
      }

      const [profileRes, addrRes, shopsRes] = await Promise.all(promises);

      if (profileRes?.data) {
        setProfile(profileRes.data);
      }

      if (addrRes?.data) {
        setAddresses(addrRes.data);
      }

      if (shopsRes?.success && shopsRes?.data) {
        setMyShops(shopsRes.data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      message.error('Could not load your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndAddresses();
  }, []);

  // Open the setup guide from links such as ?onboarding=customer or ?new=true
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('onboarding') || params.get('new') === 'true') {
      setOnboardingModalOpen(true);
      setOnboardingStep(0);
    }
  }, [location.search]);

  // Pre-fill the contact step each time the setup guide opens
  useEffect(() => {
    if (!onboardingModalOpen) return;
    contactForm.setFieldsValue({
      username: profile?.username || user_data?.username || '',
      email: profile?.email || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingModalOpen]);

  // Default the "Save as" label once the address step is on screen
  useEffect(() => {
    if (!onboardingModalOpen || onboardingStep !== 1 || isMerchant) return;
    if (!addressForm.getFieldValue('label')) {
      addressForm.setFieldsValue({ label: 'Home' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingModalOpen, onboardingStep]);

  const handleUpdateProfile = async (values) => {
    setSavingProfile(true);
    try {
      const res = await netWorkCall(apiConfig.user_profile, 'PUT', JSON.stringify(values), true);
      if (res?.success) {
        message.success('Profile updated');
        setProfile((prev) => ({ ...prev, ...res.data }));
        update_user_data({
          ...user_data,
          username: res.data.username,
          mobile: res.data.mobile,
          email: res.data.email,
        });
      } else {
        message.error(res?.message || 'Could not update your profile');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      message.error('Could not save your changes. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Address handlers
  // ---------------------------------------------------------------------------
  const handleSetDefaultAddress = async (addr) => {
    try {
      const res = await netWorkCall(`${apiConfig.user_addresses}/${addr.id}/default`, 'PUT', null, true);
      if (res?.success) {
        message.success(`${addr.label || 'Address'} set as default`);
        setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === addr.id })));
      }
    } catch (err) {
      console.error('Set default error:', err);
      message.error('Could not set the default address');
    }
  };

  const handleDeleteAddress = async (addr) => {
    try {
      const res = await netWorkCall(`${apiConfig.user_addresses}/${addr.id}`, 'DELETE', null, true);
      if (res?.success) {
        message.success('Address removed');
        setAddresses((prev) => prev.filter((a) => a.id !== addr.id));
      }
    } catch (err) {
      console.error('Delete address error:', err);
      message.error('Could not remove the address');
    }
  };

  const handleEditAddress = (addr) => {
    setEditingAddress(addr);
    setAddressModalOpen(true);
  };

  const handleAddNewAddress = () => {
    setEditingAddress(null);
    setAddressModalOpen(true);
  };

  const logout = () => {
    update_user_data({});
    sessionStorage.clear();
    history.push(Routes.login);
  };

  // ---------------------------------------------------------------------------
  // Profile completion checklist
  // ---------------------------------------------------------------------------
  const calculateCompletion = () => {
    let score = 0;
    const checks = [];

    // 1. Account (username + mobile)
    const hasBasic = !!(profile?.username && profile?.mobile);
    const basicPoints = isMerchant ? 25 : 30;
    if (hasBasic) {
      score += basicPoints;
      checks.push({ key: 'basic', label: 'Account verified', fullLabel: 'Account verified (name and mobile)', done: true, points: basicPoints });
    } else {
      checks.push({ key: 'basic', label: 'Complete account', fullLabel: 'Complete your account details', done: false, points: basicPoints, tab: 'profile_info' });
    }

    // 2. Email
    const hasEmail = !!(profile?.email && profile.email.trim());
    const emailPoints = isMerchant ? 20 : 25;
    if (hasEmail) {
      score += emailPoints;
      checks.push({ key: 'email', label: 'Email added', fullLabel: 'Email added for invoices', done: true, points: emailPoints });
    } else {
      checks.push({ key: 'email', label: 'Add email', fullLabel: 'Add an email for order invoices', done: false, points: emailPoints, tab: 'profile_info' });
    }

    if (isMerchant) {
      // 3. Storefront registered
      const hasShop = myShops && myShops.length > 0;
      if (hasShop) {
        score += 35;
        checks.push({ key: 'shop', label: 'Storefront live', fullLabel: `Store registered (${myShops[0]?.shop_name || 'active'})`, done: true, points: 35 });
      } else {
        checks.push({ key: 'shop', label: 'Register storefront', fullLabel: 'Register your storefront', done: false, points: 35, action: 'register_shop' });
      }

      // 4. Catalogue / location
      const hasCatalog = myShops && myShops.some((s) => s.address || s.products_list);
      if (hasCatalog) {
        score += 20;
        checks.push({ key: 'catalog', label: 'Catalogue set', fullLabel: 'Store address and catalogue configured', done: true, points: 20 });
      } else {
        checks.push({ key: 'catalog', label: 'Set location and menu', fullLabel: 'Set your store location and menu', done: false, points: 20, action: 'register_shop' });
      }
    } else {
      // 3. Delivery address
      const hasAddress = addresses && addresses.length > 0;
      if (hasAddress) {
        score += 35;
        checks.push({ key: 'address', label: `Address saved (${addresses.length})`, fullLabel: `Delivery addresses saved (${addresses.length})`, done: true, points: 35 });
      } else {
        checks.push({ key: 'address', label: 'Add address', fullLabel: 'Add your delivery address', done: false, points: 35, action: 'add_address' });
      }

      // 4. Default address
      const hasDefault = addresses && addresses.some((a) => a.is_default);
      if (hasDefault) {
        score += 10;
        checks.push({ key: 'default_addr', label: 'Default address set', fullLabel: 'Default delivery address selected', done: true, points: 10 });
      } else {
        checks.push({ key: 'default_addr', label: 'Set default', fullLabel: 'Choose a default delivery address', done: false, points: 10, action: 'add_address' });
      }
    }

    return { score: Math.min(score, 100), checks };
  };

  const { score: completionScore, checks: completionChecks } = calculateCompletion();

  const handleExecuteChecklistAction = (check) => {
    if (check.key === 'email' || check.tab === 'profile_info') {
      setActiveTabKey('profile_info');
      message.info('Add your email below and save your changes');
      setTimeout(() => {
        emailInputRef.current?.focus({ cursor: 'end' });
      }, 200);
    } else if (check.action === 'add_address' || check.key === 'address' || check.key === 'default_addr') {
      handleAddNewAddress();
    } else if (check.action === 'register_shop' || check.key === 'shop' || check.key === 'catalog') {
      history.push(`${Routes.client}?onboarding=shop`);
    } else {
      setOnboardingStep(0);
      setOnboardingModalOpen(true);
    }
  };

  // ---------------------------------------------------------------------------
  // Setup guide
  // ---------------------------------------------------------------------------
  const closeOnboarding = () => {
    setOnboardingModalOpen(false);
    history.replace(Routes.profile);
  };

  const openOnboarding = () => {
    setOnboardingStep(0);
    setOnboardingModalOpen(true);
  };

  const handleDetectAssistantGps = async () => {
    setDetectingGps(true);
    try {
      const loc = await getPreciseUserLocation(true);
      if (loc && loc.length === 2) {
        setAssistantCoords(loc);
        const areaName = await getLocationName(loc[0], loc[1]);
        if (areaName) {
          addressForm.setFieldsValue({ street_area: addressForm.getFieldValue('street_area') || areaName });
          message.success('Location applied');
        }
      }
    } catch (e) {
      console.warn('GPS detection error:', e);
      message.warning('Could not detect your location. Enter it manually.');
    } finally {
      setDetectingGps(false);
    }
  };

  const handleContactStep = async (values) => {
    const username = values.username?.trim() || profile?.username || '';
    const email = values.email?.trim() || '';
    const changed = username !== (profile?.username || '') || email !== (profile?.email || '');

    if (changed) {
      setSavingOnboarding(true);
      try {
        const res = await netWorkCall(apiConfig.user_profile, 'PUT', JSON.stringify({ username, email }), true);
        if (!res?.success) {
          message.error(res?.message || 'Could not save your contact details');
          return;
        }
        setProfile((prev) => ({ ...prev, username, email }));
        update_user_data({ ...user_data, username, email });
      } catch (e) {
        console.warn('Setup guide contact save:', e);
        message.error('Could not save your contact details');
        return;
      } finally {
        setSavingOnboarding(false);
      }
    }

    setOnboardingStep(1);
  };

  const handleAddressStep = async (values) => {
    const hasInput = Boolean(values.street_area?.trim() || values.house_flat_floor?.trim());

    // Only create an address when the user actually entered one
    if (addresses.length === 0 && hasInput) {
      setSavingOnboarding(true);
      try {
        const payload = {
          label: values.label || 'Home',
          recipient_name: profile?.username || user_data?.username || 'User',
          recipient_phone: profile?.mobile || user_data?.mobile || '',
          house_flat_floor: values.house_flat_floor?.trim() || '',
          street_area: values.street_area?.trim() || 'Neighbourhood',
          city: 'Bengaluru',
          latitude: assistantCoords[0],
          longitude: assistantCoords[1],
          is_default: true,
        };
        const res = await netWorkCall(apiConfig.user_addresses, 'POST', JSON.stringify(payload), true);
        if (!res?.success) {
          message.error(res?.message || 'Could not save your address');
          return;
        }
        setAddresses([res.data]);
        message.success('Delivery address saved');
      } catch (e) {
        console.error('Setup guide address save error:', e);
        message.error('Could not save your address');
        return;
      } finally {
        setSavingOnboarding(false);
      }
    }

    setOnboardingStep(2);
  };

  const finishOnboarding = () => {
    setOnboardingModalOpen(false);
    history.replace(Routes.profile);
    message.success('Profile setup complete');
  };

  const toggleInterest = (id) => {
    setInterests((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="rq-profile">
        <Card className="rq-profile-hero">
          <Skeleton avatar active paragraph={{ rows: 3 }} />
        </Card>
      </div>
    );
  }

  const accountLabel = isSuperAdmin ? 'Super admin' : isMerchant ? 'Shop owner' : 'Shopper';

  const addressesPanel = (
    <>
      <div className="rq-tab-head">
        <div>
          <Title level={2} className="rq-tab-title">
            Saved addresses
          </Title>
          <Text type="secondary">Used at checkout and to find stores near you.</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddNewAddress}>
          Add address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <>
              <div className="rq-empty-title">No delivery address yet</div>
              <Text type="secondary">Save your home or work location for faster checkout.</Text>
            </>
          }
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddNewAddress}>
            Add your first address
          </Button>
        </Empty>
      ) : (
        <Row gutter={[16, 16]} align="stretch">
          {addresses.map((addr) => (
            <Col xs={24} md={12} key={addr.id}>
              <AddressCard
                address={addr}
                onEdit={handleEditAddress}
                onDelete={handleDeleteAddress}
                onSetDefault={handleSetDefaultAddress}
              />
            </Col>
          ))}
        </Row>
      )}
    </>
  );

  const personalPanel = (
    <div className="rq-tab-form">
      <Title level={2} className="rq-tab-title">
        Personal details
      </Title>
      <Text type="secondary">Used for order confirmations and messages from stores.</Text>

      <Form
        form={profileForm}
        layout="vertical"
        size="large"
        requiredMark="optional"
        onFinish={handleUpdateProfile}
        className="rq-profile-form"
        style={{ marginTop: 20 }}
        initialValues={{
          username: profile?.username || '',
          email: profile?.email || '',
          mobile: profile?.mobile || '',
        }}
      >
        <Form.Item name="username" label="Display name" rules={[{ required: true, whitespace: true, message: 'Enter a display name' }]}>
          <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="Your name" autoComplete="name" />
        </Form.Item>

        <Form.Item
          name="mobile"
          label="Mobile number"
          rules={[
            { required: true, message: 'Enter your mobile number' },
            { pattern: /^[0-9+\s-]{8,15}$/, message: 'Enter a valid phone number' },
          ]}
        >
          <Input prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />} placeholder="Mobile number" inputMode="tel" autoComplete="tel" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email address"
          extra="Used for digital receipts and invoices."
          rules={[{ type: 'email', message: 'Enter a valid email address' }]}
        >
          <Input
            ref={emailInputRef}
            prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
            placeholder="name@example.com"
            autoComplete="email"
          />
        </Form.Item>

        <Form.Item className="rq-form-actions" style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" loading={savingProfile}>
            Save changes
          </Button>
        </Form.Item>
      </Form>
    </div>
  );

  const tabItems = [
    {
      key: 'addresses',
      label: (
        <span>
          <EnvironmentOutlined /> Addresses ({addresses.length})
        </span>
      ),
      children: addressesPanel,
    },
    {
      key: 'profile_info',
      label: (
        <span>
          <UserOutlined /> Personal
        </span>
      ),
      children: personalPanel,
      forceRender: true,
    },
    ...(isMerchant
      ? [
          {
            key: 'account_hub',
            label: (
              <span>
                <ShopOutlined /> Storefront
              </span>
            ),
            children: (
              <Alert
                type="info"
                showIcon
                className="rq-role-alert"
                message="Storefront hub"
                description={
                  myShops.length > 0
                    ? `You have ${myShops.length} registered storefront${myShops.length > 1 ? 's' : ''}. Manage your catalogue and orders.`
                    : 'Set up your storefront pin and catalogue on the neighbourhood map.'
                }
                action={
                  <Button type="primary" onClick={() => history.push(Routes.client)}>
                    Open merchant studio
                  </Button>
                }
              />
            ),
          },
        ]
      : []),
    ...(!isMerchant
      ? [
          {
            key: 'delivery_hub',
            label: (
              <span>
                <CarOutlined /> Delivery
              </span>
            ),
            children: (
              <Alert
                type="success"
                showIcon
                className="rq-role-alert"
                message="Delivery partner tasks"
                description="View open deliveries, live routes and earnings from local drop-offs."
                action={
                  <Button type="primary" onClick={() => history.push(Routes.deliveryPortal)}>
                    Open delivery portal
                  </Button>
                }
              />
            ),
          },
        ]
      : []),
    ...(isSuperAdmin
      ? [
          {
            key: 'admin_hub',
            label: (
              <span>
                <SafetyCertificateOutlined /> Admin
              </span>
            ),
            children: (
              <Alert
                type="warning"
                showIcon
                className="rq-role-alert"
                message="Super admin access"
                description="Full control over storefront schemas, users, categories and marketplace health."
                action={
                  <Button danger onClick={() => history.push(Routes.admin)}>
                    Open admin console
                  </Button>
                }
              />
            ),
          },
        ]
      : []),
  ];

  const quickLinks = [
    { key: 'explore', icon: <CompassOutlined />, label: 'Explore stores', onClick: () => history.push(Routes.app) },
    { key: 'address', icon: <EnvironmentOutlined />, label: 'Add delivery address', onClick: handleAddNewAddress },
    ...(!isMerchant
      ? [
          { key: 'delivery', icon: <CarOutlined />, label: 'Delivery portal', onClick: () => history.push(Routes.deliveryPortal) },
          { key: 'register', icon: <ShopOutlined />, label: 'Register your store', onClick: () => history.push(`${Routes.client}?onboarding=shop`) },
        ]
      : []),
    ...(isSuperAdmin
      ? [{ key: 'admin', icon: <SafetyCertificateOutlined />, label: 'Admin console', onClick: () => history.push(Routes.admin) }]
      : []),
  ];

  const onboardingTitle = (
    <div className="rq-sheet-title">
      <span className="rq-sheet-title-icon">{isMerchant ? <ShopOutlined /> : <ShopOutlined />}</span>
      <div style={{ minWidth: 0 }}>
        <div className="rq-sheet-title-main">{isMerchant ? 'Shop owner setup' : 'Welcome to Rquest'}</div>
        <div className="rq-sheet-title-sub">
          {isMerchant ? 'Get your store ready for nearby customers' : 'A few quick steps to start ordering'}
        </div>
      </div>
    </div>
  );

  const stepItems = isMerchant
    ? [{ title: 'Contact' }, { title: 'Storefront' }, { title: 'Launch' }]
    : [{ title: 'Contact' }, { title: 'Address' }, { title: 'Interests' }];

  const onboardingFooter = (() => {
    if (onboardingStep === 0) {
      return (
        <div className="rq-sheet-footer rq-sheet-footer--split">
          <Button type="text" onClick={closeOnboarding}>
            Skip for now
          </Button>
          <Button type="primary" loading={savingOnboarding} onClick={() => contactForm.submit()}>
            Continue <ArrowRightOutlined />
          </Button>
        </div>
      );
    }

    if (onboardingStep === 1) {
      if (isMerchant) {
        return (
          <div className="rq-sheet-footer rq-sheet-footer--split">
            <Button icon={<ArrowLeftOutlined />} onClick={() => setOnboardingStep(0)}>
              Back
            </Button>
            <Button
              type="primary"
              onClick={() => {
                setOnboardingModalOpen(false);
                history.push(`${Routes.client}?onboarding=shop`);
              }}
            >
              Open storefront creator <ArrowRightOutlined />
            </Button>
          </div>
        );
      }
      return (
        <div className="rq-sheet-footer rq-sheet-footer--split">
          <Button icon={<ArrowLeftOutlined />} onClick={() => setOnboardingStep(0)}>
            Back
          </Button>
          <Button type="primary" loading={savingOnboarding} onClick={() => addressForm.submit()}>
            Save and continue <ArrowRightOutlined />
          </Button>
        </div>
      );
    }

    return (
      <div className="rq-sheet-footer rq-sheet-footer--split">
        <Button icon={<ArrowLeftOutlined />} onClick={() => setOnboardingStep(1)}>
          Back
        </Button>
        <Button
          type="primary"
          onClick={() => {
            finishOnboarding();
            history.push(Routes.app);
          }}
        >
          Explore marketplace <ArrowRightOutlined />
        </Button>
      </div>
    );
  })();

  return (
    <div className="rq-profile">
      {/* Identity + key stats */}
      <Card className="rq-profile-hero">
        <div className="rq-profile-hero-main">
          <Avatar size={isMobile ? 56 : 72} className="rq-profile-avatar">
            {avatarInitial}
          </Avatar>

          <div className="rq-profile-hero-info">
            <div className="rq-profile-name-row">
              <Title level={1} className="rq-profile-name" title={displayName}>
                {displayName}
              </Title>
              {isMerchant ? (
                <Tag color="gold" icon={<ShopOutlined />} style={{ margin: 0 }}>
                  Shop owner
                </Tag>
              ) : (
                <Tag color="green" icon={<SafetyCertificateOutlined />} style={{ margin: 0 }}>
                  Shopper
                </Tag>
              )}
            </div>

            <div className="rq-profile-contact">
              <span>
                <PhoneOutlined /> {profile?.mobile || user_data?.mobile || 'No phone number'}
              </span>
              <span>
                <MailOutlined />
                <span className="rq-contact-text" title={profile?.email || undefined}>
                  {profile?.email || 'No email added'}
                </span>
              </span>
            </div>
          </div>

          <div className="rq-profile-hero-actions">
            <Button icon={<ShopOutlined />} onClick={openOnboarding}>
              Setup guide
            </Button>
            <Button danger icon={<LogoutOutlined />} onClick={logout}>
              Log out
            </Button>
          </div>
        </div>

        <Row gutter={[16, 16]} className="rq-profile-stats">
          <Col xs={12} md={8}>
            <Statistic title="Saved addresses" value={addresses.length} />
          </Col>
          <Col xs={12} md={8}>
            <Statistic title="Account type" value={accountLabel} className="rq-stat-text" />
          </Col>
          <Col xs={24} md={8}>
            <Statistic title="Profile completion" value={completionScore} suffix="%" />
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* Side column: checklist and quick links */}
        <Col xs={24} lg={8} className="rq-profile-side">
          <Card
            size="small"
            className="rq-side-card"
            title="Profile completion"
            extra={
              completionScore === 100 ? (
                <Tag color="success" style={{ margin: 0 }}>
                  Complete
                </Tag>
              ) : null
            }
          >
            <Progress percent={completionScore} status={completionScore === 100 ? 'success' : 'active'} />
            <List
              size="small"
              split={false}
              rowKey="key"
              dataSource={completionChecks}
              renderItem={(check) => (
                <List.Item
                  className={`rq-check-item${check.done ? ' is-done' : ''}`}
                  actions={
                    check.done
                      ? []
                      : [
                          <Button key="go" type="link" size="small" onClick={() => handleExecuteChecklistAction(check)}>
                            Complete
                          </Button>,
                        ]
                  }
                >
                  <List.Item.Meta
                    avatar={check.done ? <CheckCircleFilled className="rq-check-done" /> : <MinusCircleOutlined className="rq-check-todo" />}
                    title={check.fullLabel}
                    description={`${check.points}% of profile`}
                  />
                </List.Item>
              )}
            />
          </Card>

          <Card size="small" className="rq-side-card" title="Quick links">
            <Space direction="vertical" size={2} style={{ width: '100%' }}>
              {quickLinks.map((link) => (
                <Button key={link.key} type="text" className="rq-quick-link" icon={link.icon} onClick={link.onClick}>
                  {link.label}
                </Button>
              ))}
            </Space>
          </Card>
        </Col>

        {/* Main column: tabbed details */}
        <Col xs={24} lg={16} className="rq-profile-main">
          <Card className="rq-profile-tabs">
            <Tabs
              activeKey={activeTabKey}
              onChange={setActiveTabKey}
              items={tabItems}
              tabBarGutter={isMobile ? 0 : undefined}
            />
          </Card>
        </Col>
      </Row>

      {/* Setup guide */}
      <ResponsiveSheet
        open={onboardingModalOpen}
        onClose={closeOnboarding}
        title={onboardingTitle}
        footer={onboardingFooter}
        width={600}
      >
        <Steps size="small" current={onboardingStep} items={stepItems} className="rq-onboarding-steps" />

        {onboardingStep === 0 && (
          <>
            <div className="rq-onboarding-preview">
              <Avatar size={44} className="rq-profile-avatar">
                {avatarInitial}
              </Avatar>
              <div style={{ minWidth: 0 }}>
                <div className="rq-onboarding-name">{displayName}</div>
                <div className="rq-onboarding-meta">
                  Mobile: {profile?.mobile || user_data?.mobile || 'verified'}
                </div>
              </div>
            </div>

            <Form form={contactForm} layout="vertical" size="large" requiredMark={false} onFinish={handleContactStep}>
              <Form.Item name="username" label="Display name" rules={[{ required: true, whitespace: true, message: 'Enter a display name' }]}>
                <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="Your name" />
              </Form.Item>
              <Form.Item
                name="email"
                label="Email address"
                extra="Used for digital receipts and invoices."
                rules={[{ type: 'email', message: 'Enter a valid email address' }]}
              >
                <Input prefix={<MailOutlined style={{ color: '#94a3b8' }} />} placeholder="name@example.com" />
              </Form.Item>
            </Form>
          </>
        )}

        {onboardingStep === 1 && !isMerchant && (
          <>
            <Text type="secondary">Pin your location to see stores within walking distance.</Text>
            <Button
              block
              size="large"
              icon={<AimOutlined />}
              loading={detectingGps}
              onClick={handleDetectAssistantGps}
              style={{ marginTop: 14 }}
            >
              Use current location
            </Button>
            <p className="rq-gps-note">
              {assistantCoords[0].toFixed(5)}, {assistantCoords[1].toFixed(5)}
            </p>

            <Form form={addressForm} layout="vertical" size="large" requiredMark={false} onFinish={handleAddressStep} style={{ marginTop: 12 }}>
              <Form.Item name="label" label="Save as">
                <Segmented block options={ADDRESS_LABEL_OPTIONS} />
              </Form.Item>
              <Form.Item name="house_flat_floor" label="Flat, house no. or floor">
                <Input placeholder="e.g. Flat 302, Green Valley Apartments" />
              </Form.Item>
              <Form.Item name="street_area" label="Street and area">
                <Input placeholder="e.g. 12th Main Road, Indiranagar" />
              </Form.Item>
            </Form>
          </>
        )}

        {onboardingStep === 1 && isMerchant && (
          <Alert
            type="info"
            showIcon
            message="Set up your storefront"
            description="Add your store name, category and location on the map in under two minutes."
          />
        )}

        {onboardingStep === 2 && (
          <>
            <Text type="secondary">Pick what you usually buy to tailor your local feed.</Text>
            <div className="rq-interest-grid" role="group" aria-label="Shopping interests" style={{ marginTop: 14 }}>
              {SHOPPING_INTERESTS.map((item) => {
                const selected = interests.includes(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    aria-pressed={selected}
                    onClick={() => toggleInterest(item.id)}
                    className={`rq-interest-card${selected ? ' is-selected' : ''}`}
                  >
                    <span className="rq-interest-icon">{item.icon}</span>
                    <span className="rq-interest-text">
                      <span className="rq-interest-name">{item.name}</span>
                      <span className="rq-interest-desc">{item.desc}</span>
                    </span>
                    {selected && <CheckOutlined className="rq-interest-check" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </ResponsiveSheet>

      {/* Address create / edit */}
      {addressModalOpen && (
        <AddressModal
          open={addressModalOpen}
          onClose={() => {
            setAddressModalOpen(false);
            setEditingAddress(null);
          }}
          onSuccess={() => fetchProfileAndAddresses({ silent: true })}
          initialData={editingAddress}
          userProfile={profile || user_data}
        />
      )}
    </div>
  );
};

export default ProfileScreen;
