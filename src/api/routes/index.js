const express = require('express');
const shopsRouter = require('./shops');

const router = express.Router();

router.use('/shops', shopsRouter);

module.exports = router;
