const express = require('express');
const { getShopsFilter, getMyShops } = require('./search');
const { createShops, linkDecode } = require('./create');
const { authMiddleware } = require('../../auth');

const router = express.Router();

router.post('/search', getShopsFilter);

router.use(authMiddleware);

router.post('/my_shops', getMyShops);
router.post('/link/decode', linkDecode);
router.post('/client_register', createShops);

module.exports = router;
