const express = require('express');
const { createUser } = require('./register');
const { login } = require('./login');
const { trackIp } = require('./trace');

const router = express.Router();

router.post('/register', createUser);
router.post('/login', login);
router.post('/trace_ip', trackIp);

module.exports = router;
