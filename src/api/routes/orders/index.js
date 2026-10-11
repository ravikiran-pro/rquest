const express = require('express');
const { orders, order_items, shops, users, shop_listings } = require('../../models');
const { authMiddleware } = require('../../auth');

const router = express.Router();
router.use(authMiddleware);

// 1. Create a new direct order
router.post('/', async (req, res) => {
  try {
    const { user_id } = req.headers;
    const {
      shop_id,
      order_type = 'delivery',
      payment_mode = 'direct_upi',
      delivery_address,
      customer_phone,
      notes,
      items,
      platform_fee = 5.0,
    } = req.body;

    if (!shop_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Shop ID and non-empty items array are required' });
    }

    const shop = await shops.findByPk(shop_id);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Calculate subtotal
    let itemsTotal = 0;
    const validatedItems = items.map((it) => {
      const unit_price = parseFloat(it.unit_price) || 0;
      const quantity = parseInt(it.quantity) || 1;
      const subtotal = unit_price * quantity;
      itemsTotal += subtotal;
      return {
        listing_id: it.listing_id || null,
        item_name: it.item_name || 'Item',
        unit_price,
        quantity,
        subtotal,
      };
    });

    const parsedPlatformFee = parseFloat(platform_fee) || 5.0;
    const totalAmount = itemsTotal + parsedPlatformFee;
    const orderNumber = `RQ-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const newOrder = await orders.create({
      order_number: orderNumber,
      customer_id: user_id,
      shop_id,
      order_type,
      status: 'pending',
      total_amount: totalAmount,
      platform_fee: parsedPlatformFee,
      payment_mode,
      delivery_address: delivery_address || '',
      customer_phone: customer_phone || '',
      notes: notes || '',
    });

    // Bulk create items with order_id
    const itemsToInsert = validatedItems.map((it) => ({
      ...it,
      order_id: newOrder.id,
    }));
    await order_items.bulkCreate(itemsToInsert);

    // Socket notification if owner is online
    const socketData = req.headers.socketData;
    if (socketData && shop.owner_id && socketData[shop.owner_id]) {
      const ownerSocket = socketData[shop.owner_id].socket_id;
      // We will let the client handle it if socket is active
    }

    const createdOrder = await orders.findByPk(newOrder.id, {
      include: [
        { model: order_items, as: 'items' },
        { model: shops, as: 'shop', attributes: ['id', 'shop_name', 'mobile_number', 'address'] },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: createdOrder,
    });
  } catch (err) {
    console.error('Error placing order:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Get customer's orders
router.get('/user', async (req, res) => {
  try {
    const { user_id } = req.headers;
    const customerOrders = await orders.findAll({
      where: { customer_id: user_id },
      include: [
        { model: order_items, as: 'items' },
        { model: shops, as: 'shop', attributes: ['id', 'shop_name', 'mobile_number', 'address', 'img_url'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: customerOrders,
    });
  } catch (err) {
    console.error('Error fetching user orders:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. Get shop's incoming orders (Merchant side)
router.get('/shop/:shop_id', async (req, res) => {
  try {
    const { shop_id } = req.params;
    const shopOrders = await orders.findAll({
      where: { shop_id },
      include: [
        { model: order_items, as: 'items' },
        { model: users, as: 'customer', attributes: ['id', 'username', 'mobile'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: shopOrders,
    });
  } catch (err) {
    console.error('Error fetching shop orders:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. Update order status (Merchant accepts, completes, or cancels)
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'accepted', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await orders.findByPk(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = status;
    await order.save();

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: order,
    });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

