const express = require('express');
const { getShopsFilter } = require('./search');

const router = express.Router();

router.post('/search', getShopsFilter);

module.exports = router;
