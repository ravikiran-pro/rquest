const express = require('express');
const shopsRouter = require('./shops');
const userRouter = require('./user');
const chatRouter = require('./chats');
const masterRouter = require('./master');
const listingsRouter = require('./listings');
const ordersRouter = require('./orders');
const quotesRouter = require('./quotes');
const locationRouter = require('./location');
const notificationsRouter = require('./notifications');
const aiRouter = require('./ai');
const platformRouter = require('./platform');
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
router.use('/orders', ordersRouter);
router.use('/quotes', quotesRouter);
router.use('/notifications', notificationsRouter);

router.use(authMiddleware);

router.use('/chat', chatRouter);

// AI gateway (voice / ocr / smart-search) — authenticated; these calls cost money.
router.use('/ai', aiRouter);

module.exports = router;
