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
      delivery_fee = 0.0,
      shop_upi_id,
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

    const parsedPlatformFee = parseFloat(platform_fee) || 0.0;
    const parsedDeliveryFee = order_type === 'delivery' ? parseFloat(delivery_fee) || 0.0 : 0.0;
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
      delivery_fee: parsedDeliveryFee,
      payment_mode,
      delivery_address: delivery_address || '',
      customer_phone: customer_phone || '',
      notes: notes || '',
      shop_upi_id: shop_upi_id || shop.mobile_number || '',
    });

    // Bulk create items with order_id
    const itemsToInsert = validatedItems.map((it) => ({
      ...it,
      order_id: newOrder.id,
    }));
    await order_items.bulkCreate(itemsToInsert);

    const createdOrder = await orders.findByPk(newOrder.id, {
      include: [
        { model: order_items, as: 'items' },
        { model: shops, as: 'shop', attributes: ['id', 'shop_name', 'mobile_number', 'address', 'latitude', 'longitude'] },
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
        { model: shops, as: 'shop', attributes: ['id', 'shop_name', 'mobile_number', 'address', 'img_url', 'latitude', 'longitude'] },
        { model: users, as: 'delivery_partner', attributes: ['id', 'username', 'mobile'] },
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
        { model: users, as: 'delivery_partner', attributes: ['id', 'username', 'mobile'] },
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

// 4. Update order status (Merchant accepts, packs, readies, or completes)
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, shop_upi_id, delivery_notes } = req.body;

    const validStatuses = [
      'pending',
      'accepted',
      'packed',
      'ready_for_pickup',
      'out_for_delivery',
      'completed',
      'cancelled',
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await orders.findByPk(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = status;
    if (shop_upi_id) order.shop_upi_id = shop_upi_id;
    if (delivery_notes) order.delivery_notes = delivery_notes;
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

// 5. Delivery Guys Portal: Available delivery tasks feed
router.get('/delivery/feed', async (req, res) => {
  try {
    const { user_id } = req.headers;
    const { Op } = require('sequelize');

    // Return delivery orders that are accepted/packed/ready and either unassigned OR assigned to this driver
    const deliveryOrders = await orders.findAll({
      where: {
        order_type: 'delivery',
        status: {
          [Op.in]: ['accepted', 'packed', 'ready_for_pickup', 'out_for_delivery'],
        },
        [Op.or]: [
          { delivery_partner_id: null },
          { delivery_partner_id: user_id },
        ],
      },
      include: [
        { model: order_items, as: 'items' },
        { model: shops, as: 'shop', attributes: ['id', 'shop_name', 'mobile_number', 'address', 'latitude', 'longitude'] },
        { model: users, as: 'customer', attributes: ['id', 'username', 'mobile'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: deliveryOrders,
    });
  } catch (err) {
    console.error('Error fetching delivery feed:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 6. Delivery Guys Portal: Claim an order
router.put('/:id/claim-delivery', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.headers;

    const order = await orders.findByPk(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.delivery_partner_id && order.delivery_partner_id !== user_id) {
      return res.status(400).json({ error: 'Order has already been claimed by another delivery partner' });
    }

    order.delivery_partner_id = user_id;
    if (order.status === 'ready_for_pickup') {
      order.status = 'out_for_delivery';
    }
    await order.save();

    const updated = await orders.findByPk(id, {
      include: [
        { model: order_items, as: 'items' },
        { model: shops, as: 'shop', attributes: ['id', 'shop_name', 'mobile_number', 'address', 'latitude', 'longitude'] },
        { model: users, as: 'customer', attributes: ['id', 'username', 'mobile'] },
        { model: users, as: 'delivery_partner', attributes: ['id', 'username', 'mobile'] },
      ],
    });

    res.status(200).json({
      success: true,
      message: 'Delivery claimed successfully',
      data: updated,
    });
  } catch (err) {
    console.error('Error claiming delivery:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 7. Customer Fallback: Switch order to self-pickup if no driver
router.put('/:id/switch-to-pickup', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.headers;

    const order = await orders.findOne({ where: { id, customer_id: user_id } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.order_type = 'pickup';
    order.delivery_partner_id = null;
    order.delivery_fee = 0.0;
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order successfully switched to Self-Pickup',
      data: order,
    });
  } catch (err) {
    console.error('Error switching to pickup:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

