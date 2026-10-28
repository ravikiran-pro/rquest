const express = require('express');
const {
  VAPID_PUBLIC_KEY,
  subscribeUser,
  unsubscribeUser,
  sendPushNotification,
} = require('../../services/notificationService');
const { notifications } = require('../../models');

const router = express.Router();

/**
 * 1. Get Public VAPID Key for browser service worker registration
 */
router.get('/vapid-key', (req, res) => {
  res.status(200).json({
    success: true,
    publicKey: VAPID_PUBLIC_KEY,
  });
});

/**
 * 2. Save / update Web Push subscription
 */
router.post('/subscribe', async (req, res) => {
  try {
    const userId = req.headers.user_id || req.body.user_id || null;
    const subscription = req.body.subscription || req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        success: false,
        error: 'Subscription with endpoint is required',
      });
    }

    const saved = await subscribeUser(userId, subscription);
    res.status(200).json({
      success: true,
      message: 'Push subscription registered successfully',
      data: saved,
    });
  } catch (err) {
    console.error('Error saving push subscription:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to save push subscription',
    });
  }
});

/**
 * 3. Unsubscribe Web Push endpoint
 */
router.post('/unsubscribe', async (req, res) => {
  try {
    const userId = req.headers.user_id || req.body.user_id || null;
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        error: 'Endpoint is required',
      });
    }

    await unsubscribeUser(userId, endpoint);
    res.status(200).json({
      success: true,
      message: 'Unsubscribed successfully',
    });
  } catch (err) {
    console.error('Error unsubscribing:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to unsubscribe',
    });
  }
});

/**
 * 4. Get notification list for current user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.headers.user_id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to view notifications',
      });
    }

    const userNotifications = await notifications.findAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    const unreadCount = userNotifications.filter((n) => !n.is_read).length;

    res.status(200).json({
      success: true,
      data: userNotifications,
      unreadCount,
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
    });
  }
});

/**
 * 5. Mark single notification as read
 */
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers.user_id;

    const notif = await notifications.findOne({
      where: { id, ...(userId ? { user_id: userId } : {}) },
    });

    if (!notif) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    notif.is_read = true;
    await notif.save();

    res.status(200).json({
      success: true,
      data: notif,
    });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification',
    });
  }
});

/**
 * 6. Mark all notifications as read for current user
 */
router.put('/read-all', async (req, res) => {
  try {
    const userId = req.headers.user_id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    await notifications.update(
      { is_read: true },
      { where: { user_id: userId, is_read: false } }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (err) {
    console.error('Error marking all notifications read:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notifications read',
    });
  }
});

/**
 * 7. Send a test push notification to verify setup
 */
router.post('/test', async (req, res) => {
  try {
    const userId = req.headers.user_id || req.body.user_id;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required',
      });
    }

    const { title = '🔔 Test Notification', body = 'Push notification system is working perfectly on Rquest!' } = req.body;

    const sent = await sendPushNotification({
      userId,
      title,
      body,
      type: 'test',
      data: { test: true, timestamp: Date.now() },
    });

    res.status(200).json({
      success: true,
      message: 'Test notification dispatched',
      data: sent,
    });
  } catch (err) {
    console.error('Error sending test notification:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to dispatch test notification',
    });
  }
});

module.exports = router;

