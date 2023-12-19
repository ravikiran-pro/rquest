const express = require('express');
const { create, getAll, getAllUsers, markIsRead } = require('./chats');

const router = express.Router();

router.post('/create', create);
router.post('/getAll', getAll);
router.post('/getAllUsers', getAllUsers);
router.post('/markAll', markIsRead);

module.exports = router;
