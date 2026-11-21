const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');
const { chats, users, shops } = require('../../models');
const { Op, literal } = require('sequelize');
const { isUserOnline, emitToUser } = require('../../socket');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const detectMessageType = (chatDetails) => {
  if (chatDetails.message_type && chatDetails.message_type !== 'text') {
    return chatDetails.message_type;
  }
  const msg = chatDetails.message || '';
  if (
    msg.startsWith('🚚 Store Update') ||
    msg.startsWith('🎉 Store Update') ||
    msg.startsWith('✅ Store Update') ||
    msg.startsWith('👨‍🍳 Store Update') ||
    msg.startsWith('🛵 Store Update') ||
    msg.startsWith('❌ Store Update') ||
    msg.startsWith('📋 Store Update') ||
    msg.includes('New Delivery Order') ||
    msg.includes('New Self-Pickup Order') ||
    msg.includes('New Service Booking') ||
    msg.startsWith('Customer Pre-order Inquiry')
  ) {
    return 'order_update';
  }
  return 'custom';
};

const uploadChatAttachment = async (req, res) => {
  try {
    const file = req.file || (req.files && (req.files.file?.[0] || req.files.fileData?.[0]));
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Validate mime type: images and pdf only
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'application/pdf',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only images (PNG, JPG, WebP, GIF, SVG) and PDF documents are allowed.',
      });
    }

    // Max 15MB
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds maximum allowed limit of 15MB.',
      });
    }

    const isPdf = file.mimetype === 'application/pdf';
    const ext = path.extname(file.originalname) || (isPdf ? '.pdf' : '.jpg');
    const safeBaseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueKey = `${uuidv4()}-${safeBaseName}${ext}`;

    let fileUrl = null;

    // Try AWS S3 first
    try {
      const s3Params = {
        Bucket: process.env.AWS_BUCKET_NAME || 'rquest',
        Key: `chat/${uniqueKey}`,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentDisposition: isPdf ? 'inline' : undefined,
      };
      const s3Res = await s3.upload(s3Params).promise();
      if (s3Res && s3Res.Location) {
        fileUrl = s3Res.Location;
      }
    } catch (s3Err) {
      console.warn('S3 upload unavailable, falling back to local storage:', s3Err.message);
    }

    // Fallback to local storage if S3 fails or is not configured
    if (!fileUrl) {
      const uploadsDir = path.join(__dirname, '../../../../uploads/chat');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const localFilePath = path.join(uploadsDir, uniqueKey);
      fs.writeFileSync(localFilePath, file.buffer);
      fileUrl = `/uploads/chat/${uniqueKey}`;
    }

    return res.status(200).json({
      success: true,
      data: {
        url: fileUrl,
        name: file.originalname,
        type: isPdf ? 'pdf' : 'image',
        size: file.size,
        mimeType: file.mimetype,
      },
    });
  } catch (err) {
    console.error('Chat attachment upload error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload attachment: ' + err.message,
    });
  }
};

const create = async (req, res) => {
  try {
    const result = await createChat(
      req.body,
      req.headers.user_id
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Chat creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || error,
      message: 'Data Insertion Failed',
    });
  }
};

