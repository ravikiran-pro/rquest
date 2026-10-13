const { Server } = require('socket.io');

let ioInstance = null;

// Map: userId -> Set of active socket IDs
const userSocketsMap = new Map();

/**
 * Initialize Socket.io on the provided HTTP server
 * Completely isolated from Express routes and middleware
 */
const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  ioInstance = io;

  io.on('connection', (socket) => {
    // Send socket connection acknowledgment
    socket.emit('socket_id', socket.id);

    // Register / join user room
    const registerUser = (userData) => {
      const userId = userData?.user_id || userData?.id;
      if (!userId) return;

      socket.userId = userId;
      socket.userData = userData;

      // Join user-specific room for multi-device/multi-tab delivery
      socket.join(`user:${userId}`);

      if (!userSocketsMap.has(userId)) {
        userSocketsMap.set(userId, new Set());
      }
      const sockets = userSocketsMap.get(userId);
      const wasOffline = sockets.size === 0;
      sockets.add(socket.id);

      // If user just transitioned from offline to online, broadcast presence
      if (wasOffline) {
        io.emit('user_presence_change', {
          userId,
          isOnline: true,
          username: userData.username,
        });
      }

      console.log(`[Socket] User ${userData.username || userId} connected (Socket: ${socket.id}, Active Sockets: ${sockets.size})`);
    };

    socket.on('connect_user', registerUser);
    socket.on('join_user', registerUser);

    // Relay message
    socket.on('send_message', async (messageData, callback) => {
      if (!messageData || !messageData.receiver_id) return;

      const receiverRoom = `user:${messageData.receiver_id}`;
      const senderRoom = `user:${messageData.sender_id}`;

      // Deliver to receiver (all open tabs of receiver)
      io.to(receiverRoom).emit('receive_message', messageData);

      // Also deliver confirmation back to sender's room (sync other tabs/devices)
      io.to(senderRoom).emit('message_sent', messageData);

      if (typeof callback === 'function') {
        callback({ success: true, timestamp: new Date().toISOString() });
      }
    });

    // Real-time typing indicators
    socket.on('typing_start', (data) => {
      if (!data || !data.receiver_id) return;
      io.to(`user:${data.receiver_id}`).emit('user_typing', {
        sender_id: data.sender_id || socket.userId,
        shop_id: data.shop_id,
        username: data.username,
        isTyping: true,
      });
    });

    socket.on('typing_stop', (data) => {
      if (!data || !data.receiver_id) return;
      io.to(`user:${data.receiver_id}`).emit('user_typing', {
        sender_id: data.sender_id || socket.userId,
        shop_id: data.shop_id,
        isTyping: false,
      });
    });

    // Real-time message read receipts
    socket.on('mark_read', (data) => {
      if (!data) return;
      const targetUserId = data.sender_id;
      if (targetUserId) {
        io.to(`user:${targetUserId}`).emit('messages_read', {
          message_ids: data.message_ids || data.unread_ids || [],
          reader_id: socket.userId,
          shop_id: data.shop_id,
        });
      }
    });

    // Real-time message deletion
    socket.on('delete_message', (data) => {
      if (!data || !data.id) return;
      if (data.receiver_id) {
        io.to(`user:${data.receiver_id}`).emit('message_deleted', data);
      }
      if (data.sender_id) {
        io.to(`user:${data.sender_id}`).emit('message_deleted', data);
      }
    });

    // Presence check for batch users
    socket.on('check_online', (userIds, callback) => {
      if (!Array.isArray(userIds) || typeof callback !== 'function') return;
      const statuses = {};
      userIds.forEach((id) => {
        statuses[id] = isUserOnline(id);
      });
      callback(statuses);
    });

    // Disconnect cleanup
    socket.on('disconnect', () => {
      const userId = socket.userId;
      if (userId && userSocketsMap.has(userId)) {
        const sockets = userSocketsMap.get(userId);
        sockets.delete(socket.id);

        if (sockets.size === 0) {
          userSocketsMap.delete(userId);
          // Broadcast that user has gone offline
          io.emit('user_presence_change', {
            userId,
            isOnline: false,
          });
          console.log(`[Socket] User ${userId} is now offline.`);
        }
      }
    });
  });

  return io;
};

/**
 * Check if a user is currently online
 */
const isUserOnline = (userId) => {
  if (!userId) return false;
  const sockets = userSocketsMap.get(userId);
  return Boolean(sockets && sockets.size > 0);
};

/**
 * Get map of online status for multiple user IDs
 */
const getOnlineStatusMap = (userIds = []) => {
  const result = {};
  userIds.forEach((id) => {
    result[id] = isUserOnline(id);
  });
  return result;
};

/**
 * Emit an event to all connected sockets of a user
 */
const emitToUser = (userId, event, payload) => {
  if (!ioInstance || !userId) return false;
  ioInstance.to(`user:${userId}`).emit(event, payload);
  return true;
};

/**
 * Get Socket.io instance
 */
const getIO = () => ioInstance;

module.exports = {
  initSocket,
  getIO,
  isUserOnline,
  getOnlineStatusMap,
  emitToUser,
};

