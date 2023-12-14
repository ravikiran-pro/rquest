const express = require('express');
const shopsRouter = require('./shops');
const userRouter = require('./user');
const chatRouter = require('./chats');
const { authMiddleware } = require('../auth');

const router = express.Router();

router.use('/shops', shopsRouter);
router.use('/user', userRouter);

router.use(authMiddleware);

router.use('/chat', chatRouter);

module.exports = router;
