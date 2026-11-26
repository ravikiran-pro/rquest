const express = require('express');
const {
  sequelize,
  orders,
  order_items,
  shops,
  shop_listings,
  listing_variants,
  users,
  chats,
  user_addresses,
} = require('../../models');
const { planOrderStock, planRestock, stockUnitKey } = require('../../services/stock');
const { axesOf, hasVariants, variantLabel, refreshListingsFromVariants } = require('../../services/variants');
const { authMiddleware, isAdminReq } = require('../../auth');
const {
  getSettings: getPlatformSettings,
  computeOrderFees,
  orderBlock,
  distanceKm,
} = require('../../services/platformSettings');
const {
  sendPushNotification,
  getOrderStatusNotification,
} = require('../../services/notificationService');

const router = express.Router();

// Status moves the merchant, customer and delivery UIs make (see manage_store.jsx getOrderActions).
// Completed and cancelled are final. Any open order can be cancelled (handled in canMoveOrder).
const PREPARING_MOVES = ['placed', 'packed', 'ready_for_pickup', 'open_to_delivery', 'completed'];
const ORDER_TRANSITIONS = {
  pending: ['placed', 'order_prepare', 'accepted'],
  placed: ['order_prepare', 'preparing', 'accepted'],
  order_prepare: PREPARING_MOVES,
  preparing: PREPARING_MOVES,
  accepted: PREPARING_MOVES,
  packed: PREPARING_MOVES,
  ready_for_pickup: ['out_for_delivery', 'completed'],
  open_to_delivery: ['out_for_delivery', 'completed'],
  out_for_delivery: ['completed'],
  completed: [],
  cancelled: [],
};
const canMoveOrder = (from, to) => {
  if (!Object.prototype.hasOwnProperty.call(ORDER_TRANSITIONS, from) || from === to) return false;
  if (to === 'cancelled') return ORDER_TRANSITIONS[from].length > 0; // any open order
  return ORDER_TRANSITIONS[from].includes(to);
};

/** Thrown inside the order transaction when a conditional stock decrement finds too few units. */
class OutOfStockError extends Error {
  constructor(listingId, variantId = null) {
    super('OUT_OF_STOCK');
    this.listingId = listingId;
    this.variantId = variantId;
  }
}

const outOfStockBody = (short) => ({
  success: false,
  code: 'OUT_OF_STOCK',
  error: 'Some items are out of stock',
  items: short.map(({ listing_id, variant_id, name, requested, available }) => ({
    listing_id,
    ...(variant_id ? { variant_id } : {}),
    name,
    requested,
    available,
  })),
});

// What the order route reads of a listing (price and stock; variant_axes says where they live)
const LISTING_STOCK_ATTRS = ['id', 'name', 'price', 'stock_mode', 'stock_qty', 'is_available', 'variant_axes'];

/** Map(variant_id → plain variant) for ids (already UUID-checked). */
const variantsByIds = async (ids) => {
  if (!ids.length) return new Map();
  const rows = await listing_variants.findAll({
    where: { id: ids },
    attributes: ['id', 'listing_id', 'option_values', 'price', 'stock_qty', 'is_available'],
  });
  return new Map(rows.map((v) => [v.id, v.get({ plain: true })]));
};

/** "2x T-shirt (M / Navy)" for chat and push summaries. */
const lineText = (it) => `${it.quantity}x ${it.item_name}${it.variant_label ? ` (${it.variant_label})` : ''}`;

/**
 * Cancelling an order puts back what it took from counted listings, once: the lines'
 * stock_deducted is read and zeroed in one statement (row-locked), so a second cancel finds
 * nothing to restock. Listings no longer counted are skipped. Variant lines go back to their
 * variant (skipped when the variant was deleted); a listing that has variants by now never
 * takes back units of a simple line.
 */
