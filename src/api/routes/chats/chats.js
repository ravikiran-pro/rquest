const { chats, users, shops } = require('../../models');
const { col, fn, Op, literal } = require('sequelize');

const create = async (req, res) => {
  try {
    let result = await createChat(
      req.body,
      req.headers.user_id,
      req.headers.socketData
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

const createChat = async (chatDetails, user_id, socketData) => {
  try {
    const currentUserId = user_id || chatDetails.sender_id;
    const payload = {
      sender_id: chatDetails.sender_id,
      receiver_id: chatDetails.receiver_id,
      shop_id: chatDetails.shop_id,
      message: chatDetails.message,
      is_read: false,
    };

    const created = await chats.create(payload);

    const allChats = await chats.findAll({
      where: { id: created.id },
      include: [
        { model: users, as: 'sender', attributes: ['id', 'username'] },
        { model: users, as: 'receiver', attributes: ['id', 'username'] },
      ],
      order: [['updatedAt', 'DESC']],
    });

    const { formattedChats } = await formatChat(
      allChats,
      currentUserId,
      socketData
    );

    const targetKey =
      payload.receiver_id === currentUserId
        ? payload.sender_id
        : payload.receiver_id;
    const list = formattedChats[targetKey] || Object.values(formattedChats)[0] || [];
    return list[0] || created.toJSON();
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

const formatChat = async (allChats, user_id, socketData) => {
  const formattedChats = {};
  const userChatStatus = {};

  allChats.forEach((chat) => {
    const isSender = chat.sender_id === user_id;
    const otherUserId = isSender ? chat.receiver_id : chat.sender_id;

    if (!formattedChats[otherUserId]) {
      formattedChats[otherUserId] = [];
      userChatStatus[otherUserId] = {
        isOnline: socketData?.[otherUserId]?.socket_id ? true : false,
      };
    }

    formattedChats[otherUserId].push({
      id: chat.id,
      sender_id: chat.sender_id,
      receiver_id: chat.receiver_id,
      username: isSender ? chat.receiver.username : chat.sender.username,
      message: chat.message,
      shop_id: chat.shop_id,
      updatedAt: chat.updatedAt,
      createdAt: chat.createdAt,
      is_read: chat.is_read,
    });
  });

  return { formattedChats, userChatStatus };
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
          attributes: ['id', 'shop_name'],
        },
      ],
      where: {
        [Op.or]: [{ sender_id: user_id }, { receiver_id: user_id }],
      },
      group: ['shop_id', 'shopChats.id'], // Group by both shop_id and shopChats.id
      having: literal('COUNT(chats.id) > 0'),
      order: [[literal('shop_id'), 'ASC']],
    });

    res.status(201).json({
      success: true,
      data: allshops,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error,
      message: 'Internal servor error',
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { user_id, socketData } = req.headers;
    const { shop_id } = req.body;

    const allChats = await chats.findAll({
      where: {
        [Op.or]: [{ sender_id: user_id }, { receiver_id: user_id }],
        shop_id: shop_id,
      },
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
      ],
      // raw: true,
      order: [['updatedAt', 'ASC']],
    });

    const { formattedChats, userChatStatus } = await formatChat(
      allChats,
      user_id,
      socketData
    );

    res.status(201).json({
      success: true,
      data: {
        chats: formattedChats,
        status: userChatStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error,
      message: 'Internal servor error',
    });
  }
};

const markIsRead = async (req, res) => {
  try {
    const { unread } = req.body;

    const allChats = await chats.update(
      {
        is_read: true,
      },
      {
        where: {
          id: unread,
        },
      }
    );

    res.status(201).json({
      success: true,
      data: allChats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error,
      message: 'Internal servor error',
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
};
