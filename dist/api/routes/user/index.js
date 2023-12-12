const express = require('express');
const {
  createUser
} = require('./register');
const {
  login
} = require('./login');
const router = express.Router();
router.post('/register', createUser);
router.post('/login', login);
module.exports = router;