import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Tabs,
  Button,
  Avatar,
  Typography,
  Row,
  Col,
  Form,
  Input,
  Flex,
  Spin,
  Tag,
  Divider,
  message,
  Grid,
  Empty,
  Progress,
  Modal,
  Alert,
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
  RocketOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  TrophyOutlined,
  CompassOutlined,
  AimOutlined,
  ShoppingOutlined,
  CoffeeOutlined,
  MedicineBoxOutlined,
  ToolOutlined,
  SmileOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useHistory, useLocation } from 'react-router-dom';
import { useGlobalStore } from '../../app/services';
import { netWorkCall, apiConfig, checkUserRole, getPreciseUserLocation, getLocationName } from '../../app/utils';
import Routes from '../../app/routes/routes';
import { AddressCard, AddressModal } from '../../app/components/profile';
import { LeafletComponent } from '../../app/components';
import './profile.css';

const { Title, Text, Paragraph } = Typography;

// Clean, realistic shopper interest categories (No emojis, sleek modern icons)
const SHOPPING_INTERESTS = [
  { id: 'groceries', name: 'Groceries & Kirana', desc: 'Daily essentials & pantry staples', icon: <ShoppingOutlined /> },
  { id: 'dining', name: 'Restaurants & Dining', desc: 'Fresh meals, snacks & cafes', icon: <CoffeeOutlined /> },
  { id: 'pharmacy', name: 'Pharmacy & Wellness', desc: 'Medicines & health supplies', icon: <MedicineBoxOutlined /> },
  { id: 'services', name: 'Technicians & Repairs', desc: 'AC, electricians & plumbers', icon: <ToolOutlined /> },
  { id: 'salon', name: 'Salon & Personal Care', desc: 'Grooming & spa appointments', icon: <SmileOutlined /> },
  { id: 'retail', name: 'Local Retail & Stores', desc: 'Fashion, stationery & electronics', icon: <ShopOutlined /> },
];