async function restockOrder(orderId, transaction) {
  const [lines] = await sequelize.query(
    `WITH taken AS (
       SELECT id, listing_id, variant_id, variant_label, stock_deducted FROM order_items
        WHERE order_id = :orderId AND stock_deducted > 0
        FOR UPDATE
     )
     UPDATE order_items oi SET stock_deducted = 0, "updatedAt" = now()
       FROM taken WHERE oi.id = taken.id
     RETURNING taken.listing_id, taken.variant_id, taken.variant_label, taken.stock_deducted`,
    { replacements: { orderId }, transaction }
  );
  const variantListings = new Set();
  // A variant line whose variant was deleted since (variant_id set to NULL, label kept) has
  // nowhere to go back to: never restock it into the listing as a simple item
  const restockable = lines.filter((l) => l.variant_id || !l.variant_label);
  for (const { listing_id, variant_id, quantity } of planRestock(restockable)) {
    if (variant_id) {
      await sequelize.query(
        `UPDATE listing_variants v SET stock_qty = v.stock_qty + :q, is_available = true, "updatedAt" = now()
           FROM shop_listings l
          WHERE v.id = :vid AND l.id = v.listing_id AND l.stock_mode = 'tracked' AND v.stock_qty IS NOT NULL`,
        { replacements: { vid: variant_id, q: quantity }, transaction }
      );
      variantListings.add(listing_id);
      continue;
    }
    await sequelize.query(
      `UPDATE shop_listings SET stock_qty = stock_qty + :q, is_available = true, "updatedAt" = now()
        WHERE id = :id AND stock_mode = 'tracked' AND variant_axes = '[]'::jsonb`,
      { replacements: { id: listing_id, q: quantity }, transaction }
    );
  }
  await refreshListingsFromVariants([...variantListings], { transaction });
}

// Orders a delivery partner can take before anyone has claimed them
const CLAIMABLE_STATUSES = ['open_to_delivery', 'accepted', 'packed', 'ready_for_pickup'];

