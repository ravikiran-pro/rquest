const express = require('express');
const { create, getAll, getAllUsers } = require('./chats');

const router = express.Router();

router.post('/create', create);
router.post('/getAll', getAll);
router.post('/getAllUsers', getAllUsers);

module.exports = router;
