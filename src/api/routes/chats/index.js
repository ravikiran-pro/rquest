const express = require('express');
const multer = require('multer');
const {
  create,
  getAll,
  getAllUsers,
  markIsRead,
  getAllShops,
  deleteChat,
  getUnreadCount,
  uploadChatAttachment,
} = require('./chats');

const router = express.Router();

const upload = multer({
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
}).fields([
  { name: 'file', maxCount: 1 },
  { name: 'fileData', maxCount: 1 },
]);

router.post('/upload', upload, uploadChatAttachment);
router.post('/create', create);
router.post('/getAll', getAll);
router.post('/getAllUsers', getAllUsers);
router.post('/markAll', markIsRead);
router.post('/getAllShops', getAllShops);
router.post('/delete', deleteChat);
router.get('/unreadCount', getUnreadCount);
router.post('/unreadCount', getUnreadCount);

module.exports = router;
