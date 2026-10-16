const express = require('express');
const { getShopsFilter, getMyShops, getShopDetails } = require('./search');
const { createShops, linkDecode, deleteShop } = require('./create');
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
router.put('/:shop_id', (req, res) => {
  req.body.shop_id = req.params.shop_id;
  return createShops(req, res);
});
router.delete('/:shop_id', deleteShop);

module.exports = router;
