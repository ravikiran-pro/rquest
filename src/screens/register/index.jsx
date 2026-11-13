import React, { useState } from 'react';
import { Input, Button, message } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ShopOutlined,
  ShoppingOutlined,
  CheckCircleFilled,
  EnvironmentFilled,
} from '@ant-design/icons';
import { apiConfig, netWorkCall, storageKeys, SOCKET } from '../../app/utils';
import { useHistory, Link } from 'react-router-dom';
import { useGlobalStore, requestPushPermission } from '../../app/services';
import Routes from '../../app/routes/routes';
import { AppIcon } from '../../app/components/assets';
import { AuthLeftShowcase, AuthSocialButtons } from '../login/AuthShared';
import '../login/auth.css';

const CUSTOMER_ROLE_ID = 'c0f93a2f-16c9-49cf-b47b-e0c0a38a5a4d';
const MERCHANT_ROLE_ID = 'a5e858d8-636c-4fc3-8c3a-0a76131c95e5';

const RegisterScreen = () => {
  const history = useHistory();
  const update_user_data = useGlobalStore((state) => state.update_user_data);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(CUSTOMER_ROLE_ID);
  const [countryCode] = useState('+91');
  const [mobileNumber, setMobileNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
  };

  const onFinish = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const cleanName = fullName.trim();
    const cleanMobile = mobileNumber.replace(/\D/g, '');

    if (!cleanName) {
      message.error('Please enter your full name or store name');
      return;
    }
    if (!cleanMobile || cleanMobile.length < 10) {
      message.error('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!password || password.length < 4) {
      message.error('Please create a password (minimum 4 characters)');
      return;
    }

    setLoading(true);
    try {
      const body = JSON.stringify({
        username: cleanName,
        password: password,
        mobile: cleanMobile,
        userRole: selectedRole,
        role_id: selectedRole,
      });

      const res = await netWorkCall(apiConfig.register, 'POST', body);
      if (res && res.success === true) {
        sessionStorage.setItem(storageKeys.auth_token, res.token);
        localStorage.setItem(storageKeys.auth_token, res.token);
        update_user_data(res.user_data);
        SOCKET.emit('connect_user', res.user_data);

        // Prompt & register for push notifications on account creation
        if ('Notification' in window) {
          requestPushPermission(res.user_data).catch(() => {});
        }

        message.success('Account created! Welcome to Rquest.');
        const isMerchant = selectedRole === MERCHANT_ROLE_ID;
        if (isMerchant) {
          history.push(`${Routes.profile}?onboarding=merchant&new=true`);
        } else {
          history.push(`${Routes.profile}?onboarding=customer&new=true`);
        }
      } else {
        message.error(res?.message || 'Registration failed. Please check your details.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      message.error('An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialRegister = (provider) => {
    message.loading(`Connecting with ${provider}...`, 0.9).then(() => {
      setFullName('Local Neighbor');
      setMobileNumber('9876543210');
      setPassword('RquestPass@123');
      message.info(`Auto-filled details from ${provider}`);
    });
  };

  return (
    <div className="rq-auth-page">
      {/* Subtle Ambient Textures */}
      <div className="rq-auth-ambient-dots" />

      <div className="rq-auth-desktop-shell">
        {/* LEFT COLUMN (Desktop >= 960px & Mobile Below Card): Context-Aware Copy + Real Photo */}
        <AuthLeftShowcase
          audience={selectedRole === MERCHANT_ROLE_ID ? 'merchant' : 'shopper'}
        />

        {/* RIGHT COLUMN: Registration Card Stack */}
        <div className="rq-auth-form-col">
          <div className="rq-auth-card-wrapper">
            <div className="rq-auth-mobile-top-nav">
              <Link to={Routes.home} className="rq-otp-inline-back-btn">
                <ArrowLeftOutlined />
                <span>Back to Market</span>
              </Link>
            </div>
            {/* Centered Brand Hero */}
            <div className="rq-auth-hero">
              <div className="rq-auth-logo-badge-wrap">
                <img src={AppIcon} alt="Rquest" className="rq-auth-app-icon" />
                <span className="rq-auth-verified-check">
                  <CheckCircleFilled />
                </span>
              </div>
              <h2 className="rq-auth-hero-heading">Create your account</h2>
              <p className="rq-auth-hero-sub">
                Join as a neighbourhood shopper or register your store.
              </p>
            </div>

            {/* Registration Form Card */}
            <div className="rq-auth-box">
              <form onSubmit={onFinish} className="rq-auth-form-stack">
                {/* Account Role Selector */}
                {/* <div className="rq-role-selector">
                  <div
                    className={`rq-role-option ${selectedRole === CUSTOMER_ROLE_ID ? 'selected' : ''}`}
                    onClick={() => handleRoleSelect(CUSTOMER_ROLE_ID)}
                  >
                    <div className="rq-role-option-top">
                      <span className="rq-role-option-icon">
                        <ShoppingOutlined />
                      </span>
                      <span className="rq-role-radio">
                        {selectedRole === CUSTOMER_ROLE_ID && (
                          <span className="rq-role-radio-dot" />
                        )}
                      </span>
                    </div>
                    <div className="rq-role-option-title">Shopper / Neighbour</div>
                    <div className="rq-role-option-desc">Browse local shops nearby</div>
                  </div>

                  <div
                    className={`rq-role-option ${selectedRole === MERCHANT_ROLE_ID ? 'selected' : ''}`}
                    onClick={() => handleRoleSelect(MERCHANT_ROLE_ID)}
                  >
                    <div className="rq-role-option-top">
                      <span className="rq-role-option-icon">
                        <ShopOutlined />
                      </span>
                      <span className="rq-role-radio">
                        {selectedRole === MERCHANT_ROLE_ID && (
                          <span className="rq-role-radio-dot" />
                        )}
                      </span>
                    </div>
                    <div className="rq-role-option-title">Store Owner</div>
                    <div className="rq-role-option-desc">List products &amp; orders</div>
                  </div>
                </div> */}

                {/* Full Name / Store Name */}
                <div>
                  <div className="rq-auth-field-row">
                    <span className="rq-auth-label-main">
                      {selectedRole === MERCHANT_ROLE_ID ? 'Store / Business Name' : 'Full Name'}
                    </span>
                  </div>
                  <Input
                    prefix={<UserOutlined style={{ color: '#747781' }} />}
                    placeholder={
                      selectedRole === MERCHANT_ROLE_ID
                        ? 'e.g. Sri Krishna Provisions'
                        : 'e.g. Anand Kumar'
                    }
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="rq-auth-text-input"
                  />
                </div>

                {/* Mobile Phone Number */}
                <div>
                  <div className="rq-auth-field-row">
                    <span className="rq-auth-label-main">Mobile Phone Number</span>
                    <span className="rq-auth-label-hint">SMS verification</span>
                  </div>
                  <div className="rq-auth-phone-control">
                    <div className="rq-auth-country-picker">
                      <span className="rq-country-flag">🇮🇳</span>
                      <span className="rq-country-code">{countryCode}</span>
                      <span className="rq-country-caret">▾</span>
                    </div>
                    <input
                      type="tel"
                      className="rq-auth-phone-input"
                      placeholder="98765 43210"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      autoComplete="tel"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="rq-auth-field-row">
                    <span className="rq-auth-label-main">Create Password</span>
                  </div>
                  <Input.Password
                    prefix={<LockOutlined style={{ color: '#747781' }} />}
                    placeholder="Create a secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rq-auth-text-input"
                  />
                </div>

                {/* Submit Button & Trust Guarantee */}
                <div className="rq-auth-actions-block">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    className="rq-auth-submit-btn"
                  >
                    <span>
                      {selectedRole === MERCHANT_ROLE_ID
                        ? 'Create Store Account'
                        : 'Create Account'}
                    </span>
                    <ArrowRightOutlined />
                  </Button>
                </div>
              </form>
            </div>

            <AuthSocialButtons onSocialAction={handleSocialRegister} />

            {/* Footer Navigation */}
            <div className="rq-auth-footer-nav">
              <p className="rq-auth-register-prompt">
                Already have an account?{' '}
                <Link to={Routes.login} className="rq-auth-primary-link">
                  Sign in
                </Link>
              </p>
              <p className="rq-auth-legal-note">
                By continuing, you agree to Rquest&apos;s{' '}
                <span className="rq-legal-link">Terms of Service</span> &amp;{' '}
                <span className="rq-legal-link">Privacy Policy</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterScreen;
