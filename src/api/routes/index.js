const express = require('express');
const shopsRouter = require('./shops');
const userRouter = require('./user');
const chatRouter = require('./chats');
const masterRouter = require('./master');
const listingsRouter = require('./listings');
const sectionsRouter = require('./sections');
const formsRouter = require('./forms');
const ordersRouter = require('./orders');
const quotesRouter = require('./quotes');
const locationRouter = require('./location');
const notificationsRouter = require('./notifications');
const { VAPID_PUBLIC_KEY } = require('../services/notificationService');
const aiRouter = require('./ai');
const platformRouter = require('./platform');
const catalogRouter = require('./catalog');
const { requireFeature } = require('../services/platformSettings');
const { authMiddleware } = require('../auth');

const router = express.Router();

// Platform configuration (public GET, admin PUT) and the feature switches it controls
router.use('/platform', platformRouter);
router.post('/quotes', requireFeature('enable_quotes', { pauseInMaintenance: true }));
router.post('/chat/create', requireFeature('enable_chat'));
router.use('/ai', requireFeature('enable_ai_search'));

router.use('/location', locationRouter);
router.use('/shops', shopsRouter);
router.use('/user', userRouter);
router.use('/master', masterRouter);
router.use('/listings', listingsRouter);
// Storefront sections (public GET /shop/:id; the rest checks auth itself) and store forms (owner)
router.use('/sections', sectionsRouter);
router.use('/forms', formsRouter);
router.use('/orders', ordersRouter);
router.use('/quotes', quotesRouter);
// Public VAPID key for service-worker registration (no user context needed)
router.get('/notifications/vapid-key', (req, res) => {
  res.status(200).json({ success: true, publicKey: VAPID_PUBLIC_KEY });
});
// Master catalog: owner search/import, and the admin catalog console (each route checks its own auth)
router.use('/catalog', catalogRouter);

router.use(authMiddleware);

// Notifications need the verified user: authMiddleware copies user_id from the JWT into req.headers.
router.use('/notifications', notificationsRouter);

router.use('/chat', chatRouter);

// AI gateway (voice / ocr / smart-search) — authenticated; these calls cost money.
router.use('/ai', aiRouter);

module.exports = router;
