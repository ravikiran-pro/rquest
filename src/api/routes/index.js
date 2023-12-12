const express = require('express');
const shopsRouter = require('./shops');
const userRouter = require('./user');

const router = express.Router();

router.use('/shops', shopsRouter);
router.use('/user', userRouter);

module.exports = router;