// 3. Get shop's incoming orders (Merchant side - resilient for store dashboard). Owner or admin only.
router.get('/shop/:shop_id', authMiddleware, async (req, res) => {
  try {
    const { shop_id } = req.params;
    const { user_id } = req.headers;
    const shop = await shops.findByPk(shop_id, { attributes: ['id', 'owner_id'] });
    if (!shop) {
      return res.status(404).json({ success: false, error: 'Shop not found' });
    }
    if (!isAdminReq(req) && !(shop.owner_id && shop.owner_id === user_id)) {
      return res.status(403).json({ success: false, error: 'Only the shop owner can view these orders' });
    }
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
      items: rawItems,
      delivery_address_id,
      shop_upi_id,
    } = req.body;
    // platform_fee / delivery_fee in the body are ignored: fees come from platform settings

    if (!shop_id || !rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ error: 'Shop ID and non-empty items array are required' });
    }
    if (rawItems.some((it) => !it || typeof it !== 'object' || Array.isArray(it))) {
      return res.status(400).json({ success: false, error: 'Each item must be an object with listing_id and quantity' });
    }
    // Ids are matched against what Postgres returns (lower-case UUIDs)
    const lowerId = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v);
    const items = rawItems.map((it) => ({ ...it, listing_id: lowerId(it.listing_id), variant_id: lowerId(it.variant_id) }));
    // Any other value would skip the delivery fee and the enable_delivery switch
    if (!['delivery', 'pickup', 'service'].includes(order_type)) {
      return res.status(400).json({ success: false, error: 'Unknown order type' });
    }

    const shop = await shops.findByPk(shop_id);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Prices and names come from this shop's own listings, never from the request body
    const UUID_RE_LISTING = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const listingIds = [...new Set(items.map((it) => it.listing_id).filter((v) => UUID_RE_LISTING.test(String(v || ''))))];
    const shopListings = listingIds.length
      ? await shop_listings.findAll({
          where: { id: listingIds, shop_id },
          attributes: LISTING_STOCK_ATTRS,
        })
      : [];
    const listingById = new Map(shopListings.map((l) => [l.id, l]));
    if (items.some((it) => !listingById.has(it.listing_id))) {
      return res.status(400).json({
        success: false,
        error: 'One or more items are not sold by this shop. Please refresh your cart.',
      });
    }

    // Listings with variants: every line names one of the listing's variants, whose price
    // and stock apply. Simple listings take no variant.
    const variantIds = [...new Set(items.map((it) => it.variant_id).filter((v) => UUID_RE_LISTING.test(String(v || ''))))];
    const variantById = await variantsByIds(variantIds);
    for (const it of items) {
      const listing = listingById.get(it.listing_id);
      const hasId = it.variant_id !== undefined && it.variant_id !== null && it.variant_id !== '';
      if (hasVariants(listing)) {
        if (!hasId) {
          return res.status(400).json({
            success: false,
            code: 'variant_required',
            listing_id: listing.id,
            error: `Choose an option for ${listing.name}. Please refresh your cart.`,
          });
        }
        const variant = variantById.get(String(it.variant_id));
        if (!variant || variant.listing_id !== listing.id) {
          return res.status(400).json({
            success: false,
            code: 'variant_not_found',
            listing_id: listing.id,
            variant_id: it.variant_id,
            error: `An option of ${listing.name} is no longer sold. Please refresh your cart.`,
          });
        }
      } else if (hasId) {
        return res.status(400).json({
          success: false,
          code: 'variant_not_found',
          listing_id: listing.id,
          variant_id: it.variant_id,
          error: `${listing.name} has no options any more. Please refresh your cart.`,
        });
      }
    }

    // Calculate subtotal
    let itemsTotal = 0;
    const validatedItems = items.map((it) => {
      const listing = listingById.get(it.listing_id);
      const variant = hasVariants(listing) ? variantById.get(String(it.variant_id)) : null;
      const unit_price = parseFloat(variant ? variant.price : listing.price) || 0;
      // Positive whole number only: a negative quantity would make the server total go negative
      const quantity = Math.max(1, parseInt(it.quantity) || 1);
      const subtotal = unit_price * quantity;
      itemsTotal += subtotal;
      return {
        listing_id: listing.id,
        item_name: listing.name || 'Item',
        unit_price,
        quantity,
        subtotal,
        ...(variant
          ? { variant_id: variant.id, variant_label: variantLabel(axesOf(listing), variant.option_values) || null }
          : {}),
      };
    });

    // Stock: unavailable items and counted items with too few units stop the order
    const stockPlan = planOrderStock(validatedItems, listingById, variantById);
    if (stockPlan.short.length) {
      return res.status(409).json(outOfStockBody(stockPlan.short));
    }

    // Order rules and fees from Admin > Platform configuration (maintenance, delivery switch,
    // minimum order, delivery distance, platform + delivery fees)
    const platformSettings = await getPlatformSettings();
    const block = orderBlock({ orderType: order_type, itemsTotal }, platformSettings);
    if (block) {
      return res.status(block.status).json(block.body);
    }

    const maxDeliveryKm = Number(platformSettings.max_delivery_radius_km) || 0;
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (
      order_type === 'delivery' &&
      maxDeliveryKm > 0 &&
      UUID_RE.test(String(delivery_address_id || '')) &&
      shop.latitude != null &&
      shop.longitude != null
    ) {
      const addr = await user_addresses.findOne({ where: { id: delivery_address_id, user_id } });
      if (addr && addr.latitude != null && addr.longitude != null) {
        const km = distanceKm(shop.latitude, shop.longitude, addr.latitude, addr.longitude);
        if (km > maxDeliveryKm) {
          const msg = `${shop.shop_name || 'This store'} delivers within ${maxDeliveryKm} km and this address is about ${km.toFixed(1)} km away. Choose self-pickup or a closer address.`;
          return res.status(400).json({ success: false, code: 'OUT_OF_DELIVERY_RANGE', error: msg, message: msg });
        }
      }
    }

    // Total = items + platform fee + delivery fee (what the customer pays)
    const {
      platformFee: parsedPlatformFee,
      deliveryFee: parsedDeliveryFee,
      total: totalAmount,
    } = computeOrderFees({ itemsTotal, orderType: order_type }, platformSettings);
    const orderNumber = `RQ-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    // Order, its lines and the stock decrement commit together. Each counted listing is
    // decremented only if it still has enough units; otherwise everything rolls back.
    let newOrder;
    try {
      newOrder = await sequelize.transaction(async (transaction) => {
        const created = await orders.create(
          {
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
          },
          { transaction }
        );

        await order_items.bulkCreate(
          validatedItems.map((it, index) => ({
            ...it,
            order_id: created.id,
            stock_deducted: stockPlan.lineDeducted[index] || 0,
          })),
          { transaction }
        );

        // Fixed order (by unit) so two orders never wait on each other's rows
        const deductions = [...stockPlan.deductions].sort((a, b) =>
          String(stockUnitKey(a)).localeCompare(String(stockUnitKey(b)))
        );
        const variantListings = new Set();
        for (const { listing_id, variant_id, quantity } of deductions) {
          if (variant_id) {
            // The variant's count; its listing's denormalised stock is refreshed below
            const [rows] = await sequelize.query(
              `UPDATE listing_variants v
                  SET stock_qty = v.stock_qty - :q, is_available = (v.stock_qty - :q) > 0, "updatedAt" = now()
                 FROM shop_listings l
                WHERE v.id = :vid AND v.listing_id = :id AND l.id = v.listing_id AND l.stock_mode = 'tracked'
                  AND v.stock_qty >= :q
                RETURNING v.id`,
              { replacements: { id: listing_id, vid: variant_id, q: quantity }, transaction }
            );
            if (!rows.length) throw new OutOfStockError(listing_id, variant_id);
            variantListings.add(listing_id);
            continue;
          }
          const [rows] = await sequelize.query(
            `UPDATE shop_listings
                SET stock_qty = stock_qty - :q, is_available = (stock_qty - :q) > 0, "updatedAt" = now()
              WHERE id = :id AND stock_mode = 'tracked' AND stock_qty >= :q
              RETURNING id`,
            { replacements: { id: listing_id, q: quantity }, transaction }
          );
          if (!rows.length) throw new OutOfStockError(listing_id);
        }
        await refreshListingsFromVariants([...variantListings], { transaction });
        return created;
      });
    } catch (err) {
      if (!(err instanceof OutOfStockError)) throw err;
      // Someone else bought the last units meanwhile: report the current stock
      const fresh = await shop_listings.findAll({
        where: { id: listingIds, shop_id },
        attributes: LISTING_STOCK_ATTRS,
      });
      const freshVariants = await variantsByIds(variantIds);
      const short = planOrderStock(validatedItems, new Map(fresh.map((l) => [l.id, l])), freshVariants).short;
      const fallback = {
        listing_id: err.listingId,
        ...(err.variantId ? { variant_id: err.variantId } : {}),
        name: listingById.get(err.listingId)?.name || null,
        requested: 0,
        available: 0,
      };
      return res.status(409).json(outOfStockBody(short.length ? short : [fallback]));
    }

    // Automated chat notification to shop owner on self-pickup order or service booking
    if (shop.owner_id) {
      try {
        const itemsSummary = validatedItems.map(lineText).join(', ');
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

    // 1. Dispatch Push Notification to Customer
    try {
      const itemsSummary = validatedItems.map(lineText).join(', ');
      await sendPushNotification({
        userId: user_id,
        title: `🛍️ Order Placed! #${orderNumber}`,
        body: `Your order for ${itemsSummary} (₹${totalAmount}) at ${shop.shop_name} has been placed successfully!`,
        type: 'order_placed',
        data: {
          orderId: newOrder.id,
          orderNumber,
          shopId: shop.id,
          shopName: shop.shop_name,
          totalAmount,
          orderType: order_type,
          url: '/orders',
        },
      });
    } catch (customerPushErr) {
      console.warn('Customer order push failed:', customerPushErr.message);
    }

    // 2. Dispatch Push Notification to Merchant / Shop Owner
    if (shop.owner_id) {
      try {
        const isSelfPickup = order_type === 'pickup';
        const isService = order_type === 'service';
        const orderTypeLabel = isSelfPickup ? 'Self-Pickup' : isService ? 'Service' : 'Delivery';
        const itemsSummary = validatedItems.map(lineText).join(', ');
        await sendPushNotification({
          userId: shop.owner_id,
          title: `🔔 New ${orderTypeLabel} Order #${orderNumber}!`,
          body: `New ${orderTypeLabel} order received for ₹${totalAmount} (${itemsSummary}) from ${customer_phone || 'Customer'}.`,
          type: 'order_placed',
          data: {
            orderId: newOrder.id,
            orderNumber,
            shopId: shop.id,
            shopName: shop.shop_name,
            totalAmount,
            orderType: order_type,
            url: '/client',
          },
        });
      } catch (merchantPushErr) {
        console.warn('Merchant order push failed:', merchantPushErr.message);
      }
    }

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
    const { Op } = require('sequelize');

    if (!isAdminReq(req)) {
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

    // Shop owner and platform admin manage the order. The customer may only cancel their own order,
    // and the assigned delivery partner may only mark it out for delivery or delivered.
    const { user_id } = req.headers;
    const isShopOwner = Boolean(order.shop?.owner_id) && order.shop.owner_id === user_id;
    const isCustomerCancel = order.customer_id === user_id && status === 'cancelled';
    const isDriverUpdate =
      Boolean(order.delivery_partner_id) &&
      order.delivery_partner_id === user_id &&
      ['out_for_delivery', 'completed'].includes(status);
    if (!isAdminReq(req) && !isShopOwner && !isCustomerCancel && !isDriverUpdate) {
      return res.status(403).json({ success: false, error: 'You are not allowed to change this order status' });
    }

    if (!canMoveOrder(order.status, status)) {
      return res.status(409).json({
        success: false,
        error: `Order cannot move from ${order.status} to ${status}`,
      });
    }

    // Every status move re-checks the status under a row lock in the same transaction, so a
    // concurrent change (a cancel that restocks, say) waits and then sees the final status.
    // Cancelled and completed orders fail the check, so the restock runs once.
    const outcome = await sequelize.transaction(async (transaction) => {
      const locked = await orders.findByPk(order.id, { attributes: ['id', 'status'], transaction, lock: transaction.LOCK.UPDATE });
      if (!locked || !canMoveOrder(locked.status, status)) return { conflict: locked ? locked.status : order.status };
      order.status = status;
      if (shop_upi_id) order.shop_upi_id = shop_upi_id;
      if (delivery_notes) order.delivery_notes = delivery_notes;
      await order.save({ transaction });
      if (status === 'cancelled') await restockOrder(order.id, transaction);
      return { from: locked.status };
    });
    if (outcome.conflict) {
      return res.status(409).json({ success: false, error: `Order cannot move from ${outcome.conflict} to ${status}` });
    }
    const previousStatus = outcome.from;

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

    // Dispatch Push Notification to Customer on Order Status Change
    if (previousStatus !== status && order.customer_id) {
      try {
        const notifInfo = getOrderStatusNotification(status, order.order_number, order.shop?.shop_name);
        await sendPushNotification({
          userId: order.customer_id,
          title: notifInfo.title,
          body: notifInfo.body,
          type: 'order_status_change',
          data: {
            orderId: order.id,
            orderNumber: order.order_number,
            status,
            previousStatus,
            shopId: order.shop_id,
            shopName: order.shop?.shop_name,
            url: '/orders',
          },
        });
      } catch (statusPushErr) {
        console.warn('Status change push notification failed:', statusPushErr.message);
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
        { model: users, as: 'customer', attributes: ['mobile'] },
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

    const order = await orders.findByPk(id, { attributes: ['id', 'order_type', 'status', 'delivery_partner_id'] });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    if (order.order_type !== 'delivery') {
      return res.status(409).json({ success: false, error: 'Only delivery orders can be claimed' });
    }
    if (order.delivery_partner_id) {
      return res.status(409).json({ success: false, error: 'Order has already been claimed by a delivery partner' });
    }
    if (!CLAIMABLE_STATUSES.includes(order.status)) {
      return res.status(409).json({ success: false, error: `Order is ${order.status} and cannot be claimed` });
    }

    // Conditional update: only one partner can win the race for an unassigned order
    const [claimedRows] = await orders.update(
      {
        delivery_partner_id: user_id,
        status: orders.sequelize.literal(
          "CASE WHEN status = 'ready_for_pickup' THEN 'out_for_delivery' ELSE status END"
        ),
      },
      {
        where: {
          id,
          order_type: 'delivery',
          delivery_partner_id: null,
          status: CLAIMABLE_STATUSES,
        },
      }
    );
    if (claimedRows === 0) {
      return res.status(409).json({ success: false, error: 'Order has already been claimed or is no longer available' });
    }

    const updated = await orders.findByPk(id, {
      include: [
        { model: order_items, as: 'items' },
        { model: shops, as: 'shop', attributes: ['id', 'shop_name', 'mobile_number', 'address', 'latitude', 'longitude'] },
        { model: users, as: 'customer', attributes: ['id', 'username', 'mobile'] },
        { model: users, as: 'delivery_partner', attributes: ['id', 'username', 'mobile'] },
      ],
    });

    // Dispatch Push Notifications for Claim Delivery
    try {
      if (updated.customer_id) {
        await sendPushNotification({
          userId: updated.customer_id,
          title: `🛵 Delivery Partner Claimed #${updated.order_number}!`,
          body: `A delivery partner has claimed your order #${updated.order_number} and is en route to ${updated.shop?.shop_name || 'the store'}.`,
          type: 'order_status_change',
          data: {
            orderId: updated.id,
            orderNumber: updated.order_number,
            status: updated.status,
            url: '/orders',
          },
        });
      }
      if (updated.shop?.owner_id) {
        await sendPushNotification({
          userId: updated.shop.owner_id,
          title: `🛵 Delivery Partner Assigned #${updated.order_number}`,
          body: `A delivery partner has claimed order #${updated.order_number} for delivery.`,
          type: 'order_status_change',
          data: {
            orderId: updated.id,
            orderNumber: updated.order_number,
            status: updated.status,
            url: '/client',
          },
        });
      }
    } catch (claimPushErr) {
      console.warn('Claim delivery push notification failed:', claimPushErr.message);
    }

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

    // Dispatch Push Notification to Merchant on Switch to Pickup
    try {
      const shopObj = await shops.findByPk(order.shop_id);
      if (shopObj?.owner_id) {
        await sendPushNotification({
          userId: shopObj.owner_id,
          title: `📦 Order #${order.order_number} Switched to Self-Pickup`,
          body: `Customer switched order #${order.order_number} to Counter Self-Pickup.`,
          type: 'order_status_change',
          data: {
            orderId: order.id,
            orderNumber: order.order_number,
            url: '/client',
          },
        });
      }
    } catch (switchPushErr) {
      console.warn('Switch pickup push notification failed:', switchPushErr.message);
    }

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