const createChat = async (chatDetails, user_id) => {
  try {
    const currentUserId = user_id || chatDetails.sender_id;
    const detectedType = detectMessageType(chatDetails);
    const attachments = Array.isArray(chatDetails.attachments)
      ? chatDetails.attachments
      : chatDetails.attachment_url
      ? [
          {
            url: chatDetails.attachment_url,
            name: chatDetails.attachment_name || 'attachment',
            type: chatDetails.attachment_type || 'image',
            size: chatDetails.attachment_size || 0,
            mimeType: chatDetails.attachment_mime || '',
          },
        ]
      : [];

    const payload = {
      sender_id: chatDetails.sender_id,
      receiver_id: chatDetails.receiver_id,
      shop_id: chatDetails.shop_id,
      message: chatDetails.message || '',
      message_type: detectedType,
      attachments: attachments,
      is_read: false,
    };

    const created = await chats.create(payload);

    const fullChat = await chats.findOne({
      where: { id: created.id },
      include: [
        { model: users, as: 'sender', attributes: ['id', 'username'] },
        { model: users, as: 'receiver', attributes: ['id', 'username'] },
        { model: shops, as: 'shopChats', attributes: ['id', 'shop_name', 'owner_id'] },
      ],
    });

    const isSender = fullChat.sender_id === currentUserId;
    const otherUser = isSender ? fullChat.receiver : fullChat.sender;
    const otherUserId = isSender ? fullChat.receiver_id : fullChat.sender_id;
    const shop = fullChat.shopChats;
    const shopName = shop?.shop_name || '';
    const isCounterpartOwner = shop?.owner_id === otherUserId;
    const displayName = isCounterpartOwner && shopName
      ? shopName
      : otherUser?.username || 'User';

    const formatted = {
      id: fullChat.id,
      temp_id: chatDetails.temp_id || null,
      sender_id: fullChat.sender_id,
      receiver_id: fullChat.receiver_id,
      username: otherUser?.username || 'User',
      displayName: displayName,
      message: fullChat.message || '',
      message_type: fullChat.message_type || detectedType,
      attachments: fullChat.attachments || [],
      shop_id: fullChat.shop_id,
      shop_name: shopName,
      is_shop_owner: isCounterpartOwner,
      updatedAt: fullChat.updatedAt,
      createdAt: fullChat.createdAt,
      is_read: fullChat.is_read,
      is_deleted: fullChat.is_deleted || false,
    };

    // Emit real-time event to receiver's user room
    emitToUser(payload.receiver_id, 'receive_message', formatted);

    // Emit confirmation to sender's user room for multi-device sync
    emitToUser(payload.sender_id, 'message_sent', formatted);

    return formatted;
  } catch (err) {
    console.error('Error in createChat:', err);
    throw new Error('Message Failed: ' + err.message);
  }
};

const getAll = async (req, res) => {
  try {
    const { receiver_id, sender_id } = req.body;
    const user_id = req.headers.user_id || sender_id;
    const target_id = receiver_id || sender_id;

    let filter = {};
    if (target_id && user_id) {
      filter = {
        [Op.or]: [
          { sender_id: user_id, receiver_id: target_id },
          { sender_id: target_id, receiver_id: user_id },
        ],
      };
    } else if (user_id) {
      filter = {
        [Op.or]: [{ sender_id: user_id }, { receiver_id: user_id }],
      };
    }

    const resData = await chats.findAll({
      where: filter,
      include: [
        { model: users, as: 'sender', attributes: ['id', 'username'] },
        { model: users, as: 'receiver', attributes: ['id', 'username'] },
        { model: shops, as: 'shopChats', attributes: ['id', 'shop_name', 'owner_id'] },
      ],
      order: [['createdAt', 'ASC']],
    });

    res.status(200).json({
      success: true,
      data: resData,
    });
  } catch (error) {
    console.error('Chat getAll error:', error);
    res.status(500).json({
      success: false,
      error: error.message || error,
      message: 'Failed to retrieve chats',
    });
  }
};

const formatChat = async (allChats, user_id) => {
  const formattedChats = {};
  const userChatStatus = {};
  let totalUnread = 0;

  allChats.forEach((chat) => {
    const isSender = chat.sender_id === user_id;
    const otherUserId = isSender ? chat.receiver_id : chat.sender_id;
    const otherUser = isSender ? chat.receiver : chat.sender;
    const shop = chat.shopChats;
    const shopName = shop?.shop_name || '';

    if (!formattedChats[otherUserId]) {
      formattedChats[otherUserId] = [];
      userChatStatus[otherUserId] = {
        isOnline: isUserOnline(otherUserId),
      };
    }

    const isCounterpartOwner = shop?.owner_id === otherUserId;
    const displayName = isCounterpartOwner && shopName
      ? shopName
      : otherUser?.username || 'User';

    if (!chat.is_read && chat.receiver_id === user_id && !chat.is_deleted) {
      totalUnread++;
    }

    const msgType = detectMessageType(chat);

    formattedChats[otherUserId].push({
      id: chat.id,
      sender_id: chat.sender_id,
      receiver_id: chat.receiver_id,
      username: otherUser?.username || 'User',
      displayName: displayName,
      message: chat.message || '',
      message_type: chat.message_type && chat.message_type !== 'text' ? chat.message_type : msgType,
      attachments: chat.attachments || [],
      shop_id: chat.shop_id,
      shop_name: shopName,
      is_shop_owner: isCounterpartOwner,
      updatedAt: chat.updatedAt,
      createdAt: chat.createdAt,
      is_read: chat.is_read,
      is_deleted: chat.is_deleted || false,
    });
  });

  return { formattedChats, userChatStatus, totalUnread };
};

