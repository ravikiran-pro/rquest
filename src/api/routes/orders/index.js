const express = require('express');
const { orders, order_items, shops, users, shop_listings, chats } = require('../../models');
const { authMiddleware } = require('../../auth');

const router = express.Router();

// 3. Get shop's incoming orders (Merchant side - resilient for store dashboard)
router.get('/shop/:shop_id', async (req, res) => {
  try {
    const { shop_id } = req.params;
    const shopOrders = await orders.findAll({
      where: { shop_id },
      include: [
        { model: order_items, as: 'items' },
        { model: users, as: 'customer', attributes: ['id', 'username', 'mobile'] },
        { model: users, as: 'delivery_partner', attributes: ['id', 'username', 'mobile'] },
        { model: shops, as: 'shop', attributes: ['id', 'shop_name', 'mobile_number', 'address', 'img_url'] },
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
      status: 'placed',
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

    // Automated chat notification to shop owner on self-pickup order or service booking
    if (shop.owner_id) {
      try {
        const itemsSummary = validatedItems.map((it) => `${it.quantity}x ${it.item_name}`).join(', ');
        const isSelfPickup = order_type === 'pickup';
        const isService = order_type === 'service' || items.some((i) => i.listing_type === 'service');

        let alertMessage = '';
        if (isSelfPickup) {
          alertMessage = `📦 New Self-Pickup Order #${orderNumber} Placed!\n• Items: ${itemsSummary}\n• Total Amount: ₹${totalAmount}\n• Customer Phone: ${customer_phone || 'Provided in order'}\n• Payment Mode: ${payment_mode === 'direct_upi' ? 'Direct UPI' : 'Pay at Counter'}\n👉 Please start preparing this order and mark "Order Prepare".`;
        } else if (isService) {
          alertMessage = `🛠️ New Service Booking #${orderNumber} Placed!\n• Service: ${itemsSummary}\n• Total Amount: ₹${totalAmount}\n• Customer Phone: ${customer_phone || 'Provided in order'}\n👉 Please review and mark "Order Prepare" to confirm schedule.`;
        } else {
          alertMessage = `🚚 New Delivery Order #${orderNumber} Placed!\n• Items: ${itemsSummary}\n• Total Amount: ₹${totalAmount}\n• Delivery Address: ${delivery_address || 'Customer Address'}\n• Customer Phone: ${customer_phone || 'Provided in order'}\n👉 Please confirm and move to "Open to Delivery".`;
        }

        await chats.create({
          sender_id: user_id,
          receiver_id: shop.owner_id,
          shop_id: shop.id,
          message: alertMessage,
          is_read: false,
          is_deleted: false,
        });
      } catch (chatError) {
        console.warn('Could not auto-create chat notification for order:', chatError);
      }
    }

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

// 2b. Get all customer orders across all shops owned by the user (Merchant / Shop Owner view)
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

    const storeOrders = await orders.findAll({
      where,
      include: [
        { model: order_items, as: 'items' },
        { model: users, as: 'customer', attributes: ['id', 'username', 'mobile'] },
        { model: users, as: 'delivery_partner', attributes: ['id', 'username', 'mobile'] },
        { model: shops, as: 'shop', attributes: ['id', 'shop_name', 'mobile_number', 'address', 'img_url'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: storeOrders,
      shops: myShops,
    });
  } catch (err) {
    console.error('Error fetching merchant store orders:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2c. Get all orders across all shops for Platform Admin (Backup, Accounts & Auditing)
router.get('/admin/all', async (req, res) => {
  try {
    const { role_id, username } = req.headers;
    const { Op } = require('sequelize');

    const isAdmin =
      role_id === 'd5e858d8-636c-4fc3-8c3a-0a76131c95e9' ||
      username === 'admin' ||
      username === 'root';

    if (!isAdmin) {
      return res.status(403).json({ error: 'Platform Super Admin access required' });
    }

    const { shop_id, status, search, startDate, endDate, limit, offset } = req.query;

    const where = {};
    if (shop_id && shop_id !== 'all') {
      where.shop_id = shop_id;
    }
    if (status && status !== 'all') {
      where.status = status;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      const likeOp = Op.iLike || Op.like;
      where[Op.or] = [
        { order_number: { [likeOp]: q } },
        { customer_phone: { [likeOp]: q } },
        { delivery_address: { [likeOp]: q } },
      ];
    }

    const queryOptions = {
      where,
      include: [
        { model: order_items, as: 'items' },
        { model: users, as: 'customer', attributes: ['id', 'username', 'mobile'] },
        { model: users, as: 'delivery_partner', attributes: ['id', 'username', 'mobile'] },
        {
          model: shops,
          as: 'shop',
          attributes: ['id', 'shop_name', 'mobile_number', 'address', 'img_url', 'owner_id'],
          include: [
            { model: users, as: 'owner', attributes: ['id', 'username', 'mobile'] },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    };

    if (limit && parseInt(limit) > 0) {
      queryOptions.limit = parseInt(limit);
      queryOptions.offset = offset ? parseInt(offset) : 0;
    }

    const allOrders = await orders.findAll(queryOptions);

    // Compute platform accounting & accounts metrics
    let totalGMV = 0;
    let totalPlatformFees = 0;
    let totalDeliveryFees = 0;
    const statusCounts = {
      all: allOrders.length,
      placed: 0,
      order_prepare: 0,
      preparing: 0,
      accepted: 0,
      packed: 0,
      ready_for_pickup: 0,
      open_to_delivery: 0,
      out_for_delivery: 0,
      completed: 0,
      cancelled: 0,
    };

    allOrders.forEach((ord) => {
      const amt = parseFloat(ord.total_amount) || 0;
      const pFee = parseFloat(ord.platform_fee) || 0;
      const dFee = parseFloat(ord.delivery_fee) || 0;
      totalGMV += amt;
      totalPlatformFees += pFee;
      totalDeliveryFees += dFee;
      if (statusCounts[ord.status] !== undefined) {
        statusCounts[ord.status]++;
      }
    });

    const accounts = {
      totalOrders: allOrders.length,
      totalGMV: Math.round(totalGMV * 100) / 100,
      totalPlatformFees: Math.round(totalPlatformFees * 100) / 100,
      totalDeliveryFees: Math.round(totalDeliveryFees * 100) / 100,
      netStorePayouts: Math.round((totalGMV - totalPlatformFees) * 100) / 100,
      statusCounts,
    };

    res.status(200).json({
      success: true,
      data: allOrders,
      accounts,
    });
  } catch (err) {
    console.error('Error fetching admin platform orders:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. Update order status (Merchant accepts, packs, readies, moves to open to delivery, or completes)
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, shop_upi_id, delivery_notes } = req.body;

    const validStatuses = [
      'pending',
      'placed',
      'order_prepare',
      'preparing',
      'accepted',
      'packed',
      'ready_for_pickup',
      'open_to_delivery',
      'out_for_delivery',
      'completed',
      'cancelled',
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await orders.findByPk(id, {
      include: [
        { model: shops, as: 'shop' },
        { model: order_items, as: 'items' },
      ],
    });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const previousStatus = order.status;
    order.status = status;
    if (shop_upi_id) order.shop_upi_id = shop_upi_id;
    if (delivery_notes) order.delivery_notes = delivery_notes;
    await order.save();

    // Auto-notify customer in chat on status change
    if (previousStatus !== status && order.customer_id && order.shop?.owner_id) {
      try {
        let statusMsg = '';
        if (status === 'order_prepare' || status === 'preparing') {
          statusMsg = `👨‍🍳 Store Update: Your order #${order.order_number} status is now "Order Prepare". The shop is preparing your items!`;
        } else if (status === 'ready_for_pickup') {
          statusMsg = `✅ Store Update: Your order #${order.order_number} is packed & READY FOR PICKUP at the store counter!`;
        } else if (status === 'open_to_delivery') {
          statusMsg = `🚚 Store Update: Your order #${order.order_number} has been confirmed & moved to "Open to Delivery"! A delivery partner will claim and dispatch soon.`;
        } else if (status === 'out_for_delivery') {
          statusMsg = `🛵 Store Update: Your order #${order.order_number} is out for delivery!`;
        } else if (status === 'completed') {
          statusMsg = `🎉 Store Update: Order #${order.order_number} has been completed! Thank you for ordering local.`;
        } else if (status === 'cancelled') {
          statusMsg = `❌ Store Update: Order #${order.order_number} was cancelled by the merchant.`;
        } else if (status === 'placed') {
          statusMsg = `📋 Store Update: Order #${order.order_number} marked as Order Placed.`;
        }

        if (statusMsg) {
          await chats.create({
            sender_id: order.shop.owner_id,
            receiver_id: order.customer_id,
            shop_id: order.shop_id,
            message: statusMsg,
            is_read: false,
            is_deleted: false,
          });
        }
      } catch (chatError) {
        console.warn('Could not auto-create chat status notification:', chatError);
      }
    }

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

    // Return delivery orders that are open_to_delivery, accepted, packed, ready and either unassigned OR assigned to this driver
    const deliveryOrders = await orders.findAll({
      where: {
        order_type: 'delivery',
        status: {
          [Op.in]: ['open_to_delivery', 'accepted', 'packed', 'ready_for_pickup', 'out_for_delivery'],
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