const ProfileScreen = () => {
  const history = useHistory();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const { user_data, update_user_data } = useGlobalStore((state) => state);
  const { isMerchant } = checkUserRole(user_data);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [myShops, setMyShops] = useState([]);
  const [activeTabKey, setActiveTabKey] = useState('addresses');
  const [savingProfile, setSavingProfile] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  // Interactive Setup Guide & Focus State
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [focusedActionKey, setFocusedActionKey] = useState(null);

  // Guided Assistant Form State
  const [assistantData, setAssistantData] = useState({
    username: '',
    email: '',
    phone: '',
    // Address fields (customer)
    address_label: 'Home',
    street_area: '',
    house_flat_floor: '',
    city: 'Bengaluru',
    coords: [12.9716, 77.5946],
    interests: ['groceries', 'dining'],
  });
  const [detectingGps, setDetectingGps] = useState(false);
  const [savingAssistant, setSavingAssistant] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  const [profileForm] = Form.useForm();
  const emailInputRef = useRef(null);

  const fetchProfileAndAddresses = async () => {
    setLoading(true);
    try {
      const promises = [
        netWorkCall(apiConfig.user_profile, 'GET', null, true),
        netWorkCall(apiConfig.user_addresses, 'GET', null, true),
      ];

      if (isMerchant) {
        promises.push(netWorkCall(apiConfig.my_shops, 'POST', null, true));
      }

      const results = await Promise.all(promises);
      const profileRes = results[0];
      const addrRes = results[1];
      const shopsRes = results[2];

      if (profileRes?.data) {
        setProfile(profileRes.data);
        setAssistantData((prev) => ({
          ...prev,
          username: profileRes.data.username || user_data?.username || '',
          email: profileRes.data.email || '',
          phone: profileRes.data.mobile || user_data?.mobile || '',
        }));
        profileForm.setFieldsValue({
          username: profileRes.data.username || '',
          email: profileRes.data.email || '',
          mobile: profileRes.data.mobile || '',
        });
      }

      if (addrRes?.data) {
        setAddresses(addrRes.data);
      }

      if (shopsRes?.success && shopsRes?.data) {
        setMyShops(shopsRes.data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      message.error('Failed to load profile details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndAddresses();
  }, []);

  // Handle URL query parameters for onboarding (e.g. ?onboarding=customer&new=true)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const obParam = params.get('onboarding');
    const isNew = params.get('new') === 'true';

    if (obParam || isNew) {
      setOnboardingModalOpen(true);
      setOnboardingStep(0);
    }
  }, [location.search]);

  // Profile Save
  const handleUpdateProfile = async (values) => {
    setSavingProfile(true);
    try {
      const res = await netWorkCall(
        apiConfig.user_profile,
        'PUT',
        JSON.stringify(values),
        true
      );
      if (res?.success) {
        message.success('Profile updated successfully!');
        setProfile((prev) => ({ ...prev, ...res.data }));
        update_user_data({
          ...user_data,
          username: res.data.username,
          mobile: res.data.mobile,
          email: res.data.email,
        });
      } else {
        message.error(res?.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      message.error('Error saving profile changes');
    } finally {
      setSavingProfile(false);
    }
  };

  // Address Handlers
  const handleSetDefaultAddress = async (addr) => {
    try {
      const res = await netWorkCall(
        `${apiConfig.user_addresses}/${addr.id}/default`,
        'PUT',
        null,
        true
      );
      if (res?.success) {
        message.success(`Set ${addr.label || 'address'} as default`);
        setAddresses((prev) =>
          prev.map((a) => ({
            ...a,
            is_default: a.id === addr.id,
          }))
        );
      }
    } catch (err) {
      console.error('Set default error:', err);
      message.error('Failed to set default address');
    }
  };

  const handleDeleteAddress = async (addr) => {
    try {
      const res = await netWorkCall(
        `${apiConfig.user_addresses}/${addr.id}`,
        'DELETE',
        null,
        true
      );
      if (res?.success) {
        message.success('Address removed');
        setAddresses((prev) => prev.filter((a) => a.id !== addr.id));
      }
    } catch (err) {
      console.error('Delete address error:', err);
      message.error('Failed to delete address');
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

  // -------------------------------------------------------------------------
  // Profile Completion Score Engine & Interactive Checklist
  // -------------------------------------------------------------------------
  const calculateCompletion = () => {
    let score = 0;
    const checks = [];

    // 1. Basic Account Created (Username + Mobile)
    const hasBasic = !!(profile?.username && profile?.mobile);
    if (hasBasic) {
      score += isMerchant ? 25 : 30;
      checks.push({
        key: 'basic',
        label: 'Account Verified',
        fullLabel: 'Account Verified (Mobile & Username)',
        done: true,
        points: isMerchant ? 25 : 30,
      });
    } else {
      checks.push({
        key: 'basic',
        label: 'Basic Details',
        fullLabel: 'Complete Account Details',
        done: false,
        points: isMerchant ? 25 : 30,
        tab: 'profile_info',
      });
    }

    // 2. Email Address
    const hasEmail = !!(profile?.email && profile.email.trim());
    if (hasEmail) {
      score += isMerchant ? 20 : 25;
      checks.push({
        key: 'email',
        label: 'Email Added',
        fullLabel: 'Email Added for Digital Invoices',
        done: true,
        points: isMerchant ? 20 : 25,
      });
    } else {
      checks.push({
        key: 'email',
        label: 'Add Email',
        fullLabel: 'Add Email for Order Invoices',
        done: false,
        points: isMerchant ? 20 : 25,
        tab: 'profile_info',
      });
    }

    if (isMerchant) {
      // 3. Storefront Registration
      const hasShop = myShops && myShops.length > 0;
      if (hasShop) {
        score += 35;
        checks.push({
          key: 'shop',
          label: 'Storefront Live',
          fullLabel: `Store Registered (${myShops[0]?.shop_name || 'Active'})`,
          done: true,
          points: 35,
        });
      } else {
        checks.push({
          key: 'shop',
          label: 'Register Storefront',
          fullLabel: 'Register Physical Storefront',
          done: false,
          points: 35,
          action: 'register_shop',
        });
      }

      // 4. Shop Catalog
      const hasCatalog = myShops && myShops.some((s) => s.address || s.products_list);
      if (hasCatalog) {
        score += 20;
        checks.push({
          key: 'catalog',
          label: 'Catalog Configured',
          fullLabel: 'Store Address & Catalog Configured',
          done: true,
          points: 20,
        });
      } else {
        checks.push({
          key: 'catalog',
          label: 'Set Location & Menu',
          fullLabel: 'Set Store Location & Menu Items',
          done: false,
          points: 20,
          action: 'register_shop',
        });
      }
    } else {
      // 3. Saved Delivery Address
      const hasAddress = addresses && addresses.length > 0;
      if (hasAddress) {
        score += 35;
        checks.push({
          key: 'address',
          label: `Address Saved (${addresses.length})`,
          fullLabel: `Delivery Address Saved (${addresses.length})`,
          done: true,
          points: 35,
        });
      } else {
        checks.push({
          key: 'address',
          label: 'Add Delivery Address',
          fullLabel: 'Add Primary Delivery Address / Pin',
          done: false,
          points: 35,
          action: 'add_address',
        });
      }

      // 4. Set Default Address
      const hasDefault = addresses && addresses.some((a) => a.is_default);
      if (hasDefault) {
        score += 10;
        checks.push({
          key: 'default_addr',
          label: 'Default Address Set',
          fullLabel: 'Default 1-Tap Delivery Address Selected',
          done: true,
          points: 10,
        });
      } else {
        checks.push({
          key: 'default_addr',
          label: 'Set Default Address',
          fullLabel: 'Select Default Address for Quick Orders',
          done: false,
          points: 10,
          action: 'add_address',
        });
      }
    }

    return { score: Math.min(score, 100), checks };
  };

  const { score: completionScore, checks: completionChecks } = calculateCompletion();
  const firstIncompleteCheck = completionChecks.find((c) => !c.done);

  // -------------------------------------------------------------------------
  // Interactive Setup Guide Focus Handler
  // -------------------------------------------------------------------------
  const handleExecuteChecklistAction = (check) => {
    setFocusedActionKey(check.key);

    if (check.key === 'email' || check.tab === 'profile_info') {
      setActiveTabKey('profile_info');
      // Smooth focus on personal form
      setTimeout(() => {
        if (emailInputRef.current) {
          emailInputRef.current.focus({ cursor: 'end' });
        }
      }, 200);
      message.info('Enter your email address below and click Save Changes');
    } else if (check.action === 'add_address' || check.key === 'address' || check.key === 'default_addr') {
      handleAddNewAddress();
    } else if (check.action === 'register_shop' || check.key === 'shop' || check.key === 'catalog') {
      history.push(`${Routes.client}?onboarding=shop`);
    } else {
      setOnboardingModalOpen(true);
    }
  };

  // -------------------------------------------------------------------------
  // Onboarding Assistant Step Actions
  // -------------------------------------------------------------------------
  const handleDetectAssistantGps = async () => {
    setDetectingGps(true);
    try {
      const loc = await getPreciseUserLocation(true);
      if (loc && loc.length === 2) {
        setAssistantData((prev) => ({ ...prev, coords: loc }));
        const areaName = await getLocationName(loc[0], loc[1]);
        if (areaName) {
          setAssistantData((prev) => ({
            ...prev,
            street_area: prev.street_area || areaName,
          }));
          message.success('GPS location applied');
        }
      }
    } catch (e) {
      console.warn('GPS detection error:', e);
      message.warning('Could not auto-detect location. You can enter it manually.');
    } finally {
      setDetectingGps(false);
    }
  };

  const handleSaveAssistantStep = async () => {
    // Step 0: Save contact details if modified
    if (onboardingStep === 0) {
      if (assistantData.email && assistantData.email !== profile?.email) {
        setSavingAssistant(true);
        try {
          await netWorkCall(
            apiConfig.user_profile,
            'PUT',
            JSON.stringify({
              username: assistantData.username || profile?.username,
              email: assistantData.email.trim(),
            }),
            true
          );
          setProfile((prev) => ({ ...prev, email: assistantData.email.trim() }));
          update_user_data({ ...user_data, email: assistantData.email.trim() });
        } catch (e) {
          console.warn('Step 0 email save:', e);
        } finally {
          setSavingAssistant(false);
        }
      }
      setOnboardingStep(1);
      return;
    }

    // Step 1: Save Address (Customer) or navigate to Store setup (Merchant)
    if (onboardingStep === 1) {
      if (isMerchant) {
        setOnboardingModalOpen(false);
        history.push(`${Routes.client}?onboarding=shop`);
        return;
      }

      // If customer has no address and typed something
      if (addresses.length === 0 && (assistantData.street_area || assistantData.house_flat_floor)) {
        setSavingAssistant(true);
        try {
          const payload = {
            label: assistantData.address_label || 'Home',
            recipient_name: assistantData.username || profile?.username || 'User',
            recipient_phone: assistantData.phone || profile?.mobile || '',
            house_flat_floor: assistantData.house_flat_floor || '',
            street_area: assistantData.street_area || 'Neighborhood',
            city: assistantData.city || 'Bengaluru',
            latitude: assistantData.coords[0],
            longitude: assistantData.coords[1],
            is_default: true,
          };
          const res = await netWorkCall(apiConfig.user_addresses, 'POST', JSON.stringify(payload), true);
          if (res?.success) {
            setAddresses([res.data]);
            message.success('Delivery address saved!');
          }
        } catch (e) {
          console.error('Assistant address save error:', e);
        } finally {
          setSavingAssistant(false);
        }
      }
      setOnboardingStep(2);
      return;
    }

    // Step 2: Final completion
    if (onboardingStep === 2) {
      setOnboardingModalOpen(false);
      history.replace(Routes.profile);
      message.success('Profile setup finished!');
    }
  };

  const handleToggleInterest = (id) => {
    setAssistantData((prev) => {
      const exists = prev.interests.includes(id);
      return {
        ...prev,
        interests: exists ? prev.interests.filter((i) => i !== id) : [...prev.interests, id],
      };
    });
  };

  return (
    <div className="profile-page-shell">
      {loading ? (
        <Flex justify="center" align="center" style={{ minHeight: '50vh' }}>
          <Spin size="large" tip="Loading account profile..." />
        </Flex>
      ) : (
        <>
          {/* ================================================================
              TOP USER HERO CARD (Cool, Light, Minimalist Aesthetic)
              ================================================================ */}
          <Card
            className="profile-hero-card"
            styles={{ body: { padding: screens.xs ? '18px 14px' : '24px 26px' } }}
          >
            <Flex
              justify="space-between"
              align={isMobile ? 'flex-start' : 'center'}
              vertical={isMobile}
              gap={16}
            >
              {/* User Avatar & Name */}
              <Flex align="center" gap={14}>
                <Avatar
                  size={screens.xs ? 56 : 68}
                  className={isMerchant ? 'profile-avatar-cool profile-avatar-merchant' : 'profile-avatar-cool'}
                >
                  {(profile?.username || user_data?.username || 'U')[0].toUpperCase()}
                </Avatar>

                <div>
                  <Flex align="center" gap={8} wrap="wrap">
                    <Title level={screens.xs ? 4 : 3} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
                      {profile?.username || user_data?.username || 'User'}
                    </Title>
                    {isMerchant ? (
                      <span className="profile-role-badge merchant">
                        <ShopOutlined /> Shop Owner
                      </span>
                    ) : (
                      <span className="profile-role-badge buyer">
                        <SafetyCertificateOutlined /> Shopper
                      </span>
                    )}
                  </Flex>

                  <Flex gap={14} wrap="wrap" style={{ marginTop: 6, fontSize: 13, color: '#64748b' }}>
                    <Flex align="center" gap={5}>
                      <PhoneOutlined style={{ color: '#94a3b8' }} />
                      <span>{profile?.mobile || user_data?.mobile || 'No phone'}</span>
                    </Flex>
                    {profile?.email ? (
                      <Flex align="center" gap={5}>
                        <MailOutlined style={{ color: '#94a3b8' }} />
                        <span>{profile.email}</span>
                      </Flex>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 12 }}>
                        No email added
                      </span>
                    )}
                  </Flex>
                </div>
              </Flex>

              {/* Action Buttons */}
              <Flex gap={8} wrap="wrap" style={{ width: isMobile ? '100%' : 'auto' }}>
                <Button
                  icon={<RocketOutlined />}
                  onClick={() => {
                    setOnboardingStep(0);
                    setOnboardingModalOpen(true);
                  }}
                  style={{
                    borderRadius: 8,
                    fontWeight: 600,
                    borderColor: '#cbd5e1',
                    color: '#334155',
                    flex: isMobile ? 1 : 'none',
                    height: 38,
                  }}
                >
                  Setup Guide
                </Button>
                <Button
                  danger
                  icon={<LogoutOutlined />}
                  onClick={logout}
                  style={{
                    borderRadius: 8,
                    fontWeight: 600,
                    flex: isMobile ? 1 : 'none',
                    height: 38,
                  }}
                >
                  Log Out
                </Button>
              </Flex>
            </Flex>

            {/* Quick Metrics Bar */}
            <div className="profile-metrics-grid">
              <div className="profile-metric-box">
                <div className="profile-metric-label">Saved Addresses</div>
                <div className="profile-metric-value">{addresses.length}</div>
              </div>
              <div className="profile-metric-box">
                <div className="profile-metric-label">Account Type</div>
                <div className="profile-metric-value" style={{ fontSize: 15, color: '#334155' }}>
                  {isMerchant ? 'Shop Owner' : 'Verified Shopper'}
                </div>
              </div>
              <div className="profile-metric-box metric-col-full">
                <div className="profile-metric-label">Quick Actions</div>
                <Flex gap={8} style={{ marginTop: 4 }}>
                  <Button
                    size="small"
                    type="link"
                    icon={<PlusOutlined />}
                    onClick={handleAddNewAddress}
                    style={{ padding: 0, fontWeight: 700, color: '#4f46e5' }}
                  >
                    Add Address
                  </Button>
                  <span style={{ color: '#cbd5e1' }}>•</span>
                  <Button
                    size="small"
                    type="link"
                    icon={<CompassOutlined />}
                    onClick={() => history.push(Routes.app)}
                    style={{ padding: 0, fontWeight: 600, color: '#64748b' }}
                  >
                    Explore Stores
                  </Button>
                </Flex>
              </div>
            </div>
          </Card>

          {/* ================================================================
              INTERACTIVE SETUP GUIDE FOCUS CARD (Light, Cool, Clean)
              ================================================================ */}
          <Card
            className={`setup-guide-card ${completionScore === 100 ? 'completed' : ''} ${
              focusedActionKey ? 'interactive-focused' : ''
            }`}
            styles={{ body: { padding: screens.xs ? '16px 14px' : '20px 22px' } }}
          >
            <Flex justify="space-between" align={isMobile ? 'flex-start' : 'center'} vertical={isMobile} gap={10}>
              <div style={{ flex: 1, width: '100%' }}>
                <Flex align="center" justify="space-between" wrap="wrap" gap={6}>
                  <Flex align="center" gap={8}>
                    {completionScore === 100 ? (
                      <TrophyOutlined style={{ color: '#10b981', fontSize: 18 }} />
                    ) : (
                      <RocketOutlined style={{ color: '#4f46e5', fontSize: 18 }} />
                    )}
                    <span style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>
                      Profile Setup: {completionScore}% Complete
                    </span>
                  </Flex>
                  <Tag
                    color={completionScore === 100 ? 'success' : completionScore >= 60 ? 'default' : 'warning'}
                    style={{ fontWeight: 700, borderRadius: 6, margin: 0, fontSize: 11 }}
                  >
                    {completionScore === 100 ? 'Verified' : `${100 - completionScore}% To Complete`}
                  </Tag>
                </Flex>

                <div className="setup-progress-wrap">
                  <Progress
                    percent={completionScore}
                    status={completionScore === 100 ? 'success' : 'normal'}
                    showInfo={false}
                    strokeColor={completionScore === 100 ? '#10b981' : '#4f46e5'}
                    strokeWidth={6}
                  />
                </div>

                {/* Interactive Checklist Pills */}
                <div className="setup-checklist-wrap">
                  {completionChecks.map((check) => (
                    <div
                      key={check.key}
                      onClick={() => !check.done && handleExecuteChecklistAction(check)}
                      className={`setup-check-chip ${check.done ? 'done' : 'pending'} ${
                        focusedActionKey === check.key ? 'active-focus' : ''
                      }`}
                      title={check.fullLabel}
                    >
                      {check.done ? (
                        <>
                          <CheckCircleFilled />
                          <span>{check.label}</span>
                        </>
                      ) : (
                        <>
                          <span>+ {check.label}</span>
                          <span className="setup-point-tag">+{check.points}%</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Interactive Next Step Focus Banner */}
                {completionScore < 100 && firstIncompleteCheck && (
                  <div className="setup-focus-banner">
                    <div className="setup-focus-banner-left">
                      <div className="setup-focus-beacon" />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                          Next Recommended Step: {firstIncompleteCheck.fullLabel}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Tap to complete this detail and boost your account status.
                        </div>
                      </div>
                    </div>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => handleExecuteChecklistAction(firstIncompleteCheck)}
                      style={{
                        borderRadius: 6,
                        fontWeight: 700,
                        background: '#0f172a',
                        borderColor: '#0f172a',
                        height: 32,
                        padding: '0 14px',
                      }}
                    >
                      Complete Now <ArrowRightOutlined style={{ fontSize: 10 }} />
                    </Button>
                  </div>
                )}
              </div>
            </Flex>
          </Card>

          {/* ================================================================
              MAIN TABS (Clean White Cards, Light Theme)
              ================================================================ */}
          <Card
            className="profile-clean-card profile-tabs-card"
            styles={{ body: { padding: screens.xs ? '14px 12px' : '20px 22px' } }}
          >
            <Tabs
              activeKey={activeTabKey}
              onChange={setActiveTabKey}
              items={[
                {
                  key: 'addresses',
                  label: (
                    <span>
                      <EnvironmentOutlined /> Delivery Addresses ({addresses.length})
                    </span>
                  ),
                  children: (
                    <div style={{ paddingTop: 4 }}>
                      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }} wrap="wrap" gap={10}>
                        <div>
                          <Title level={5} style={{ margin: 0, color: '#0f172a', fontWeight: 700 }}>
                            Saved Delivery Locations
                          </Title>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Manage saved addresses for 1-tap checkout and proximity store search.
                          </Text>
                        </div>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={handleAddNewAddress}
                          style={{
                            borderRadius: 8,
                            fontWeight: 700,
                            background: '#0f172a',
                            borderColor: '#0f172a',
                            height: 38,
                          }}
                        >
                          Add New Address
                        </Button>
                      </Flex>

                      {addresses.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '36px 16px' }}>
                          <Empty
                            description={
                              <div>
                                <div style={{ fontWeight: 700, color: '#334155', fontSize: 14, marginBottom: 4 }}>
                                  No delivery address saved yet
                                </div>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  Save your home or work location for quick order placement and accurate walking distance.
                                </Text>
                              </div>
                            }
                          >
                            <Button
                              type="primary"
                              icon={<PlusOutlined />}
                              onClick={handleAddNewAddress}
                              style={{
                                marginTop: 12,
                                borderRadius: 8,
                                fontWeight: 700,
                                background: '#0f172a',
                                borderColor: '#0f172a',
                              }}
                            >
                              Add Your Address
                            </Button>
                          </Empty>
                        </div>
                      ) : (
                        <Row gutter={[14, 14]}>
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
                    </div>
                  ),
                },
                {
                  key: 'profile_info',
                  label: (
                    <span>
                      <UserOutlined /> Personal Details
                    </span>
                  ),
                  children: (
                    <div style={{ maxWidth: 520, paddingTop: 6 }}>
                      <Title level={5} style={{ marginBottom: 4, color: '#0f172a', fontWeight: 700 }}>
                        Contact Information
                      </Title>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 18 }}>
                        Used for order confirmations and store direct communication.
                      </Text>

                      <Form form={profileForm} layout="vertical" onFinish={handleUpdateProfile}>
                        <Form.Item
                          name="username"
                          label="Display Name / Username"
                          rules={[{ required: true, message: 'Please enter your username' }]}
                        >
                          <Input
                            prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="Your username"
                            size="large"
                            style={{ borderRadius: 8 }}
                          />
                        </Form.Item>

                        <Form.Item
                          name="mobile"
                          label="Mobile Number (Verified)"
                          rules={[{ required: true, message: 'Mobile number is required' }]}
                        >
                          <Input
                            prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="Mobile number"
                            size="large"
                            style={{ borderRadius: 8 }}
                          />
                        </Form.Item>

                        <Form.Item
                          name="email"
                          label="Email Address (For receipts & invoices)"
                        >
                          <Input
                            ref={emailInputRef}
                            prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="name@example.com"
                            size="large"
                            style={{ borderRadius: 8 }}
                          />
                        </Form.Item>

                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={savingProfile}
                          size="large"
                          style={{
                            marginTop: 6,
                            borderRadius: 8,
                            fontWeight: 700,
                            background: '#0f172a',
                            borderColor: '#0f172a',
                            padding: '0 26px',
                          }}
                        >
                          Save Changes
                        </Button>
                      </Form>
                    </div>
                  ),
                },
                ...(isMerchant
                  ? [
                      {
                        key: 'account_hub',
                        label: (
                          <span>
                            <ShopOutlined /> Storefront & Outlets
                          </span>
                        ),
                        children: (
                          <div style={{ paddingTop: 6 }}>
                            <Title level={5} style={{ marginBottom: 4, color: '#0f172a', fontWeight: 700 }}>
                              Merchant & Store Management
                            </Title>
                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 18 }}>
                              Manage your physical storefronts, catalog, and active outlets.
                            </Text>

                            <div
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: 14,
                                padding: '18px 20px',
                                marginBottom: 16,
                              }}
                            >
                              <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>
                                    Merchant Outlet Hub Active
                                  </div>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {myShops.length > 0
                                      ? `You have ${myShops.length} registered storefront(s). Manage catalog and orders.`
                                      : 'Setup your storefront pin and catalog on the neighborhood map.'}
                                  </Text>
                                </div>
                                <Button
                                  type="primary"
                                  onClick={() => history.push(Routes.client)}
                                  style={{
                                    borderRadius: 8,
                                    fontWeight: 700,
                                    background: '#0f172a',
                                    borderColor: '#0f172a',
                                  }}
                                >
                                  Open Merchant Studio
                                </Button>
                              </Flex>
                            </div>
                          </div>
                        ),
                      },
                    ]
                  : []),
              ]}
            />

            {/* Quiet Seller Option for Shoppers (Ensures phone numbers never deadlock) */}
            {!isMerchant && (
              <div
                style={{
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: '1px solid #f1f5f9',
                  textAlign: 'center',
                }}
              >
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Are you a local shop owner or technician?{' '}
                  <Button
                    type="link"
                    size="small"
                    onClick={() => history.push(`${Routes.client}?onboarding=shop`)}
                    style={{ padding: 0, fontSize: 12, fontWeight: 600, color: '#4f46e5' }}
                  >
                    Register your storefront with 0% commission &rarr;
                  </Button>
                </Text>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ================================================================
          INTERACTIVE ONBOARDING ASSISTANT MODAL (Mobile-Optimized)
          ================================================================ */}
      <Modal
        open={onboardingModalOpen}
        onCancel={() => {
          setOnboardingModalOpen(false);
          history.replace(Routes.profile);
        }}
        footer={null}
        width={screens.xs ? '96vw' : 580}
        centered
        className="onboarding-sheet-modal"
        destroyOnClose
      >
        <div className="onboarding-sheet-header">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#f1f5f9',
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              margin: '0 auto 10px',
              border: '1px solid #e2e8f0',
            }}
          >
            {isMerchant ? <ShopOutlined /> : <RocketOutlined />}
          </div>
          <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
            {isMerchant ? 'Shop Owner Quick Setup' : 'Welcome to Rquest'}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {isMerchant
              ? 'Complete your profile and get your store ready for local customers.'
              : 'Setup your account in 3 quick steps to find stores and place orders.'}
          </Text>
        </div>

        <div className="onboarding-sheet-body">
          {/* Step Pills */}
          <div className="onboarding-step-pill-row">
            <span
              className={`onboarding-step-pill ${
                onboardingStep === 0 ? 'active' : onboardingStep > 0 ? 'completed' : ''
              }`}
            >
              1. Contact
            </span>
            <span
              className={`onboarding-step-pill ${
                onboardingStep === 1 ? 'active' : onboardingStep > 1 ? 'completed' : ''
              }`}
            >
              {isMerchant ? '2. Storefront' : '2. Address'}
            </span>
            <span
              className={`onboarding-step-pill ${
                onboardingStep === 2 ? 'active' : ''
              }`}
            >
              {isMerchant ? '3. Launch' : '3. Interests'}
            </span>
          </div>

          {/* STEP 0: Contact & Email Details */}
          {onboardingStep === 0 && (
            <div>
              <div className="live-profile-preview">
                <Flex align="center" gap={12}>
                  <Avatar size={48} className="profile-avatar-cool">
                    {(assistantData.username || 'U')[0].toUpperCase()}
                  </Avatar>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                      {assistantData.username || 'User'}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      Mobile: {assistantData.phone || 'Verified'}
                    </div>
                  </div>
                </Flex>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5, color: '#334155' }}>
                  Account Name
                </label>
                <Input
                  size="large"
                  value={assistantData.username}
                  onChange={(e) => setAssistantData({ ...assistantData, username: e.target.value })}
                  prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                  style={{ borderRadius: 8 }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5, color: '#334155' }}>
                  Email Address (For digital receipts & invoices)
                </label>
                <Input
                  size="large"
                  placeholder="name@example.com"
                  value={assistantData.email}
                  onChange={(e) => setAssistantData({ ...assistantData, email: e.target.value })}
                  prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
                  style={{ borderRadius: 8 }}
                />
              </div>

              <div className="onboarding-actions-footer">
                <Button
                  type="text"
                  onClick={() => {
                    setOnboardingModalOpen(false);
                    history.replace(Routes.profile);
                  }}
                  style={{ color: '#64748b' }}
                >
                  Skip for now
                </Button>
                <Button
                  type="primary"
                  size="large"
                  loading={savingAssistant}
                  onClick={handleSaveAssistantStep}
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
              </div>
            </div>
          )}

          {/* STEP 1: Address (Customer) OR Storefront (Merchant) */}
          {onboardingStep === 1 && (
            <div>
              {isMerchant ? (
                <div>
                  <div style={{ textAlign: 'center', padding: '12px 0 16px' }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 4 }}>
                      Register Your Storefront Outlet
                    </div>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Pin your physical shop on the neighborhood map with 0% commission.
                    </Text>
                  </div>

                  <Alert
                    message="Instant Store Setup Ready"
                    description="Set your store name, business category, and GPS location in under 2 minutes."
                    type="info"
                    showIcon
                    style={{ marginBottom: 18, borderRadius: 10 }}
                  />

                  <div className="onboarding-actions-footer">
                    <Button onClick={() => setOnboardingStep(0)} style={{ borderRadius: 8 }}>
                      <ArrowLeftOutlined /> Back
                    </Button>
                    <Button
                      type="primary"
                      size="large"
                      onClick={() => {
                        setOnboardingModalOpen(false);
                        history.push(`${Routes.client}?onboarding=shop`);
                      }}
                      style={{
                        borderRadius: 8,
                        fontWeight: 700,
                        background: '#0f172a',
                        borderColor: '#0f172a',
                        padding: '0 24px',
                      }}
                    >
                      Open Storefront Creator <ArrowRightOutlined />
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
                      Add Primary Delivery Location
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Pin your address to see stores within walking distance.
                    </Text>
                  </div>

                  {/* 1-Tap Detect Location Button */}
                  <Button
                    icon={<AimOutlined />}
                    onClick={handleDetectAssistantGps}
                    loading={detectingGps}
                    style={{
                      width: '100%',
                      height: 42,
                      borderRadius: 10,
                      fontWeight: 600,
                      marginBottom: 14,
                      background: '#f8fafc',
                      borderColor: '#cbd5e1',
                      color: '#0f172a',
                    }}
                  >
                    1-Tap Auto-Detect GPS Location
                  </Button>

                  {/* Address Label Pills */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: 12, marginBottom: 6, color: '#475569' }}>
                      Address Label
                    </label>
                    <Flex gap={8}>
                      {['Home', 'Work', 'Other'].map((lbl) => (
                        <Button
                          key={lbl}
                          size="small"
                          onClick={() => setAssistantData({ ...assistantData, address_label: lbl })}
                          style={{
                            borderRadius: 8,
                            fontWeight: 600,
                            background: assistantData.address_label === lbl ? '#0f172a' : '#ffffff',
                            color: assistantData.address_label === lbl ? '#ffffff' : '#334155',
                            borderColor: assistantData.address_label === lbl ? '#0f172a' : '#e2e8f0',
                            flex: 1,
                          }}
                        >
                          {lbl}
                        </Button>
                      ))}
                    </Flex>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: 12, marginBottom: 4, color: '#475569' }}>
                      House / Flat / Floor No.
                    </label>
                    <Input
                      placeholder="e.g. Flat 302, Green Valley Apartments"
                      value={assistantData.house_flat_floor}
                      onChange={(e) => setAssistantData({ ...assistantData, house_flat_floor: e.target.value })}
                      style={{ borderRadius: 8 }}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: 12, marginBottom: 4, color: '#475569' }}>
                      Street & Neighborhood / Area
                    </label>
                    <Input
                      placeholder="e.g. 12th Main Road, Indiranagar"
                      value={assistantData.street_area}
                      onChange={(e) => setAssistantData({ ...assistantData, street_area: e.target.value })}
                      style={{ borderRadius: 8 }}
                    />
                  </div>

                  <div className="onboarding-actions-footer">
                    <Button onClick={() => setOnboardingStep(0)} style={{ borderRadius: 8 }}>
                      <ArrowLeftOutlined /> Back
                    </Button>
                    <Button
                      type="primary"
                      size="large"
                      loading={savingAssistant}
                      onClick={handleSaveAssistantStep}
                      style={{
                        borderRadius: 8,
                        fontWeight: 700,
                        background: '#0f172a',
                        borderColor: '#0f172a',
                        padding: '0 24px',
                      }}
                    >
                      Save & Next <ArrowRightOutlined />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Shopping Interests (Customer) or Done */}
          {onboardingStep === 2 && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
                  What do you usually shop for?
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Pick categories to customize your local marketplace feed.
                </Text>
              </div>

              <div className="category-interest-grid">
                {SHOPPING_INTERESTS.map((item) => {
                  const isSelected = assistantData.interests.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleInterest(item.id)}
                      className={`category-interest-card ${isSelected ? 'selected' : ''}`}
                    >
                      <div className="category-interest-icon" style={{ color: isSelected ? '#4f46e5' : '#64748b' }}>
                        {item.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="category-interest-name">{item.name}</div>
                        <div className="category-interest-desc">{item.desc}</div>
                      </div>
                      {isSelected && <CheckOutlined style={{ color: '#4f46e5', fontSize: 12 }} />}
                    </div>
                  );
                })}
              </div>

              <div className="onboarding-actions-footer">
                <Button onClick={() => setOnboardingStep(1)} style={{ borderRadius: 8 }}>
                  <ArrowLeftOutlined /> Back
                </Button>
                <Button
                  type="primary"
                  size="large"
                  onClick={async () => {
                    await handleSaveAssistantStep();
                    history.push(Routes.app);
                  }}
                  style={{
                    borderRadius: 8,
                    fontWeight: 700,
                    background: '#0f172a',
                    borderColor: '#0f172a',
                    padding: '0 24px',
                  }}
                >
                  Explore Marketplace <ArrowRightOutlined />
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Address Create / Edit Modal */}
      {addressModalOpen && (
        <AddressModal
          open={addressModalOpen}
          onClose={() => {
            setAddressModalOpen(false);
            setEditingAddress(null);
          }}
          onSuccess={() => fetchProfileAndAddresses()}
          initialData={editingAddress}
          userProfile={profile || user_data}
        />
      )}

      {/* Embedded Leaflet Map Modal */}
      {showMapModal && (
        <Modal
          open={showMapModal}
          onCancel={() => setShowMapModal(false)}
          footer={null}
          width="100vw"
          wrapClassName="full-view-map-modal"
          closable={false}
          style={{ top: 0, left: 0, margin: 0, padding: 0, maxWidth: '100vw', height: '100vh' }}
          styles={{ body: { height: '100vh', padding: 0, margin: 0, overflow: 'hidden' } }}
        >
          <LeafletComponent
            isModalVisible={showMapModal}
            position={assistantData.coords}
            setPosition={(loc) => setAssistantData((p) => ({ ...p, coords: loc }))}
            markerLocation={assistantData.coords}
            updateMarker={(loc) => setAssistantData((p) => ({ ...p, coords: loc }))}
            onClose={() => setShowMapModal(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default ProfileScreen;
