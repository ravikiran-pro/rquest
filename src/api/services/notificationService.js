const webpush = require('web-push');
const { emitToUser } = require('../socket');
const { notifications, push_subscriptions } = require('../models');

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BPToI8j6lzYpqSQfAWAQqHYRlAgoI0FQG2Fn_ERluEsxkCoV98cm6I6MObPcyWWw_wrHcVlxLc4mcqUDnTLui0I';
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  'XSqY8pOHC24nCXAVHQlDRu-mARpOWaDrTuWBMLhmnMg';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@rquest.app';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (vapidErr) {
  console.warn('Failed to configure WebPush VAPID details:', vapidErr.message);
}

/**
 * Returns formatted status title and friendly message for order updates
 */
const getOrderStatusNotification = (status, orderNumber, shopName = 'Store') => {
  const shortNum = orderNumber ? `#${orderNumber}` : '';
  const titles = {
    placed: `📋 Order Placed ${shortNum}`,
    order_prepare: `👨‍🍳 Store Preparing Order ${shortNum}`,
    preparing: `👨‍🍳 Order Being Prepared ${shortNum}`,
    accepted: `✅ Order Accepted ${shortNum}`,
    packed: `📦 Order Packed & Ready ${shortNum}`,
    ready_for_pickup: `🎉 Ready for Pickup! ${shortNum}`,
    open_to_delivery: `🚚 Open to Delivery Network ${shortNum}`,
    out_for_delivery: `🛵 Out for Delivery! ${shortNum}`,
    completed: `✨ Order Completed ${shortNum}`,
    cancelled: `❌ Order Cancelled ${shortNum}`,
  };

  const descriptions = {
    placed: `Your order ${shortNum} has been recorded and sent to ${shopName}.`,
    order_prepare: `${shopName} has accepted your order ${shortNum} and started preparation!`,
    preparing: `${shopName} is actively preparing your items.`,
    accepted: `${shopName} confirmed your order ${shortNum}.`,
    packed: `Your order ${shortNum} is packed and ready.`,
    ready_for_pickup: `Your order ${shortNum} is waiting at ${shopName} counter. Show your PIN/number to collect!`,
    open_to_delivery: `Order ${shortNum} is verified and awaiting driver pickup.`,
    out_for_delivery: `A delivery partner has picked up order ${shortNum} and is heading your way!`,
    completed: `Order ${shortNum} has been delivered. Thank you for shopping directly with local stores!`,
    cancelled: `Order ${shortNum} was cancelled by ${shopName}.`,
  };

  return {
    title: titles[status] || `Order Update: ${status} ${shortNum}`,
    body: descriptions[status] || `Your order ${shortNum} status has changed to ${status}.`,
  };
};

/**
 * Primary dispatch function:
 * 1. Emits real-time Socket.io push_notification event
 * 2. Sends native Web Push through browser Push Service
 * 3. Persists record in PostgreSQL notifications table
 */
const sendPushNotification = async ({
  userId,
  title,
  body,
  type = 'general',
  data = {},
  icon = '/images/logo.png',
}) => {
  if (!userId) {
    console.warn('[NotificationService] Missing userId for push notification');
    return null;
  }

  const payload = {
    title,
    body,
    type,
    data,
    icon,
    createdAt: new Date().toISOString(),
  };

  // 1. Deliver via Socket.io real-time connection if user has active session
  try {
    emitToUser(userId, 'push_notification', payload);
  } catch (socketErr) {
    console.warn('[NotificationService] Socket delivery failed:', socketErr.message);
  }

  // 2. Deliver via Web Push (browser/OS background notification)
  try {
    const subscriptions = await push_subscriptions.findAll({
      where: { user_id: userId },
    });

    if (subscriptions && subscriptions.length > 0) {
      const pushPayload = JSON.stringify({
        title,
        body,
        icon,
        type,
        data,
      });

      const sendPromises = subscriptions.map(async (subRecord) => {
        const pushConfig = {
          endpoint: subRecord.endpoint,
          keys: {
            p256dh: subRecord.p256dh,
            auth: subRecord.auth,
          },
        };

        try {
          await webpush.sendNotification(pushConfig, pushPayload);
        } catch (pushErr) {
          // If subscription has expired or unsubscribed, remove from DB
          if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
            console.log(`[NotificationService] Pruning expired subscription: ${subRecord.endpoint}`);
            await subRecord.destroy().catch(() => {});
          } else {
            console.warn('[NotificationService] WebPush delivery warning:', pushErr.message);
          }
        }
      });

      await Promise.allSettled(sendPromises);
    }
  } catch (webPushErr) {
    console.warn('[NotificationService] WebPush batch failed:', webPushErr.message);
  }

  // 3. Persist notification in database for in-app notification center / history
  let savedRecord = null;
  try {
    savedRecord = await notifications.create({
      user_id: userId,
      title,
      body,
      type,
      data,
      is_read: false,
    });
  } catch (dbErr) {
    console.warn('[NotificationService] DB save notification failed:', dbErr.message);
  }

  return savedRecord;
};

/**
 * Register or update web push subscription for user
 */
const subscribeUser = async (userId, subscription) => {
  if (!subscription || !subscription.endpoint) {
    throw new Error('Valid subscription object with endpoint is required');
  }

  const endpoint = subscription.endpoint;
  const p256dh = subscription.keys?.p256dh || null;
  const auth = subscription.keys?.auth || null;

  const [record, created] = await push_subscriptions.findOrCreate({
    where: { endpoint },
    defaults: {
      user_id: userId || null,
      endpoint,
      p256dh,
      auth,
    },
  });

  if (!created) {
    record.user_id = userId || record.user_id;
    record.p256dh = p256dh || record.p256dh;
    record.auth = auth || record.auth;
    await record.save();
  }

  return record;
};

/**
 * Remove web push subscription
 */
const unsubscribeUser = async (userId, endpoint) => {
  if (!endpoint) return false;
  const deleted = await push_subscriptions.destroy({
    where: {
      endpoint,
      ...(userId ? { user_id: userId } : {}),
    },
  });
  return deleted > 0;
};

module.exports = {
  VAPID_PUBLIC_KEY,
  sendPushNotification,
  getOrderStatusNotification,
  subscribeUser,
  unsubscribeUser,
};