const getAllShops = async (req, res) => {
  try {
    const { user_id } = req.headers;

    const allshops = await chats.findAll({
      attributes: ['shop_id'],
      include: [
        {
          model: shops,
          as: 'shopChats',
          attributes: ['id', 'shop_name', 'owner_id'],
        },
      ],
      where: {
        [Op.or]: [{ sender_id: user_id }, { receiver_id: user_id }],
      },
      group: ['shop_id', 'shopChats.id', 'shopChats.shop_name', 'shopChats.owner_id'],
      having: literal('COUNT(chats.id) > 0'),
      order: [[literal('shop_id'), 'ASC']],
    });

    res.status(200).json({
      success: true,
      data: allshops,
    });
  } catch (error) {
    console.error('Error in getAllShops:', error);
    res.status(500).json({
      success: false,
      error: error,
      message: 'Internal server error',
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { user_id } = req.headers;
    const { shop_id } = req.body;

    const filter = {
      [Op.or]: [{ sender_id: user_id }, { receiver_id: user_id }],
    };
    if (shop_id) {
      filter.shop_id = shop_id;
    }

    const allChats = await chats.findAll({
      where: filter,
      include: [
        {
          model: users,
          as: 'sender',
          attributes: ['id', 'username'],
        },
        {
          model: users,
          as: 'receiver',
          attributes: ['id', 'username'],
        },
        {
          model: shops,
          as: 'shopChats',
          attributes: ['id', 'shop_name', 'owner_id'],
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    const { formattedChats, userChatStatus, totalUnread } = await formatChat(
      allChats,
      user_id
    );

    res.status(200).json({
      success: true,
      data: {
        chats: formattedChats,
        status: userChatStatus,
        unreadTotal: totalUnread,
      },
    });
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({
      success: false,
      error: error,
      message: 'Internal server error',
    });
  }
};

const deleteChat = async (req, res) => {
  try {
    const { id } = req.body;
    const user_id = req.headers.user_id;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Message ID is required' });
    }

    const message = await chats.findOne({ where: { id } });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Only sender can delete their message
    if (message.sender_id !== user_id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this message' });
    }

    await chats.update({ is_deleted: true }, { where: { id } });

    const payload = {
      id: message.id,
      sender_id: message.sender_id,
      receiver_id: message.receiver_id,
      shop_id: message.shop_id,
    };

    // Broadcast deletion in real time to both receiver and sender
    emitToUser(message.receiver_id, 'message_deleted', payload);
    emitToUser(message.sender_id, 'message_deleted', payload);

    res.status(200).json({
      success: true,
      data: payload,
    });
  } catch (error) {
    console.error('Error in deleteChat:', error);
    res.status(500).json({
      success: false,
      error: error.message || error,
      message: 'Failed to delete message',
    });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const user_id = req.headers.user_id || req.body?.user_id;
    if (!user_id) {
      return res.status(200).json({ success: true, count: 0 });
    }

    const count = await chats.count({
      where: {
        receiver_id: user_id,
        is_read: false,
        is_deleted: false,
      },
    });

    res.status(200).json({
      success: true,
      count: count || 0,
    });
  } catch (error) {
    console.error('Error in getUnreadCount:', error);
    res.status(500).json({
      success: false,
      count: 0,
      error: error.message || error,
    });
  }
};

const markIsRead = async (req, res) => {
  try {
    const { unread, sender_id } = req.body;
    const user_id = req.headers.user_id;

    if (!unread || !unread.length) {
      return res.status(200).json({ success: true, count: 0 });
    }

    const unreadIds = Array.isArray(unread) ? unread : [unread];

    await chats.update(
      {
        is_read: true,
      },
      {
        where: {
          id: unreadIds,
        },
      }
    );

    // Notify the message sender that their messages have been read
    if (sender_id) {
      emitToUser(sender_id, 'messages_read', {
        message_ids: unreadIds,
        reader_id: user_id,
      });
    }

    res.status(200).json({
      success: true,
      data: unreadIds,
    });
  } catch (error) {
    console.error('Error in markIsRead:', error);
    res.status(500).json({
      success: false,
      error: error.message || error,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  create,
  getAll,
  createChat,
  getAllUsers,
  markIsRead,
  getAllShops,
  deleteChat,
  getUnreadCount,
  uploadChatAttachment,
};
