const express = require('express');
const { createUser } = require('./register');
const { login } = require('./login');
const { trackIp } = require('./trace');
const {
  requestOtpHandler,
  verifyOtpHandler,
  otpStatusHandler,
} = require('./otp');
const { getProfile, updateProfile } = require('./profile');
const {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} = require('./address');
const { authMiddleware } = require('../../auth');

const router = express.Router();

// Public auth routes
router.post('/register', createUser);
router.post('/login', login);
router.post('/trace_ip', trackIp);

// OTP gateway (email / sms / whatsapp / telegram)
router.post('/otp/request', requestOtpHandler);
router.post('/otp/verify', verifyOtpHandler);
router.get('/otp/status', otpStatusHandler);

// Protected user profile routes
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);

// Protected user address routes
router.get('/addresses', authMiddleware, getAddresses);
router.post('/addresses', authMiddleware, createAddress);
router.put('/addresses/:id', authMiddleware, updateAddress);
router.delete('/addresses/:id', authMiddleware, deleteAddress);
router.put('/addresses/:id/default', authMiddleware, setDefaultAddress);

module.exports = router;
