const express = require('express');
const {
  create,
  getAll,
  getAllUsers,
  markIsRead,
  getAllShops,
  deleteChat,
  getUnreadCount,
} = require('./chats');

const router = express.Router();

router.post('/create', create);
router.post('/getAll', getAll);
router.post('/getAllUsers', getAllUsers);
router.post('/markAll', markIsRead);
router.post('/getAllShops', getAllShops);
router.post('/delete', deleteChat);
router.get('/unreadCount', getUnreadCount);
router.post('/unreadCount', getUnreadCount);

module.exports = router;
