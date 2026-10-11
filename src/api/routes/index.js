const express = require('express');
const shopsRouter = require('./shops');
const userRouter = require('./user');
const chatRouter = require('./chats');
const masterRouter = require('./master');
const listingsRouter = require('./listings');
const ordersRouter = require('./orders');
const quotesRouter = require('./quotes');
const { authMiddleware } = require('../auth');

const router = express.Router();

router.use('/shops', shopsRouter);
router.use('/user', userRouter);
router.use('/master', masterRouter);
router.use('/listings', listingsRouter);
router.use('/orders', ordersRouter);
router.use('/quotes', quotesRouter);

router.use(authMiddleware);

router.use('/chat', chatRouter);

module.exports = router;
