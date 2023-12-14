const { chats, users } = require('../../models');
const { col, fn, Op, literal } = require('sequelize');


const create = async (req, res) => {
  try {

    let result = await createChat(req.body, req.headers.user_id)

    res.status(201).json({
      success: true,
      data: result[0],
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error,
      message: 'Data Insertion Failed',
    });
  }
};

const createChat = async (chatDetails, user_id) => {
  try {
    const payload = {
      sender_id: chatDetails.sender_id,
      receiver_id: chatDetails.receiver_id,
      shop_id: chatDetails.shop_id,
      message: chatDetails.message,
      is_read: false
    };

    const res = await chats.create(payload);

    const allChats = await chats.findAll({
      where: { id: res.id },
      include: [
        { model: users, as: 'sender', attributes: ['id', 'username'] },
        { model: users, as: 'receiver', attributes: ['id', 'username'] },
      ],
      order: [['updatedAt', 'DESC']],
    });

    const formattedChats = await formatChat(allChats, user_id);

    return formattedChats[payload.receiver_id]
  } catch (err) {
    throw new Error("Message Failed")

  }
}

const getAll = async (req, res) => {
  try {
    const { sender_id } = req.body;
    const { user_id } = req.headers;
    const payload = {
      receiver_id: chatDetails.receiver_id,
    };

    const res = await chats.findAll(payload);

    res.status(201).json({
      success: true,
      data: res,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error,
      message: 'Data Insertion Failed',
    });
  }
};


const formatChat = async (allChats, user_id) => {
  const formattedChats = {};

  allChats.forEach(chat => {
    const isSender = chat.sender_id === user_id;
    const otherUserId = isSender ? chat.receiver_id : chat.sender_id;

    if (!formattedChats[otherUserId]) {
      formattedChats[otherUserId] = [];
    }

    formattedChats[otherUserId].push({
      sender_id: chat.sender_id,
      receiver_id: chat.receiver_id,
      username: isSender ? chat.receiver.username : chat.sender.username,
      message: chat.message,
      updatedAt: chat.updatedAt,
      createdAt: chat.createdAt,
      is_read: chat.is_read
    });
  });

  return formattedChats;
}


const getAllUsers = async (req, res) => {
  try {
    const { user_id } = req.headers;

    const allChats = await chats.findAll({
      where: {
        [Op.or]: [
          { 'sender_id': user_id },
          { 'receiver_id': user_id },
        ],
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
      order: [['updatedAt', 'ASC']]
    });

    const formattedChats = await formatChat(allChats, user_id);

    res.status(201).json({
      success: true,
      data: formattedChats,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error,
      message: 'Internal servor error',
    });
  }
};


module.exports = { create, getAll, createChat, getAllUsers };
