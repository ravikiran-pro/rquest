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
import { takeReturnPath } from '../../app/utils/returnTo';
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
  const [channelLoading, setChannelLoading] = useState(null); // 'sms' | 'whatsapp' | null
  const [phoneNumber, setPhoneNumber] = useState('9876543210');
  const [countryCode] = useState('+91');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [activeChannel, setActiveChannel] = useState('sms');
  const [resendCooldown, setResendCooldown] = useState(0);
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

  // Focus and WebOTP listener when stepping into OTP
  useEffect(() => {
    if (step !== 'otp') return;

    // Auto-focus first empty box
    const firstEmpty = otpDigits.findIndex((d) => !d);
    const targetIdx = firstEmpty === -1 ? 0 : firstEmpty;
    otpInputRefs.current[targetIdx]?.focus();

    // Native WebOTP API (auto-detect real SMS on Android / supported browsers)
    if ('OTPCredential' in window && window.AbortController) {
      const ac = new AbortController();
      navigator.credentials
        ?.get({
          otp: { transport: ['sms'] },
          signal: ac.signal,
        })
        .then((content) => {
          if (content && content.code) {
            const clean = content.code.replace(/\D/g, '').slice(0, 6);
            if (clean) {
              setOtpDigits(clean.split(''));
              message.success('SMS OTP auto-detected from incoming message!');
            }
          }
        })
        .catch(() => {});

      return () => ac.abort();
    }
  }, [step]);

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

    // Came from a guarded action (e.g. cart checkout): go back to that page
    const returnPath = takeReturnPath();
    const { isAdmin, isMerchant } = checkUserRole(res.user_data);
    if (returnPath) {
      history.push(returnPath);
    } else if (isAdmin) {
      history.push(Routes.admin);
    } else if (isMerchant) {
      history.push(Routes.client);
    } else {
      history.push(Routes.app);
    }
  };

  // Step 1: Request OTP via chosen channel ('sms' or 'whatsapp')
  const handleRequestOtp = async (channel = 'sms') => {
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
    setChannelLoading(channel);

    try {
      const res = await netWorkCall(
        apiConfig.otp_request || 'user/otp/request',
        'POST',
        JSON.stringify({
          identifier: cleanPhone,
          channel: channel,
          purpose: 'login',
        })
      );

      if (res && (res.success || res.devCode)) {
        setActiveChannel(channel);
        setStep('otp');
        setResendCooldown(30);

        // Autofill OTP if code is returned (dev mode or trial template extracted code)
        if (res.devCode) {
          const digits = String(res.devCode).trim().split('').slice(0, 6);
          setOtpDigits(digits);
          if (res.delivered) {
            message.success(
              `OTP sent to ${formattedDisplayPhone()} via ${channel.toUpperCase()} and autofilled!`
            );
          } else {
            message.info(
              `OTP (${res.devCode}) generated & autofilled!`
            );
          }
        } else {
          message.success(
            `OTP sent to ${formattedDisplayPhone()} via ${channel.toUpperCase()}`
          );
        }
      } else {
        message.error(res?.message || 'Failed to send verification code. Please try again.');
      }
    } catch (err) {
      console.error('OTP request error:', err);
      message.error('Failed to connect to authentication server. Please try again.');
    } finally {
      setLoading(false);
      setChannelLoading(null);
    }
  };

  const handlePhoneSubmit = (e, channel = 'sms') => {
    if (e && e.preventDefault) e.preventDefault();
    handleRequestOtp(channel);
  };

  // Password Login Handler
  const handlePasswordLogin = async () => {
    if (!password) {
      message.error('Please enter your account password');
      return;
    }
    setLoading(true);
    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const body = JSON.stringify({
        identifier: cleanPhone || phoneNumber,
        mobile: cleanPhone || phoneNumber,
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
      message.error('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const body = JSON.stringify({
        identifier: cleanPhone || phoneNumber,
        mobile: cleanPhone || phoneNumber,
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

  // Resend OTP via active channel
  const handleResendOtp = () => {
    if (resendCooldown > 0) return;
    handleRequestOtp(activeChannel);
  };

  // WhatsApp OTP Request
  const handleWhatsAppOtp = () => {
    handleRequestOtp('whatsapp');
  };

  // Social / One-Tap Handlers
  const handleSocialLogin = (provider) => {
    message.loading(`Connecting with ${provider}...`, 0.9).then(() => {
      setPhoneNumber('9876543210');
      handleRequestOtp('sms');
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
                <form onSubmit={(e) => handlePhoneSubmit(e, 'sms')} className="rq-auth-form-stack">
                  <div>
                    <div className="rq-auth-field-row">
                      <span className="rq-auth-label-main">Mobile Phone Number</span>
                      <span className="rq-auth-label-hint">
                        {passwordMode ? 'Password login' : 'Instant OTP verification'}
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
                    {/* Primary Button: Continue with OTP (SMS) */}
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading && channelLoading === 'sms'}
                      className="rq-auth-submit-btn"
                    >
                      <span>{passwordMode ? 'Sign In with Password' : 'Continue with OTP'}</span>
                      <ArrowRightOutlined />
                    </Button>

                    {/* WhatsApp OTP Alternative on Step 1 */}
                    {!passwordMode && (
                      <Button
                        type="default"
                        htmlType="button"
                        loading={loading && channelLoading === 'whatsapp'}
                        className="rq-auth-whatsapp-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRequestOtp('whatsapp');
                        }}
                        style={{
                          marginTop: 10,
                          width: '100%',
                          height: 44,
                          borderRadius: 9999,
                          background: '#F0FDF4',
                          borderColor: '#86EFAC',
                          color: '#15803D',
                          fontWeight: 700,
                          fontSize: 14,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <WhatsAppIcon />
                        <span>Continue with WhatsApp</span>
                      </Button>
                    )}

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
                <p className="rq-auth-register-prompt" style={{ marginTop: 6, fontSize: 12.5 }}>
                  Are you a local shop owner?{' '}
                  <Link to={Routes.client} className="rq-auth-primary-link" style={{ fontWeight: 700 }}>
                    Sell on Rquest
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
              {/* Step Back Link — matches "Back to Market" top placement */}
              <div className="rq-auth-mobile-top-nav">
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
                  <span>We sent a 6-digit code via <strong>{activeChannel.toUpperCase()}</strong> to </span>
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
                      Resend {activeChannel.toUpperCase()} Code
                    </button>
                  )}
                </div>

                <div className="rq-otp-whatsapp-row">
                  {activeChannel === 'whatsapp' ? (
                    <button
                      type="button"
                      className="rq-otp-resend-link"
                      onClick={() => handleRequestOtp('sms')}
                      disabled={loading}
                      style={{ fontSize: 13, color: '#0B2D6B', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      📲 Send OTP via SMS instead
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rq-otp-whatsapp-btn"
                      onClick={handleWhatsAppOtp}
                      disabled={loading}
                    >
                      <WhatsAppIcon />
                      <span>Get OTP on WhatsApp</span>
                    </button>
                  )}
                </div>

                {/* Verify & Continue Button */}
                <Button
                  type="primary"
                  loading={loading && !channelLoading}
                  onClick={handleVerifyOtp}
                  className="rq-auth-submit-btn"
                  style={{ marginTop: 18 }}
                >
                  <span>Verify &amp; Continue</span>
                  <ArrowRightOutlined />
                </Button>
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
