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
const catalogRouter = require('./catalog');
const { authMiddleware } = require('../auth');

const router = express.Router();

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

// Master catalog (catalog.* schema) — platform admin only.
router.use('/catalog', catalogRouter);

// AI gateway (voice / ocr / smart-search) — authenticated; these calls cost money.
router.use('/ai', aiRouter);

module.exports = router;
