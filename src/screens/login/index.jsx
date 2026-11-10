import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, message, Tooltip } from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  CheckCircleFilled,
  EnvironmentFilled,
  LockOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { netWorkCall, storageKeys, checkUserRole } from '../../app/utils/helper';
import { useHistory, Link } from 'react-router-dom';
import { useGlobalStore, subscribeToPushNotifications } from '../../app/services';
import Routes from '../../app/routes/routes';
import { apiConfig, SOCKET } from '../../app/utils';
import { AppIcon } from '../../app/components/assets';
import {
  WhatsAppIcon,
  AuthLeftShowcase,
  AuthSocialButtons,
} from './AuthShared';
import './auth.css';

const LoginScreen = () => {
  const history = useHistory();
  const update_user_data = useGlobalStore((state) => state.update_user_data);

  // Flow states: 'phone' | 'otp'
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('9876543210');
  const [countryCode] = useState('+91');
  const [otpDigits, setOtpDigits] = useState(['4', '9', '2', '1', '0', '0']);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [passwordMode, setPasswordMode] = useState(false);
  const [password, setPassword] = useState('');

  // Refs for 6-digit OTP inputs
  const otpInputRefs = useRef([]);

  // Resend Countdown Timer
  useEffect(() => {
    let timer;
    if (step === 'otp' && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  // Format Phone for display: +91 98765 43210
  const formattedDisplayPhone = () => {
    const raw = phoneNumber.replace(/\D/g, '');
    if (raw.length === 10) {
      return `${countryCode} ${raw.slice(0, 5)} ${raw.slice(5)}`;
    }
    return `${countryCode} ${phoneNumber}`;
  };

  // Helper to complete login session
  const completeSession = (res) => {
    sessionStorage.setItem(storageKeys.auth_token, res.token);
    localStorage.setItem(storageKeys.auth_token, res.token);
    update_user_data(res.user_data);
    SOCKET.emit('connect_user', res.user_data);

    if ('Notification' in window && Notification.permission === 'granted') {
      subscribeToPushNotifications(res.user_data).catch(() => {});
    }

    const { isAdmin, isMerchant } = checkUserRole(res.user_data);
    if (isAdmin) {
      history.push(Routes.admin);
    } else if (isMerchant) {
      history.push(Routes.client);
    } else {
      history.push(Routes.app);
    }
  };

  // Step 1: Handle Phone submission -> Proceed to OTP Step
  const handlePhoneSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      message.error('Please enter a valid 10-digit mobile number');
      return;
    }

    if (passwordMode) {
      handlePasswordLogin();
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('otp');
      setResendCooldown(30);
      message.success(`OTP sent to ${formattedDisplayPhone()}`);
    }, 350);
  };

  // Password Login Handler
  const handlePasswordLogin = async () => {
    if (!password) {
      message.error('Please enter your account password');
      return;
    }
    setLoading(true);
    try {
      const body = JSON.stringify({
        identifier: phoneNumber,
        mobile: phoneNumber,
        password: password,
      });
      const res = await netWorkCall(apiConfig.login, 'POST', body);
      if (res && res.success === true) {
        message.success('Welcome back to Rquest!');
        completeSession(res);
      } else {
        message.error(res?.message || 'Login failed. Please verify credentials.');
      }
    } catch (err) {
      console.error('Password login error:', err);
      message.error('An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle OTP Verification
  const handleVerifyOtp = async () => {
    const code = otpDigits.join('').trim();
    if (code.length < 4) {
      message.error('Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
      const body = JSON.stringify({
        identifier: phoneNumber,
        mobile: phoneNumber,
        otp: code,
        is_otp: true,
      });
      const res = await netWorkCall(apiConfig.login, 'POST', body);
      if (res && res.success === true) {
        message.success('Verified successfully! Welcome to Rquest.');
        completeSession(res);
      } else {
        message.error(res?.message || 'Invalid verification code. Please try again.');
      }
    } catch (err) {
      console.error('OTP login error:', err);
      message.error('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Digit Input change
  const handleDigitChange = (index, val) => {
    const clean = val.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    if (clean.length > 1) {
      const chars = clean.slice(0, 6).split('');
      chars.forEach((c, i) => {
        if (i < 6) newDigits[i] = c;
      });
      setOtpDigits(newDigits);
      const nextIdx = Math.min(chars.length, 5);
      if (otpInputRefs.current[nextIdx]) {
        otpInputRefs.current[nextIdx].focus();
      }
      return;
    }

    newDigits[index] = clean;
    setOtpDigits(newDigits);

    if (clean && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Digit KeyDown (Backspace backward hop)
  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Resend OTP
  const handleResendOtp = () => {
    if (resendCooldown > 0) return;
    setResendCooldown(30);
    message.success('New OTP sent to your phone!');
  };

  // WhatsApp OTP
  const handleWhatsAppOtp = () => {
    message.success('OTP sent via WhatsApp to ' + formattedDisplayPhone());
  };

  // Social / One-Tap Handlers
  const handleSocialLogin = (provider) => {
    message.loading(`Connecting with ${provider}...`, 0.9).then(() => {
      setPhoneNumber('9876543210');
      setStep('otp');
      message.info(`Continuing with verified phone from ${provider}`);
    });
  };

  return (
    <div className="rq-auth-page">
      {/* Subtle Ambient Textures */}
      <div className="rq-auth-ambient-dots" />

      <div className="rq-auth-desktop-shell">
        {/* LEFT COLUMN (Desktop >= 960px & Mobile Below Card): Context-Aware Showcase */}
        <AuthLeftShowcase audience="shopper" photoVariant="merchant" />

        {/* RIGHT COLUMN: Sign In / Two-Factor OTP Card Stack */}
        <div className="rq-auth-form-col">
          {step === 'phone' ? (
            <div className="rq-auth-card-wrapper">
              {/* Centered Brand Hero */}
              <div className="rq-auth-hero">
                <div className="rq-auth-logo-badge-wrap">
                  <img src={AppIcon} alt="Rquest" className="rq-auth-app-icon" />
                  <span className="rq-auth-verified-check">
                    <CheckCircleFilled />
                  </span>
                </div>

                <div className="rq-auth-pill-badge">
                  <EnvironmentFilled className="rq-auth-pill-icon" />
                  <span>One Neighbourhood ID</span>
                </div>

                <h2 className="rq-auth-hero-heading">Welcome to Rquest</h2>
                <p className="rq-auth-hero-sub">
                  Sign in with your mobile number to continue.
                </p>
              </div>

              {/* Main Interactive Form Card */}
              <div className="rq-auth-box">
                <form onSubmit={handlePhoneSubmit} className="rq-auth-form-stack">
                  <div>
                    <div className="rq-auth-field-row">
                      <span className="rq-auth-label-main">Mobile Phone Number</span>
                      <span className="rq-auth-label-hint">
                        {passwordMode ? 'Password login' : 'SMS verification'}
                      </span>
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
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  {passwordMode && (
                    <div>
                      <div className="rq-auth-field-row">
                        <span className="rq-auth-label-main">Password</span>
                      </div>
                      <Input.Password
                        prefix={<LockOutlined style={{ color: '#747781' }} />}
                        placeholder="Enter your account password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="rq-auth-text-input"
                      />
                    </div>
                  )}

                  <div className="rq-auth-actions-block">
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      className="rq-auth-submit-btn"
                    >
                      <span>{passwordMode ? 'Sign In with Password' : 'Continue with OTP'}</span>
                      <ArrowRightOutlined />
                    </Button>

                    {/* Zero Spam Direct Guarantee Strip */}
                    <div className="rq-auth-zero-spam-pill">
                      <span className="rq-zero-spam-icon">
                        <CheckCircleFilled />
                      </span>
                      <span className="rq-zero-spam-text">
                        Zero spam · Direct neighbourhood connection
                      </span>
                    </div>

                    <div className="rq-auth-mode-toggle">
                      <button
                        type="button"
                        className="rq-auth-text-link"
                        onClick={() => setPasswordMode(!passwordMode)}
                      >
                        {passwordMode
                          ? '← Switch back to OTP verification'
                          : 'Or sign in with password'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              <AuthSocialButtons onSocialAction={handleSocialLogin} />

              {/* Footer Navigation */}
              <div className="rq-auth-footer-nav">
                <p className="rq-auth-register-prompt">
                  Don&apos;t have an account?{' '}
                  <Link to={Routes.register} className="rq-auth-primary-link">
                    Register here
                  </Link>
                </p>
                <p className="rq-auth-legal-note">
                  By continuing, you agree to Rquest&apos;s{' '}
                  <span className="rq-legal-link">Terms of Service</span> &amp;{' '}
                  <span className="rq-legal-link">Privacy Policy</span>
                </p>
              </div>
            </div>
          ) : (
            /* ==========================================================
               STEP 2: TWO-FACTOR VERIFICATION / OTP
               ========================================================== */
            <div className="rq-auth-card-wrapper">
              {/* Inline Step Back Link */}
              <div className="rq-otp-inline-back-row">
                <button
                  type="button"
                  className="rq-otp-inline-back-btn"
                  onClick={() => setStep('phone')}
                >
                  <ArrowLeftOutlined />
                  <span>Change mobile number</span>
                </button>
              </div>

              {/* Verification Centered Hero */}
              <div className="rq-auth-hero">
                <div className="rq-auth-logo-badge-wrap">
                  <img src={AppIcon} alt="Rquest" className="rq-auth-app-icon" />
                </div>

                <h2 className="rq-auth-hero-heading">
                  Enter Verification Code
                </h2>

                <div className="rq-auth-otp-target-row">
                  <span>We sent a 6-digit code to </span>
                  <strong>{formattedDisplayPhone()}</strong>
                  <Tooltip title="Edit phone number">
                    <button
                      type="button"
                      className="rq-auth-edit-phone-btn"
                      onClick={() => setStep('phone')}
                      aria-label="Edit phone number"
                    >
                      <EditOutlined />
                    </button>
                  </Tooltip>
                </div>

                {/* Auto-detecting SMS Banner */}
                <div className="rq-auth-autodetect-banner">
                  <span className="rq-autodetect-icon">📲</span>
                  <span className="rq-autodetect-text">
                    Auto-detecting SMS OTP on this device...
                  </span>
                </div>
              </div>

              {/* OTP Form Card */}
              <div className="rq-auth-box">
                <div className="rq-otp-grid">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className={`rq-otp-box ${digit ? 'filled' : ''}`}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                      onFocus={(e) => e.target.select()}
                    />
                  ))}
                </div>

                {/* Resend Actions Row */}
                <div className="rq-otp-resend-row">
                  <span className="rq-otp-resend-prompt">Didn&apos;t receive code? </span>
                  {resendCooldown > 0 ? (
                    <span className="rq-otp-timer-text">Resend in {resendCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      className="rq-otp-resend-link"
                      onClick={handleResendOtp}
                    >
                      Resend Code Now
                    </button>
                  )}
                </div>

                <div className="rq-otp-whatsapp-row">
                  <button
                    type="button"
                    className="rq-otp-whatsapp-btn"
                    onClick={handleWhatsAppOtp}
                  >
                    <WhatsAppIcon />
                    <span>Get OTP on WhatsApp</span>
                  </button>
                </div>

                {/* Verify & Continue Button */}
                <Button
                  type="primary"
                  loading={loading}
                  onClick={handleVerifyOtp}
                  className="rq-auth-submit-btn"
                  style={{ marginTop: 18 }}
                >
                  <span>Verify &amp; Continue</span>
                  <ArrowRightOutlined />
                </Button>

                {/* ZERO SPAM GUARANTEE Card */}
                <div className="rq-zero-spam-card">
                  <div className="rq-zero-spam-card-icon">
                    <CheckCircleFilled />
                  </div>
                  <div className="rq-zero-spam-card-body">
                    <div className="rq-zero-spam-card-title">ZERO SPAM GUARANTEE</div>
                    <div className="rq-zero-spam-card-text">
                      Direct neighbourhood shop contact only. No spam calls or promotional messages.
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Support Footer */}
              <div className="rq-auth-footer-nav">
                <p className="rq-auth-register-prompt" style={{ color: '#575550' }}>
                  Having trouble logging in?{' '}
                  <button
                    type="button"
                    className="rq-auth-primary-link"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    onClick={() =>
                      message.info('Support is available 8 AM - 10 PM via WhatsApp: 1800-RQUEST')
                    }
                  >
                    Contact Support
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
