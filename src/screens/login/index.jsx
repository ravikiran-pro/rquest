import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { netWorkCall, storageKeys, checkUserRole } from '../../app/utils/helper';
import { useHistory, Link } from 'react-router-dom';
import { useGlobalStore } from '../../app/services';
import Routes from '../../app/routes/routes';
import { apiConfig, SOCKET } from '../../app/utils';
import {
  HandshakePinIllustration,
  LeftCornerFlank,
  RightCornerFlank,
  HeroSwoosh,
  SparkleStar,
} from '../landing/LandingIllustrations';
import './auth.css';

const LoginScreen = () => {
  const history = useHistory();
  const update_user_data = useGlobalStore((state) => state.update_user_data);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    if (values.mobile && values.password) {
      setLoading(true);
      try {
        const body = JSON.stringify({
          mobile: values.mobile,
          password: values.password,
        });
        const res = await netWorkCall(apiConfig.login, 'POST', body);
        if (res.success === true) {
          sessionStorage.setItem(storageKeys.auth_token, res.token);
          update_user_data(res.user_data);
          SOCKET.emit('connect_user', res.user_data);
          const { isMerchant } = checkUserRole(res.user_data);
          if (isMerchant) {
            history.push(Routes.client);
          } else {
            history.push(Routes.app);
          }
        } else {
          message.error(res.message || 'Login failed. Please check credentials.');
        }
      } catch (err) {
        console.error('Login error:', err);
        message.error('An error occurred during login. Please try again.');
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
              <span className="auth-badge-text">Direct Hyperlocal Network</span>
              <span style={{ color: '#cbd5e1' }}>/</span>
              <span className="auth-badge-tag">Zero Platform Cut</span>
            </div>

            <h1 className="auth-showcase-title">
              Welcome Back to Your{' '}
              <span className="auth-title-emerald">
                Neighborhood.
                <HeroSwoosh className="auth-title-swoosh" />
              </span>
            </h1>

            <p className="auth-showcase-desc">
              Direct counter communication, 0% platform markups, and instant PIN handshake verification with physical neighborhood kiranas, food outlets, and local technicians.
            </p>

            {/* Tactile SVG Vector Illustration Deck */}
            <div className="auth-illustration-deck">
              <div className="auth-deck-canvas">
                <HandshakePinIllustration />
              </div>
            </div>

            {/* Live Trust Metrics Chips */}
            <div className="auth-chips-row">
              <div className="auth-chip-pill">
                <span className="auth-chip-dot green" />
                <span>⚡ 4-Digit Counter PIN Lock</span>
              </div>
              <div className="auth-chip-pill">
                <span className="auth-chip-dot blue" />
                <span>🛵 Direct Community Runner</span>
              </div>
              <div className="auth-chip-pill">
                <span className="auth-chip-dot purple" />
                <span>🔒 100% Real Counter MRP</span>
              </div>
            </div>

            {/* Social Proof Mini Quote */}
            <div className="auth-quote-card">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"
                alt="Murugan K."
                className="auth-quote-avatar"
              />
              <div className="auth-quote-text">
                &ldquo;On Rquest, my neighborhood customers pay real counter MRP and I keep 100% in my cash drawer.&rdquo;
                <div className="auth-quote-author">Murugan K. • Sri Murugan Groceries &amp; Dairy</div>
              </div>
            </div>
          </div>

          {/* Right Column: Modern Polished Glassmorphic Login Card */}
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

              <h2 className="auth-card-title">Sign In to Your Account</h2>
              <p className="auth-card-subtitle">
                Enter your registered mobile number or username to access your dashboard.
              </p>

              <Form onFinish={onFinish} layout="vertical" className="auth-form">
                <Form.Item
                  name="mobile"
                  label="Mobile Number or Username"
                  rules={[{ required: true, message: 'Please enter your mobile number or username' }]}
                >
                  <Input
                    prefix={<UserOutlined />}
                    placeholder="Enter 10-digit mobile or username"
                    size="large"
                    autoComplete="username"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  label="Password"
                  rules={[{ required: true, message: 'Please enter your password' }]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Enter your account password"
                    size="large"
                    autoComplete="current-password"
                  />
                </Form.Item>

                <Form.Item style={{ marginTop: 28, marginBottom: 12 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    size="large"
                    className="btn-auth-submit"
                  >
                    <span>Log in</span>
                    <ArrowRightOutlined />
                  </Button>
                </Form.Item>

                <div className="auth-switch-row">
                  <span>Don&apos;t have an account yet?</span>
                  <Link to={Routes.register} className="auth-switch-link">
                    Create Account
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

export default LoginScreen;
