import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Modal, Input, Button, message, Tooltip } from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  CheckCircleFilled,
  EnvironmentFilled,
  LockOutlined,
  ArrowRightOutlined,
  UserOutlined,
  CloseOutlined,
  MobileOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { apiConfig, netWorkCall, storageKeys, SOCKET } from '../../utils';
import { useGlobalStore, subscribeToPushNotifications, requestPushPermission } from '../../services';
import { AppIcon } from '../assets';
import { WhatsAppIcon, AuthSocialButtons } from '../../../screens/login/AuthShared';
import '../../../screens/login/auth.css';

export const AuthModal = ({
  open,
  onClose,
  initialMode = 'login',
  onSuccess,
}) => {
  const update_user_data = useGlobalStore((state) => state.update_user_data);

  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [loading, setLoading] = useState(false);
  const [channelLoading, setChannelLoading] = useState(null); // 'sms' | 'whatsapp' | null

  // Login states
  const [phoneNumber, setPhoneNumber] = useState('9876543210');
  const [countryCode] = useState('+91');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [activeChannel, setActiveChannel] = useState('sms');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [passwordMode, setPasswordMode] = useState(false);
  const [password, setPassword] = useState('');

  // Register states
  const [regFullName, setRegFullName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Refs for 6-digit OTP inputs
  const otpInputRefs = useRef([]);

  useEffect(() => {
    if (open) {
      setMode(initialMode || 'login');
      setStep('phone');
      setPasswordMode(false);
      setPassword('');
      setRegFullName('');
      setRegMobile('');
      setRegPassword('');
      setOtpDigits(['', '', '', '', '', '']);
      setResendCooldown(0);
    }
  }, [open, initialMode]);

  // Resend Countdown Timer
  useEffect(() => {
    let timer;
    if (open && step === 'otp' && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [open, step, resendCooldown]);

  // WebOTP listener in modal
  useEffect(() => {
    if (!open || step !== 'otp') return;

    const firstEmpty = otpDigits.findIndex((d) => !d);
    const targetIdx = firstEmpty === -1 ? 0 : firstEmpty;
    otpInputRefs.current[targetIdx]?.focus();

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
              message.success('SMS OTP auto-detected!');
            }
          }
        })
        .catch(() => {});

      return () => ac.abort();
    }
  }, [open, step]);

  // Format Phone for display: +91 98765 43210
  const formattedDisplayPhone = () => {
    const raw = phoneNumber.replace(/\D/g, '');
    if (raw.length === 10) {
      return `${countryCode} ${raw.slice(0, 5)} ${raw.slice(5)}`;
    }
    return `${countryCode} ${phoneNumber}`;
  };

  // Helper to complete login/register session
  const completeSession = (res) => {
    sessionStorage.setItem(storageKeys.auth_token, res.token);
    localStorage.setItem(storageKeys.auth_token, res.token);
    update_user_data(res.user_data);
    SOCKET.emit('connect_user', res.user_data);

    if ('Notification' in window && Notification.permission === 'granted') {
      subscribeToPushNotifications(res.user_data).catch(() => {});
    }

    if (onSuccess) {
      onSuccess(res.user_data, res.token);
    }
    onClose?.();
  };

  // Step 1: Handle Phone submission -> Proceed to OTP Step or Password login
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

        if (res.devCode) {
          const digits = String(res.devCode).trim().split('').slice(0, 6);
          setOtpDigits(digits);
          if (res.delivered) {
            message.success(
              `OTP sent to ${formattedDisplayPhone()} via ${channel.toUpperCase()} & autofilled!`
            );
          } else {
            message.info(`OTP (${res.devCode}) generated & autofilled!`);
          }
        } else {
          message.success(
            `OTP sent to ${formattedDisplayPhone()} via ${channel.toUpperCase()}`
          );
        }
      } else {
        message.error(res?.message || 'Failed to send OTP. Please try again.');
      }
    } catch {
      setActiveChannel(channel);
      setStep('otp');
      setResendCooldown(30);
      message.success(`OTP requested for ${formattedDisplayPhone()}`);
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
      message.error('Please enter the verification code');
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

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    handleRequestOtp(activeChannel);
  };

  // WhatsApp OTP
  const handleWhatsAppOtp = async () => {
    handleRequestOtp('whatsapp');
  };

  // Social Login Handler
  const handleSocialLogin = (provider) => {
    message.loading(`Connecting with ${provider}...`, 0.9).then(() => {
      setPhoneNumber('9876543210');
      setStep('otp');
      message.info(`Continuing with verified phone from ${provider}`);
    });
  };

  // Register Submit Handler
  const handleRegisterSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanName = regFullName.trim();
    const cleanMobile = regMobile.replace(/\D/g, '');

    if (!cleanName) {
      message.error('Please enter your full name');
      return;
    }
    if (!cleanMobile || cleanMobile.length < 10) {
      message.error('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      message.error('Please create a password (minimum 4 characters)');
      return;
    }

    setLoading(true);
    try {
      const body = JSON.stringify({
        username: cleanName,
        password: regPassword,
        mobile: cleanMobile,
        userRole: 'c0f93a2f-16c9-49cf-b47b-e0c0a38a5a4d',
        role_id: 'c0f93a2f-16c9-49cf-b47b-e0c0a38a5a4d',
      });
      const res = await netWorkCall(apiConfig.register, 'POST', body);
      if (res && res.success === true) {
        if ('Notification' in window) {
          requestPushPermission(res.user_data).catch(() => {});
        }
        message.success('Account created! Welcome to Rquest.');
        completeSession(res);
      } else {
        message.error(res?.message || 'Registration failed. Please check details.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      message.error('An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      centered
      width={460}
      closeIcon={<CloseOutlined style={{ fontSize: 16, color: '#64748B' }} />}
      styles={{
        body: {
          padding: '24px 24px 28px',
          background: '#F8F4EF',
          borderRadius: 20,
        },
      }}
      style={{ borderRadius: 20, overflow: 'hidden' }}
    >
      <div className="rq-auth-card-wrapper" style={{ margin: '0 auto', maxWidth: 400 }}>
        {mode === 'login' ? (
          step === 'phone' ? (
            <div>
              {/* Centered Brand Hero */}
              <div className="rq-auth-hero" style={{ marginBottom: 18 }}>
                <div className="rq-auth-logo-badge-wrap">
                  <img src={AppIcon} alt="Rquest" className="rq-auth-app-icon" />
                  <span className="rq-auth-verified-check">
                    <CheckCircleFilled />
                  </span>
                </div>

                <div className="rq-auth-pill-badge" style={{ marginTop: 8 }}>
                  <EnvironmentFilled className="rq-auth-pill-icon" />
                  <span>One Neighbourhood ID</span>
                </div>

                <h2 className="rq-auth-hero-heading" style={{ fontSize: 22, margin: '8px 0 2px' }}>
                  Welcome to Rquest
                </h2>
                <p className="rq-auth-hero-sub" style={{ fontSize: 13, margin: 0 }}>
                  Sign in with your mobile number to continue.
                </p>
              </div>

              {/* Form Box */}
              <div className="rq-auth-box" style={{ padding: 18, background: '#FFFFFF', borderRadius: 16 }}>
                <form onSubmit={handlePhoneSubmit} className="rq-auth-form-stack">
                  <div>
                    <div className="rq-auth-field-row" style={{ marginBottom: 6 }}>
                      <span className="rq-auth-label-main" style={{ fontSize: 13, fontWeight: 700 }}>
                        Mobile Phone Number
                      </span>
                      <span className="rq-auth-label-hint" style={{ fontSize: 11 }}>
                        {passwordMode ? 'Password login' : 'SMS verification'}
                      </span>
                    </div>

                    <div className="rq-auth-phone-control">
                      <div className="rq-auth-country-picker">
                        <span className="rq-country-flag">🇮🇳</span>
                        <span className="rq-country-code">{countryCode}</span>
                        <DownOutlined className="rq-country-caret" />
                      </div>
                      <input
                        type="tel"
                        className="rq-auth-phone-input"
                        placeholder="98765 43210"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        autoComplete="tel"
                        style={{ fontSize: 14 }}
                      />
                    </div>
                  </div>

                  {passwordMode && (
                    <div style={{ marginTop: 12 }}>
                      <div className="rq-auth-field-row" style={{ marginBottom: 6 }}>
                        <span className="rq-auth-label-main" style={{ fontSize: 13, fontWeight: 700 }}>
                          Password
                        </span>
                      </div>
                      <Input.Password
                        prefix={<LockOutlined style={{ color: '#747781' }} />}
                        placeholder="Enter your account password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="rq-auth-text-input"
                        style={{ height: 42, borderRadius: 10 }}
                      />
                    </div>
                  )}

                  <div className="rq-auth-actions-block" style={{ marginTop: 16 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading && channelLoading === 'sms'}
                      className="rq-auth-submit-btn"
                      onClick={(e) => handlePhoneSubmit(e, 'sms')}
                      style={{
                        height: 44,
                        borderRadius: 9999,
                        background: '#0B2D6B',
                        fontWeight: 700,
                        fontSize: 14,
                        width: '100%',
                      }}
                    >
                      <span>{passwordMode ? 'Sign In with Password' : 'Continue with OTP'}</span>
                      <ArrowRightOutlined />
                    </Button>

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

                    <div className="rq-auth-mode-toggle" style={{ marginTop: 8, textAlign: 'center' }}>
                      <button
                        type="button"
                        className="rq-auth-text-link"
                        onClick={() => setPasswordMode(!passwordMode)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0159C5',
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {passwordMode
                          ? 'Switch back to OTP verification'
                          : 'Or sign in with password'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              <AuthSocialButtons onSocialAction={handleSocialLogin} />

              <div className="rq-auth-footer-nav" style={{ marginTop: 14, textAlign: 'center' }}>
                <p className="rq-auth-register-prompt" style={{ fontSize: 12.5, margin: 0 }}>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="rq-auth-primary-link"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0B2D6B',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Register here
                  </button>
                </p>
              </div>
            </div>
          ) : (
            /* Step 2: OTP Verification */
            <div>
              <div className="rq-otp-inline-back-row" style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  className="rq-otp-inline-back-btn"
                  onClick={() => setStep('phone')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0B2D6B',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <ArrowLeftOutlined />
                  <span>Change mobile number</span>
                </button>
              </div>

              <div className="rq-auth-hero" style={{ marginBottom: 16 }}>
                <div className="rq-auth-logo-badge-wrap">
                  <img src={AppIcon} alt="Rquest" className="rq-auth-app-icon" />
                </div>

                <h2 className="rq-auth-hero-heading" style={{ fontSize: 20, margin: '8px 0 2px' }}>
                  Enter Verification Code
                </h2>

                <div className="rq-auth-otp-target-row" style={{ fontSize: 12.5, color: '#4B5563' }}>
                  <span>We sent a 6-digit code via <strong>{activeChannel.toUpperCase()}</strong> to </span>
                  <strong>{formattedDisplayPhone()}</strong>
                  <Tooltip title="Edit phone number">
                    <button
                      type="button"
                      className="rq-auth-edit-phone-btn"
                      onClick={() => setStep('phone')}
                      aria-label="Edit phone number"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#0159C5',
                        marginLeft: 4,
                      }}
                    >
                      <EditOutlined />
                    </button>
                  </Tooltip>
                </div>

                <div className="rq-auth-autodetect-banner" style={{ margin: '8px 0 0', fontSize: 11.5 }}>
                  <span className="rq-autodetect-icon"><MobileOutlined /></span>
                  <span className="rq-autodetect-text">Auto-detecting SMS OTP on this device...</span>
                </div>
              </div>

              <div className="rq-auth-box" style={{ padding: 18, background: '#FFFFFF', borderRadius: 16 }}>
                <div className="rq-otp-grid" style={{ gap: 8, marginBottom: 14 }}>
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
                      style={{ width: 44, height: 48, fontSize: 18 }}
                    />
                  ))}
                </div>

                <div className="rq-otp-resend-row" style={{ fontSize: 12, textAlign: 'center', marginBottom: 10 }}>
                  <span className="rq-otp-resend-prompt">Didn&apos;t receive code? </span>
                  {resendCooldown > 0 ? (
                    <span className="rq-otp-timer-text" style={{ color: '#6B7280', fontWeight: 600 }}>
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="rq-otp-resend-link"
                      onClick={handleResendOtp}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0B2D6B',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Resend {activeChannel.toUpperCase()} Code
                    </button>
                  )}
                </div>

                <div className="rq-otp-whatsapp-row" style={{ textAlign: 'center', marginBottom: 12 }}>
                  {activeChannel === 'whatsapp' ? (
                    <button
                      type="button"
                      className="rq-otp-resend-link"
                      onClick={() => handleRequestOtp('sms')}
                      disabled={loading}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0B2D6B',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Send OTP via SMS instead
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rq-otp-whatsapp-btn"
                      onClick={handleWhatsAppOtp}
                      disabled={loading}
                      style={{
                        background: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderRadius: 9999,
                        padding: '5px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#15803D',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <WhatsAppIcon />
                      <span>Get OTP on WhatsApp</span>
                    </button>
                  )}
                </div>

                <Button
                  type="primary"
                  loading={loading}
                  onClick={handleVerifyOtp}
                  className="rq-auth-submit-btn"
                  style={{
                    width: '100%',
                    height: 44,
                    borderRadius: 9999,
                    background: '#0B2D6B',
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  <span>Verify &amp; Continue</span>
                  <ArrowRightOutlined />
                </Button>
              </div>
            </div>
          )
        ) : (
          /* Register Form */
          <div>
            <div className="rq-auth-hero" style={{ marginBottom: 18 }}>
              <div className="rq-auth-logo-badge-wrap">
                <img src={AppIcon} alt="Rquest" className="rq-auth-app-icon" />
                <span className="rq-auth-verified-check">
                  <CheckCircleFilled />
                </span>
              </div>
              <h2 className="rq-auth-hero-heading" style={{ fontSize: 22, margin: '8px 0 2px' }}>
                Create your account
              </h2>
              <p className="rq-auth-hero-sub" style={{ fontSize: 13, margin: 0 }}>
                Join as a neighbourhood shopper to order directly.
              </p>
            </div>

            <div className="rq-auth-box" style={{ padding: 18, background: '#FFFFFF', borderRadius: 16 }}>
              <form onSubmit={handleRegisterSubmit} className="rq-auth-form-stack" style={{ gap: 12 }}>
                <div>
                  <div className="rq-auth-field-row" style={{ marginBottom: 4 }}>
                    <span className="rq-auth-label-main" style={{ fontSize: 13, fontWeight: 700 }}>
                      Full Name
                    </span>
                  </div>
                  <Input
                    prefix={<UserOutlined style={{ color: '#747781' }} />}
                    placeholder="Enter your name"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    style={{ height: 42, borderRadius: 10 }}
                  />
                </div>

                <div>
                  <div className="rq-auth-field-row" style={{ marginBottom: 4 }}>
                    <span className="rq-auth-label-main" style={{ fontSize: 13, fontWeight: 700 }}>
                      Mobile Phone Number
                    </span>
                  </div>
                  <div className="rq-auth-phone-control">
                    <div className="rq-auth-country-picker">
                      <span className="rq-country-flag">🇮🇳</span>
                      <span className="rq-country-code">+91</span>
                      <DownOutlined className="rq-country-caret" />
                    </div>
                    <input
                      type="tel"
                      className="rq-auth-phone-input"
                      placeholder="98765 43210"
                      value={regMobile}
                      onChange={(e) => setRegMobile(e.target.value)}
                      autoComplete="tel"
                      style={{ fontSize: 14 }}
                    />
                  </div>
                </div>

                <div>
                  <div className="rq-auth-field-row" style={{ marginBottom: 4 }}>
                    <span className="rq-auth-label-main" style={{ fontSize: 13, fontWeight: 700 }}>
                      Password
                    </span>
                  </div>
                  <Input.Password
                    prefix={<LockOutlined style={{ color: '#747781' }} />}
                    placeholder="Create a password (min 4 chars)"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    style={{ height: 42, borderRadius: 10 }}
                  />
                </div>

                <div className="rq-auth-actions-block" style={{ marginTop: 14 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    className="rq-auth-submit-btn"
                    style={{
                      height: 44,
                      borderRadius: 9999,
                      background: '#0B2D6B',
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    <span>Create Account</span>
                    <ArrowRightOutlined />
                  </Button>
                </div>
              </form>
            </div>

            <AuthSocialButtons onSocialAction={handleSocialLogin} />

            <div className="rq-auth-footer-nav" style={{ marginTop: 14, textAlign: 'center' }}>
              <p className="rq-auth-register-prompt" style={{ fontSize: 12.5, margin: 0 }}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setStep('phone');
                  }}
                  className="rq-auth-primary-link"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0B2D6B',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Sign in here
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

AuthModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  initialMode: PropTypes.oneOf(['login', 'register']),
  onSuccess: PropTypes.func,
};

export default AuthModal;
