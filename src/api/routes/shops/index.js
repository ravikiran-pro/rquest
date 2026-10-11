const express = require('express');
const { getShopsFilter, getMyShops, getShopDetails } = require('./search');
const { createShops, linkDecode } = require('./create');
const { authMiddleware } = require('../../auth');
const { getAllCategories } = require('./categories');

const router = express.Router();

router.post('/search', getShopsFilter);
router.get('/my_categories', getAllCategories);
router.get('/:shop_id/details', getShopDetails);

router.use(authMiddleware);

router.post('/my_shops', getMyShops);
router.post('/link/decode', linkDecode);
router.post('/client_register', createShops);

module.exports = router;
