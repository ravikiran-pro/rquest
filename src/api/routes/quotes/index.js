const express = require('express');
const { quotes, shops, users } = require('../../models');
const { authMiddleware, isAdminReq } = require('../../auth');

const router = express.Router();
router.use(authMiddleware);

// Statuses a service quote moves through (new request, confirmed, completed, declined)
const QUOTE_STATUSES = ['offered', 'accepted', 'completed', 'rejected'];

// Owner of the shop the quote belongs to, or a platform admin
const canManageShop = async (req, shopId) => {
  if (isAdminReq(req)) return true;
  const { user_id } = req.headers;
  const shop = await shops.findByPk(shopId, { attributes: ['id', 'owner_id'] });
  return Boolean(shop && shop.owner_id && shop.owner_id === user_id);
};

// 1. Create a quote / estimate request
router.post('/', async (req, res) => {
  try {
    const { user_id } = req.headers;
    const { shop_id, service_title, service_description, estimated_amount } = req.body;

    if (!shop_id || !service_title) {
      return res.status(400).json({ error: 'Shop ID and service title are required' });
    }

    const newQuote = await quotes.create({
      customer_id: user_id,
      shop_id,
      service_title,
      service_description: service_description || '',
      estimated_amount: parseFloat(estimated_amount) || 0,
      status: 'offered',
    });

    res.status(201).json({
      success: true,
      message: 'Quote request submitted successfully',
      data: newQuote,
    });
  } catch (err) {
    console.error('Error creating quote:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Get customer quotes
router.get('/user', async (req, res) => {
  try {
    const { user_id } = req.headers;
    const userQuotes = await quotes.findAll({
      where: { customer_id: user_id },
      include: [
        { model: shops, as: 'shop', attributes: ['id', 'shop_name', 'mobile_number', 'address', 'img_url'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: userQuotes,
    });
  } catch (err) {
    console.error('Error fetching user quotes:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2b. Get all service quotes across all shops owned by the user (Merchant / Shop Owner view)
router.get('/owner', async (req, res) => {
  try {
    const { user_id } = req.headers;
    const { Op } = require('sequelize');

    const myShops = await shops.findAll({
      where: { owner_id: user_id },
      attributes: ['id', 'shop_name', 'mobile_number', 'address', 'img_url'],
    });

    const shopIds = myShops.map((s) => s.id);
    if (shopIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        shops: [],
      });
    }

    const { shop_id, status } = req.query;
    const where = {};
    if (shop_id && shop_id !== 'all' && shopIds.includes(shop_id)) {
      where.shop_id = shop_id;
    } else {
      where.shop_id = { [Op.in]: shopIds };
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    const shopQuotes = await quotes.findAll({
      where,
      include: [
        { model: users, as: 'customer', attributes: ['id', 'username', 'mobile'] },
        { model: shops, as: 'shop', attributes: ['id', 'shop_name', 'mobile_number', 'address', 'img_url'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: shopQuotes,
      shops: myShops,
    });
  } catch (err) {
    console.error('Error fetching merchant quotes:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2c. Get all service quotes across all shops for Platform Admin
router.get('/admin/all', async (req, res) => {
  try {
    if (!isAdminReq(req)) {
      return res.status(403).json({ error: 'Platform Super Admin access required' });
    }

    const allQuotes = await quotes.findAll({
      include: [
        { model: users, as: 'customer', attributes: ['id', 'username', 'mobile'] },
        { model: shops, as: 'shop', attributes: ['id', 'shop_name', 'mobile_number', 'address', 'img_url'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: allQuotes,
    });
  } catch (err) {
    console.error('Error fetching admin quotes:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. Get shop quotes (Merchant view). Owner or admin only.
router.get('/shop/:shop_id', async (req, res) => {
  try {
    const { shop_id } = req.params;
    if (!(await canManageShop(req, shop_id))) {
      return res.status(403).json({ success: false, error: 'Only the shop owner can view these quotes' });
    }
    const shopQuotes = await quotes.findAll({
      where: { shop_id },
      include: [
        { model: users, as: 'customer', attributes: ['id', 'username', 'mobile'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: shopQuotes,
    });
  } catch (err) {
    console.error('Error fetching shop quotes:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. Update quote status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, estimated_amount } = req.body;

    if (status !== undefined && !QUOTE_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${QUOTE_STATUSES.join(', ')}`,
      });
    }

    const quote = await quotes.findByPk(id);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    if (!(await canManageShop(req, quote.shop_id))) {
      return res.status(403).json({ success: false, error: 'Only the shop owner can update this quote' });
    }

    if (status) quote.status = status;
    if (estimated_amount !== undefined) quote.estimated_amount = parseFloat(estimated_amount);
    await quote.save();

    res.status(200).json({
      success: true,
      message: `Quote updated successfully`,
      data: quote,
    });
  } catch (err) {
    console.error('Error updating quote status:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

