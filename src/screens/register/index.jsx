import { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  PhoneOutlined,
  ArrowRightOutlined,
  ShopOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import { apiConfig, netWorkCall, storageKeys, SOCKET } from '../../app/utils';
import { useHistory, Link } from 'react-router-dom';
import { useGlobalStore } from '../../app/services';
import Routes from '../../app/routes/routes';
import {
  HeroStreetIllustration,
  LeftCornerFlank,
  RightCornerFlank,
  HeroSwoosh,
  SparkleStar,
} from '../landing/LandingIllustrations';
import '../login/auth.css';

const CUSTOMER_ROLE_ID = 'c0f93a2f-16c9-49cf-b47b-e0c0a38a5a4d';
const MERCHANT_ROLE_ID = 'a5e858d8-636c-4fc3-8c3a-0a76131c95e5';

const RegisterScreen = () => {
  const history = useHistory();
  const update_user_data = useGlobalStore((state) => state.update_user_data);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(CUSTOMER_ROLE_ID);
  const [form] = Form.useForm();

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    form.setFieldsValue({ userRole: roleId });
  };

  const onFinish = async (values) => {
    if (values.username && values.mobile && values.password) {
      setLoading(true);
      try {
        const body = JSON.stringify({
          username: values.username,
          password: values.password,
          mobile: values.mobile,
          userRole: values.userRole || selectedRole,
        });
        const res = await netWorkCall(apiConfig.register, 'POST', body);
        if (res.success === true) {
          sessionStorage.setItem(storageKeys.auth_token, res.token);
          update_user_data(res.user_data);
          SOCKET.emit('connect_user', res.user_data);
          message.success('Account created! Welcome to Rquest.');
          const isMerchant =
            values.userRole === MERCHANT_ROLE_ID ||
            selectedRole === MERCHANT_ROLE_ID ||
            res.user_data?.role_id === MERCHANT_ROLE_ID;
          if (isMerchant) {
            history.push(`${Routes.profile}?onboarding=merchant&new=true`);
          } else {
            history.push(`${Routes.profile}?onboarding=customer&new=true`);
          }
        } else {
          message.error(res.message || 'Registration failed');
        }
      } catch (err) {
        console.error('Registration error:', err);
        message.error('An error occurred during registration');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="auth-page-wrapper">
      {/* Background Atmosphere Blueprint Dots & Subtle Ambient Glows */}
      <div className="auth-ambient-bg" />
      <div className="auth-ambient-glow" />
      <div className="auth-ambient-glow-right" />

      {/* Dynamic Page Corner Accents */}
      <LeftCornerFlank />
      <RightCornerFlank />

      <div className="auth-container">
        <div className="auth-split-grid">
          {/* Left Column: Visual Showcase & Brand Narrative */}
          <div className="auth-showcase-col">
            <div className="auth-showcase-badge">
              <span className="auth-badge-beacon" />
              <span className="auth-badge-text">Open Hyperlocal OS</span>
              <span style={{ color: '#cbd5e1' }}>/</span>
              <span className="auth-badge-tag">Zero-Fleet Model</span>
            </div>

            <h1 className="auth-showcase-title">
              Join Your Neighborhood{' '}
              <span className="auth-title-emerald">
                Direct Network.
                <HeroSwoosh className="auth-title-swoosh" />
              </span>
            </h1>

            <p className="auth-showcase-desc">
              Shop groceries at genuine physical shelf MRP, book verified local technicians, or launch your store catalog with 100% direct UPI settlement.
            </p>

            {/* Tactile SVG Vector Illustration Deck */}
            <div className="auth-illustration-deck">
              <div className="auth-deck-canvas">
                <HeroStreetIllustration />
              </div>
            </div>

            {/* Key Value Proposition Chips */}
            <div className="auth-chips-row">
              <div className="auth-chip-pill">
                <span className="auth-chip-dot green" />
                <span>🛒 100% Real Counter MRP</span>
              </div>
              <div className="auth-chip-pill">
                <span className="auth-chip-dot blue" />
                <span>💬 In-Store WebSocket Chat</span>
              </div>
              <div className="auth-chip-pill">
                <span className="auth-chip-dot purple" />
                <span>⚡ 2-Step Mutual Stock Check</span>
              </div>
            </div>

            {/* Social Proof Mini Quote */}
            <div className="auth-quote-card">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80"
                alt="Sneha Raman"
                className="auth-quote-avatar"
              />
              <div className="auth-quote-text">
                &ldquo;Picking up my daily groceries with my 4-digit PIN takes 45 seconds at the counter. Zero platform surcharges!&rdquo;
                <div className="auth-quote-author">Sneha Raman • Neighborhood Shopper</div>
              </div>
            </div>
          </div>

          {/* Right Column: Modern Polished Glassmorphic Registration Card */}
          <div className="auth-form-col">
            <div className="auth-card">
              <div className="auth-card-brand-row">
                <div className="auth-logo-badge">R</div>
                <div>
                  <div className="auth-brand-name">Rquest</div>
                  <div className="auth-brand-sub">Hyperlocal Direct Commerce</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <SparkleStar size={20} color="#10b981" />
                </div>
              </div>

              <h2 className="auth-card-title">Create Your Free Account</h2>
              <p className="auth-card-subtitle">
                Join thousands of local neighbors and merchants in your Neighborhood
              </p>

              <Form
                form={form}
                onFinish={onFinish}
                layout="vertical"
                className="auth-form"
                initialValues={{
                  userRole: CUSTOMER_ROLE_ID,
                }}
              >
                {/* Tactile Interactive Account Role Picker */}
                <div className="auth-role-picker">
                  <div
                    className={`auth-role-card ${selectedRole === CUSTOMER_ROLE_ID ? 'active' : ''}`}
                    onClick={() => handleRoleSelect(CUSTOMER_ROLE_ID)}
                  >
                    <div className="auth-role-header">
                      <span className="auth-role-icon">
                        <ShoppingOutlined style={{ color: selectedRole === CUSTOMER_ROLE_ID ? '#10b981' : '#64748b' }} />
                      </span>
                      <div className="auth-role-radio">
                        {selectedRole === CUSTOMER_ROLE_ID && <span className="auth-role-radio-inner" />}
                      </div>
                    </div>
                    <div className="auth-role-label">Shopper / Neighbor</div>
                  </div>

                  <div
                    className={`auth-role-card ${selectedRole === MERCHANT_ROLE_ID ? 'active' : ''}`}
                    onClick={() => handleRoleSelect(MERCHANT_ROLE_ID)}
                  >
                    <div className="auth-role-header">
                      <span className="auth-role-icon">
                        <ShopOutlined style={{ color: selectedRole === MERCHANT_ROLE_ID ? '#10b981' : '#64748b' }} />
                      </span>
                      <div className="auth-role-radio">
                        {selectedRole === MERCHANT_ROLE_ID && <span className="auth-role-radio-inner" />}
                      </div>
                    </div>
                    <div className="auth-role-label">Store Owner / Merchant</div>
                    <div className="auth-role-desc">0% commission, direct UPI cashflow</div>
                  </div>
                </div>

                <Form.Item name="userRole" hidden>
                  <Input />
                </Form.Item>

                <Form.Item
                  name="username"
                  label="Full Name or Business Name"
                  rules={[{ required: true, message: 'Please enter your name' }]}
                >
                  <Input
                    prefix={<UserOutlined />}
                    placeholder="Enter your name or store name"
                    size="large"
                    autoComplete="name"
                  />
                </Form.Item>

                <Form.Item
                  name="mobile"
                  label="Mobile Number"
                  rules={[{ required: true, message: 'Please enter your 10-digit mobile number' }]}
                >
                  <Input
                    prefix={<PhoneOutlined />}
                    placeholder="Enter 10-digit mobile number"
                    size="large"
                    autoComplete="tel"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  label="Create Password"
                  rules={[{ required: true, message: 'Please enter your password' }]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Create a secure password"
                    size="large"
                    autoComplete="new-password"
                  />
                </Form.Item>

                <Form.Item style={{ marginTop: 24, marginBottom: 12 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    size="large"
                    className="btn-auth-submit"
                  >
                    <span>{selectedRole === MERCHANT_ROLE_ID ? 'Launch Merchant Account (₹0)' : 'Create Free Shopper Account'}</span>
                    <ArrowRightOutlined />
                  </Button>
                </Form.Item>

                <div className="auth-switch-row">
                  <span>Already have an account?</span>
                  <Link to={Routes.login} className="auth-switch-link">
                    Sign in
                  </Link>
                </div>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterScreen;
