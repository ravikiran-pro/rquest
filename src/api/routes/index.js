const express = require('express');
const shopsRouter = require('./shops');
const userRouter = require('./user');
const chatRouter = require('./chats');
const masterRouter = require('./master');
const { authMiddleware } = require('../auth');

const router = express.Router();

router.use('/shops', shopsRouter);
router.use('/user', userRouter);
router.use('/master', masterRouter);
router.use(authMiddleware);

router.use('/chat', chatRouter);

module.exports = router;
