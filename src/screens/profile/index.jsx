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
} from '@ant-design/icons';
import { useHistory } from 'react-router-dom';
import { useGlobalStore } from '../../app/services';
import { netWorkCall, apiConfig, checkUserRole, storageKeys } from '../../app/utils';
import Routes from '../../app/routes/routes';
import { AddressCard, AddressModal } from '../../app/components/profile';

const { Title, Text } = Typography;

const ProfileScreen = () => {
  const history = useHistory();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const { user_data, update_user_data } = useGlobalStore((state) => state);
  const { isMerchant } = checkUserRole(user_data);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  const [profileForm] = Form.useForm();

  const fetchProfileAndAddresses = async () => {
    setLoading(true);
    try {
      const [profileRes, addrRes] = await Promise.all([
        netWorkCall(apiConfig.user_profile, 'GET', null, true),
        netWorkCall(apiConfig.user_addresses, 'GET', null, true),
      ]);

      if (profileRes?.data) {
        setProfile(profileRes.data);
        profileForm.setFieldsValue({
          username: profileRes.data.username || '',
          email: profileRes.data.email || '',
          mobile: profileRes.data.mobile || '',
        });
      }

      if (addrRes?.data) {
        setAddresses(addrRes.data);
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

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : 'Recent';

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
              marginBottom: 24,
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
                    <Flex align="center" gap={4}>
                      <CalendarOutlined />
                      <span>Member since {memberSince}</span>
                    </Flex>
                  </Flex>
                </div>
              </Flex>

              {/* Action Buttons on Right */}
              <Flex gap={10} wrap="wrap" style={{ width: isMobile ? '100%' : 'auto' }}>
                <Button
                  icon={<OrderedListOutlined />}
                  onClick={() => history.push(Routes.orders)}
                  style={{ borderRadius: 8, fontWeight: 600, flex: isMobile ? 1 : 'none' }}
                >
                  My Orders
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
                      icon={<MessageOutlined />}
                      onClick={() => history.push(Routes.chat)}
                      style={{ padding: 0, fontWeight: 600 }}
                    >
                      Messages
                    </Button>
                  </Flex>
                </div>
              </Col>
            </Row>
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
              defaultActiveKey="addresses"
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
                          label="Full Name / Display Name"
                          rules={[{ required: true, message: 'Please enter your name' }]}
                        >
                          <Input
                            prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                            size="large"
                            style={{ borderRadius: 8 }}
                          />
                        </Form.Item>

                        <Form.Item
                          name="mobile"
                          label="Mobile Phone Number"
                          rules={[
                            { required: true, message: 'Please enter mobile number' },
                            { pattern: /^[0-9]{10}$/, message: 'Please enter a valid 10-digit mobile number' },
                          ]}
                        >
                          <Input
                            prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
                            size="large"
                            style={{ borderRadius: 8 }}
                          />
                        </Form.Item>

                        <Form.Item
                          name="email"
                          label="Email Address (Optional)"
                          rules={[{ type: 'email', message: 'Please enter a valid email address' }]}
                        >
                          <Input
                            prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
                            size="large"
                            placeholder="e.g. name@example.com"
                            style={{ borderRadius: 8 }}
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
                                Manage your catalog, track incoming direct orders, and update store timings.
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
                              onClick={() => history.push(Routes.client)}
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

