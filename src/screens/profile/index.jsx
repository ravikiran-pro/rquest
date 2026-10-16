import React, { useState, useEffect } from 'react';
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
  Statistic,
  Progress,
  Steps,
  Modal,
  Alert,
  Tooltip,
} from 'antd';
import {
  UserOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  PlusOutlined,
  OrderedListOutlined,
  ShopOutlined,
  MessageOutlined,
  LogoutOutlined,
  CalendarOutlined,
  SafetyCertificateOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  RocketOutlined,
  ArrowRightOutlined,
  TrophyOutlined,
  StarFilled,
  InfoCircleOutlined,
  CompassOutlined,
} from '@ant-design/icons';
import { useHistory, useLocation } from 'react-router-dom';
import { useGlobalStore } from '../../app/services';
import { netWorkCall, apiConfig, checkUserRole, storageKeys } from '../../app/utils';
import Routes from '../../app/routes/routes';
import { AddressCard, AddressModal } from '../../app/components/profile';

const { Title, Text, Paragraph } = Typography;

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

  // Guided Onboarding State
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingEmail, setOnboardingEmail] = useState('');
  const [savingOnboarding, setSavingOnboarding] = useState(false);

  const [profileForm] = Form.useForm();

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
        setOnboardingEmail(profileRes.data.email || '');
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
    }
  }, [location.search]);

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

  const handleAddressModalSuccess = () => {
    fetchProfileAndAddresses();
  };

  const logout = () => {
    update_user_data({});
    sessionStorage.clear();
    history.push(Routes.login);
  };

  // -------------------------------------------------------------------------
  // Profile Completion Score Engine
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
        label: 'Account Verified (Mobile & User)',
        done: true,
        points: isMerchant ? 25 : 30,
      });
    } else {
      checks.push({
        key: 'basic',
        label: 'Complete Account Details',
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
        label: 'Email Added for Receipts',
        done: true,
        points: isMerchant ? 20 : 25,
      });
    } else {
      checks.push({
        key: 'email',
        label: 'Add Email Address',
        done: false,
        points: isMerchant ? 20 : 25,
        tab: 'profile_info',
      });
    }

    if (isMerchant) {
      // 3. Storefront Registration (for Shop Owners)
      const hasShop = myShops && myShops.length > 0;
      if (hasShop) {
        score += 35;
        checks.push({
          key: 'shop',
          label: `Storefront Registered (${myShops[0]?.shop_name || 'Active'})`,
          done: true,
          points: 35,
        });
      } else {
        checks.push({
          key: 'shop',
          label: 'Register First Physical Storefront',
          done: false,
          points: 35,
          action: 'register_shop',
        });
      }

      // 4. Shop Catalog / Address
      const hasCatalog = myShops && myShops.some((s) => s.address || s.products_list);
      if (hasCatalog) {
        score += 20;
        checks.push({
          key: 'catalog',
          label: 'Store Address & Catalog Configured',
          done: true,
          points: 20,
        });
      } else {
        checks.push({
          key: 'catalog',
          label: 'Set Store Location & Menu/Catalog',
          done: false,
          points: 20,
          action: 'register_shop',
        });
      }
    } else {
      // 3. Saved Delivery Address (for Customers)
      const hasAddress = addresses && addresses.length > 0;
      if (hasAddress) {
        score += 35;
        checks.push({
          key: 'address',
          label: `Delivery Address Saved (${addresses.length})`,
          done: true,
          points: 35,
        });
      } else {
        checks.push({
          key: 'address',
          label: 'Add Delivery Address / Map Pin',
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
          label: 'Default 1-Tap Delivery Address Selected',
          done: true,
          points: 10,
        });
      } else {
        checks.push({
          key: 'default_addr',
          label: 'Select Default Address for Proximity Search',
          done: false,
          points: 10,
          action: 'add_address',
        });
      }
    }

    return { score: Math.min(score, 100), checks };
  };

  const { score: completionScore, checks: completionChecks } = calculateCompletion();

  // -------------------------------------------------------------------------
  // Onboarding Guided Step Actions
  // -------------------------------------------------------------------------
  const handleSaveOnboardingDetails = async () => {
    if (!onboardingEmail.trim()) {
      setOnboardingStep(1);
      return;
    }
    setSavingOnboarding(true);
    try {
      const res = await netWorkCall(
        apiConfig.user_profile,
        'PUT',
        JSON.stringify({
          username: profile?.username || user_data?.username,
          email: onboardingEmail.trim(),
        }),
        true
      );
      if (res?.success) {
        message.success('Contact info updated!');
        setProfile((prev) => ({ ...prev, email: onboardingEmail.trim() }));
        setOnboardingStep(1);
      } else {
        setOnboardingStep(1);
      }
    } catch (e) {
      setOnboardingStep(1);
    } finally {
      setSavingOnboarding(false);
    }
  };

  const handleSkipOnboarding = (goToMarket = false) => {
    setOnboardingModalOpen(false);
    // Clean up onboarding query params from URL
    history.replace(Routes.profile);
    message.info('You can complete your profile setup anytime from this page.');
    if (goToMarket) {
      history.push(Routes.app);
    }
  };

  const handleChecklistAction = (check) => {
    if (check.tab) {
      setActiveTabKey(check.tab);
    } else if (check.action === 'add_address') {
      handleAddNewAddress();
    } else if (check.action === 'register_shop') {
      history.push(`${Routes.client}?onboarding=shop`);
    }
  };

  return (
    <div
      style={{
        maxWidth: 1040,
        margin: '0 auto',
        padding: screens.xs ? '16px 12px 80px' : '28px 20px 80px',
      }}
    >
      {loading ? (
        <Flex justify="center" align="center" style={{ minHeight: '50vh' }}>
          <Spin size="large" tip="Loading account profile..." />
        </Flex>
      ) : (
        <>
          {/* Top User Profile Hero Card */}
          <Card
            style={{
              borderRadius: 18,
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06)',
              marginBottom: 20,
              overflow: 'hidden',
              background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            }}
            styles={{ body: { padding: screens.xs ? '20px 16px' : '28px 28px' } }}
          >
            <Flex
              justify="space-between"
              align={isMobile ? 'flex-start' : 'center'}
              vertical={isMobile}
              gap={18}
            >
              {/* User Avatar & Info */}
              <Flex align="center" gap={16}>
                <Avatar
                  size={screens.xs ? 60 : 72}
                  style={{
                    backgroundColor: isMerchant ? '#7c3aed' : '#4f46e5',
                    fontSize: screens.xs ? 24 : 28,
                    fontWeight: 800,
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.28)',
                    flexShrink: 0,
                  }}
                >
                  {(profile?.username || user_data?.username || 'U')[0].toUpperCase()}
                </Avatar>

                <div>
                  <Flex align="center" gap={8} wrap="wrap">
                    <Title level={screens.xs ? 4 : 3} style={{ margin: 0, color: '#0f172a' }}>
                      {profile?.username || user_data?.username || 'User'}
                    </Title>
                    {isMerchant ? (
                      <Tag color="purple" style={{ borderRadius: 6, fontWeight: 700, margin: 0 }}>
                        <ShopOutlined /> Shop Owner
                      </Tag>
                    ) : (
                      <Tag color="blue" style={{ borderRadius: 6, fontWeight: 700, margin: 0 }}>
                        <SafetyCertificateOutlined /> Customer
                      </Tag>
                    )}
                  </Flex>

                  <Flex gap={16} wrap="wrap" style={{ marginTop: 6, fontSize: 13, color: '#64748b' }}>
                    <Flex align="center" gap={4}>
                      <PhoneOutlined />
                      <span>{profile?.mobile || user_data?.mobile || 'No phone'}</span>
                    </Flex>
                    {profile?.email && (
                      <Flex align="center" gap={4}>
                        <MailOutlined />
                        <span>{profile.email}</span>
                      </Flex>
                    )}
                  </Flex>
                </div>
              </Flex>

              {/* Action Buttons */}
              <Flex gap={10} wrap="wrap">
                <Button
                  icon={<RocketOutlined />}
                  onClick={() => setOnboardingModalOpen(true)}
                  style={{ borderRadius: 8, fontWeight: 600, border: '1px solid #cbd5e1' }}
                >
                  Setup Guide
                </Button>
                <Button
                  danger
                  icon={<LogoutOutlined />}
                  onClick={logout}
                  style={{ borderRadius: 8, fontWeight: 600 }}
                >
                  Log Out
                </Button>
              </Flex>
            </Flex>

            {/* Quick Metrics Bar */}
            <Divider style={{ margin: '20px 0 16px 0' }} />
            <Row gutter={[16, 12]}>
              <Col xs={12} sm={8}>
                <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Saved Addresses
                  </Text>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                    {addresses.length}
                  </div>
                </div>
              </Col>
              <Col xs={12} sm={8}>
                <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Account Type
                  </Text>
                  <div style={{ fontSize: 15, fontWeight: 700, color: isMerchant ? '#7c3aed' : '#4f46e5', marginTop: 4 }}>
                    {isMerchant ? 'Merchant Hub' : 'Standard Buyer'}
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Quick Actions
                  </Text>
                  <Flex gap={8} style={{ marginTop: 4 }}>
                    <Button
                      size="small"
                      type="link"
                      icon={<PlusOutlined />}
                      onClick={handleAddNewAddress}
                      style={{ padding: 0, fontWeight: 700 }}
                    >
                      Add Address
                    </Button>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <Button
                      size="small"
                      type="link"
                      icon={<CompassOutlined />}
                      onClick={() => history.push(Routes.app)}
                      style={{ padding: 0, fontWeight: 600 }}
                    >
                      Explore Market
                    </Button>
                  </Flex>
                </div>
              </Col>
            </Row>
          </Card>

          {/* ------------------------------------------------------------------
              Profile Setup & Completion Engine Card (Always Visible & Interactive)
              ------------------------------------------------------------------ */}
          <Card
            style={{
              borderRadius: 18,
              border: completionScore === 100 ? '1px solid #bbf7d0' : '1px solid #e0e7ff',
              background: completionScore === 100 ? '#f0fdf4' : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
              marginBottom: 24,
            }}
            styles={{ body: { padding: screens.xs ? '18px 14px' : '22px 24px' } }}
          >
            <Flex justify="space-between" align={isMobile ? 'flex-start' : 'center'} vertical={isMobile} gap={14}>
              <div style={{ flex: 1, width: '100%' }}>
                <Flex align="center" justify="space-between" style={{ marginBottom: 6 }}>
                  <Flex align="center" gap={8}>
                    {completionScore === 100 ? (
                      <TrophyOutlined style={{ color: '#16a34a', fontSize: 20 }} />
                    ) : (
                      <RocketOutlined style={{ color: '#4f46e5', fontSize: 20 }} />
                    )}
                    <span style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>
                      Profile Setup: {completionScore}% Complete
                    </span>
                  </Flex>
                  <Tag
                    color={completionScore === 100 ? 'success' : completionScore >= 60 ? 'blue' : 'warning'}
                    style={{ fontWeight: 700, borderRadius: 6, margin: 0 }}
                  >
                    {completionScore === 100 ? 'Verified Profile' : `${100 - completionScore}% Remaining`}
                  </Tag>
                </Flex>

                <Progress
                  percent={completionScore}
                  status={completionScore === 100 ? 'success' : 'active'}
                  strokeColor={
                    completionScore === 100
                      ? '#10b981'
                      : { '0%': '#4f46e5', '100%': '#7c3aed' }
                  }
                  style={{ marginBottom: 14 }}
                />

                {/* Checklist Action Items */}
                <Flex wrap="wrap" gap={8} align="center">
                  {completionChecks.map((check) => (
                    <div key={check.key}>
                      {check.done ? (
                        <Tag
                          color="green"
                          style={{
                            borderRadius: 8,
                            padding: '4px 10px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <CheckCircleFilled /> {check.label}
                        </Tag>
                      ) : (
                        <Button
                          size="small"
                          type="dashed"
                          onClick={() => handleChecklistAction(check)}
                          style={{
                            borderRadius: 8,
                            fontWeight: 700,
                            borderColor: '#c7d2fe',
                            color: '#4338ca',
                            background: '#eef2ff',
                          }}
                        >
                          + {check.label} (+{check.points}%)
                        </Button>
                      )}
                    </div>
                  ))}
                </Flex>
              </div>

              {/* Guide Trigger Button */}
              {completionScore < 100 && (
                <Button
                  type="primary"
                  onClick={() => setOnboardingModalOpen(true)}
                  style={{
                    borderRadius: 10,
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    border: 'none',
                    height: 38,
                    flexShrink: 0,
                  }}
                >
                  Continue Setup
                </Button>
              )}
            </Flex>
          </Card>

          {/* Main Tabs Area */}
          <Card
            style={{
              borderRadius: 18,
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
            }}
            styles={{ body: { padding: screens.xs ? '14px 12px' : '24px 24px' } }}
          >
            <Tabs
              activeKey={activeTabKey}
              onChange={setActiveTabKey}
              items={[
                {
                  key: 'addresses',
                  label: (
                    <span style={{ fontWeight: 700, fontSize: 14 }}>
                      <EnvironmentOutlined /> Saved Addresses ({addresses.length})
                    </span>
                  ),
                  children: (
                    <div style={{ paddingTop: 8 }}>
                      <Flex justify="space-between" align="center" style={{ marginBottom: 18 }} wrap="wrap" gap={10}>
                        <div>
                          <Title level={5} style={{ margin: 0, color: '#0f172a' }}>
                            Your Delivery Locations
                          </Title>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Manage saved addresses to use during checkout or set as default search area
                          </Text>
                        </div>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={handleAddNewAddress}
                          style={{
                            borderRadius: 8,
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                            border: 'none',
                          }}
                        >
                          Add New Address
                        </Button>
                      </Flex>

                      {addresses.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                          <Empty
                            description={
                              <div>
                                <div style={{ fontWeight: 600, color: '#334155', fontSize: 15, marginBottom: 4 }}>
                                  No saved addresses yet
                                </div>
                                <Text type="secondary" style={{ fontSize: 13 }}>
                                  Add your home, office, or other locations for quick checkout and nearby store discovery.
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
                                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                                border: 'none',
                              }}
                            >
                              Add Your First Address
                            </Button>
                          </Empty>
                        </div>
                      ) : (
                        <Row gutter={[16, 16]}>
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
                    <span style={{ fontWeight: 700, fontSize: 14 }}>
                      <UserOutlined /> Personal Details
                    </span>
                  ),
                  children: (
                    <div style={{ maxWidth: 540, paddingTop: 12 }}>
                      <Title level={5} style={{ marginBottom: 4, color: '#0f172a' }}>
                        Update Personal Information
                      </Title>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 20 }}>
                        Keep your contact details up to date for order coordination and delivery notices.
                      </Text>

                      <Form
                        form={profileForm}
                        layout="vertical"
                        onFinish={handleUpdateProfile}
                      >
                        <Form.Item
                          name="username"
                          label="Account Username"
                          rules={[{ required: true, message: 'Please enter your username' }]}
                        >
                          <Input
                            prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="Your username"
                            size="large"
                          />
                        </Form.Item>

                        <Form.Item
                          name="mobile"
                          label="Mobile Phone Number"
                          rules={[{ required: true, message: 'Mobile number is required' }]}
                        >
                          <Input
                            prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="Mobile number"
                            size="large"
                          />
                        </Form.Item>

                        <Form.Item
                          name="email"
                          label="Email Address (For receipts & invoices)"
                        >
                          <Input
                            prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="you@example.com"
                            size="large"
                          />
                        </Form.Item>

                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={savingProfile}
                          size="large"
                          style={{
                            marginTop: 10,
                            borderRadius: 8,
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                            border: 'none',
                            padding: '0 28px',
                          }}
                        >
                          Save Changes
                        </Button>
                      </Form>
                    </div>
                  ),
                },
                {
                  key: 'account_hub',
                  label: (
                    <span style={{ fontWeight: 700, fontSize: 14 }}>
                      <ShopOutlined /> Services & Roles
                    </span>
                  ),
                  children: (
                    <div style={{ paddingTop: 12 }}>
                      <Title level={5} style={{ marginBottom: 4, color: '#0f172a' }}>
                        Merchant & Seller Integration
                      </Title>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 20 }}>
                        Switch roles or expand your business on the Rquest Hyperlocal Marketplace.
                      </Text>

                      {isMerchant ? (
                        <Card
                          style={{
                            borderRadius: 12,
                            background: '#faf5ff',
                            border: '1px solid #e9d5ff',
                            marginBottom: 16,
                          }}
                        >
                          <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 15, color: '#6b21a8' }}>
                                Merchant Outlet Manager Active
                              </div>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {myShops.length > 0
                                  ? `You have ${myShops.length} active outlet(s). Manage catalog and track direct orders.`
                                  : 'Register your first physical shop on the neighborhood map with 0% commission.'}
                              </Text>
                            </div>
                            <Button
                              type="primary"
                              onClick={() => history.push(Routes.client)}
                              style={{
                                borderRadius: 8,
                                fontWeight: 700,
                                background: '#7c3aed',
                                border: 'none',
                              }}
                            >
                              Open Merchant Hub
                            </Button>
                          </Flex>
                        </Card>
                      ) : (
                        <Card
                          style={{
                            borderRadius: 12,
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            marginBottom: 16,
                          }}
                        >
                          <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 15, color: '#15803d' }}>
                                Become a Seller on Rquest
                              </div>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                List your neighborhood grocery, restaurant, pharmacy, or service with 0% commissions.
                              </Text>
                            </div>
                            <Button
                              type="primary"
                              onClick={() => history.push(`${Routes.client}?onboarding=shop`)}
                              style={{
                                borderRadius: 8,
                                fontWeight: 700,
                                background: '#16a34a',
                                border: 'none',
                              }}
                            >
                              Register My Store
                            </Button>
                          </Flex>
                        </Card>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </>
      )}

      {/* ------------------------------------------------------------------
          Interactive Onboarding Guide Modal (New User & Merchant Setup)
          ------------------------------------------------------------------ */}
      <Modal
        open={onboardingModalOpen}
        onCancel={() => handleSkipOnboarding(false)}
        footer={null}
        width={600}
        centered
        styles={{ body: { padding: '28px 24px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: isMerchant
                ? 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)'
                : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              margin: '0 auto 12px',
              boxShadow: '0 8px 20px rgba(79, 70, 229, 0.25)',
            }}
          >
            {isMerchant ? <ShopOutlined /> : <RocketOutlined />}
          </div>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
            {isMerchant ? 'Welcome, Shop Owner!' : 'Welcome to Rquest!'}
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            {isMerchant
              ? 'Complete your profile and get your physical storefront live with 0% commission.'
              : 'Let’s finish your profile setup to start discovering nearby neighborhood deals.'}
          </Text>
        </div>

        {/* Onboarding Stepper */}
        <Steps
          current={onboardingStep}
          size="small"
          style={{ marginBottom: 28 }}
          items={
            isMerchant
              ? [
                  { title: 'Profile' },
                  { title: 'Storefront' },
                  { title: 'Launch' },
                ]
              : [
                  { title: 'Profile' },
                  { title: 'Address' },
                  { title: 'Explore' },
                ]
          }
        />

        {/* Step 0: Personal Info & Email */}
        {onboardingStep === 0 && (
          <div>
            <Alert
              message="Account Details Confirmed"
              description={`Registered mobile number: ${profile?.mobile || user_data?.mobile || 'Verified'}`}
              type="info"
              showIcon
              style={{ marginBottom: 20, borderRadius: 10 }}
            />

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#334155' }}>
                Your Name / Username
              </label>
              <Input
                size="large"
                value={profile?.username || user_data?.username}
                disabled
                prefix={<UserOutlined />}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#334155' }}>
                Email Address (Recommended for receipts & notices)
              </label>
              <Input
                size="large"
                placeholder="name@example.com"
                value={onboardingEmail}
                onChange={(e) => setOnboardingEmail(e.target.value)}
                prefix={<MailOutlined />}
              />
            </div>

            <Flex justify="space-between" align="center">
              <Button type="link" onClick={() => handleSkipOnboarding(false)} style={{ color: '#64748b' }}>
                Skip for now
              </Button>
              <Button
                type="primary"
                size="large"
                loading={savingOnboarding}
                onClick={handleSaveOnboardingDetails}
                style={{
                  borderRadius: 10,
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  border: 'none',
                  padding: '0 24px',
                }}
              >
                Save & Continue <ArrowRightOutlined />
              </Button>
            </Flex>
          </div>
        )}

        {/* Step 1: Address (for customer) or Storefront (for merchant) */}
        {onboardingStep === 1 && (
          <div>
            {isMerchant ? (
              <div>
                <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
                  <ShopOutlined style={{ fontSize: 42, color: '#7c3aed', marginBottom: 12 }} />
                  <Title level={4} style={{ margin: '0 0 8px' }}>
                    Register Your Storefront
                  </Title>
                  <Paragraph type="secondary" style={{ fontSize: 14 }}>
                    Pin your store on the interactive Leaflet map, choose your business category, and connect with 5,000+ local neighbors with 0% platform commission.
                  </Paragraph>
                </div>

                <Flex vertical gap={12}>
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => {
                      setOnboardingModalOpen(false);
                      history.push(`${Routes.client}?onboarding=shop`);
                    }}
                    style={{
                      borderRadius: 10,
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                      border: 'none',
                      height: 48,
                    }}
                  >
                    Proceed to Store Registration Wizard <ArrowRightOutlined />
                  </Button>
                  <Button type="text" onClick={() => setOnboardingStep(2)} style={{ color: '#64748b' }}>
                    I’ll add my shop later
                  </Button>
                </Flex>
              </div>
            ) : (
              <div>
                <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
                  <EnvironmentOutlined style={{ fontSize: 42, color: '#4f46e5', marginBottom: 12 }} />
                  <Title level={4} style={{ margin: '0 0 8px' }}>
                    Add Your Primary Delivery Address
                  </Title>
                  <Paragraph type="secondary" style={{ fontSize: 14 }}>
                    Rquest uses your GPS location to calculate walking distance and find nearby stores within 1–5 km.
                  </Paragraph>
                </div>

                {addresses.length > 0 ? (
                  <Alert
                    message={`Saved Address: ${addresses[0].label} (${addresses[0].street_area || 'Verified'})`}
                    type="success"
                    showIcon
                    style={{ marginBottom: 20, borderRadius: 10 }}
                  />
                ) : (
                  <Button
                    type="dashed"
                    size="large"
                    icon={<PlusOutlined />}
                    onClick={handleAddNewAddress}
                    style={{
                      width: '100%',
                      height: 52,
                      borderRadius: 12,
                      fontWeight: 700,
                      marginBottom: 20,
                      borderColor: '#818cf8',
                      color: '#4f46e5',
                    }}
                  >
                    Pin My Home / Work Address on Map
                  </Button>
                )}

                <Flex justify="space-between" align="center">
                  <Button type="link" onClick={() => handleSkipOnboarding(false)} style={{ color: '#64748b' }}>
                    Skip for now
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => setOnboardingStep(2)}
                    style={{
                      borderRadius: 10,
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      border: 'none',
                    }}
                  >
                    Next Step <ArrowRightOutlined />
                  </Button>
                </Flex>
              </div>
            )}
          </div>
        )}

        {/* Step 2: All Set & Ready to Explore */}
        {onboardingStep === 2 && (
          <div style={{ textAlign: 'center', padding: '10px 0 10px' }}>
            <div style={{ fontSize: 50, marginBottom: 12 }}>🎉</div>
            <Title level={4} style={{ margin: '0 0 8px', color: '#0f172a' }}>
              You’re All Set!
            </Title>
            <Paragraph type="secondary" style={{ fontSize: 14, marginBottom: 24 }}>
              Your Rquest account is ready. You can view your profile completion anytime from your account tab.
            </Paragraph>

            <Flex vertical gap={12}>
              <Button
                type="primary"
                size="large"
                onClick={() => handleSkipOnboarding(true)}
                style={{
                  borderRadius: 10,
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  border: 'none',
                  height: 48,
                }}
              >
                Start Exploring Marketplace App <ArrowRightOutlined />
              </Button>
              <Button
                type="text"
                onClick={() => handleSkipOnboarding(false)}
                style={{ color: '#64748b' }}
              >
                Stay on My Profile
              </Button>
            </Flex>
          </div>
        )}
      </Modal>

      {/* Address Create / Edit Modal */}
      {addressModalOpen && (
        <AddressModal
          open={addressModalOpen}
          onClose={() => {
            setAddressModalOpen(false);
            setEditingAddress(null);
          }}
          onSuccess={handleAddressModalSuccess}
          initialData={editingAddress}
          userProfile={profile || user_data}
        />
      )}
    </div>
  );
};

export default ProfileScreen;
