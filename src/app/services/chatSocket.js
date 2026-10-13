import { SOCKET } from '../utils';

class ChatSocketService {
  constructor() {
    this.currentUser = null;
    this.typingTimeout = null;

    // Set up auto-reconnect room join
    SOCKET.on('connect', () => {
      if (this.currentUser) {
        this.joinUser(this.currentUser);
      }
    });
  }

  /**
   * Register active user to join user-specific socket room
   */
  joinUser(userData) {
    if (!userData || (!userData.user_id && !userData.id)) return;
    this.currentUser = userData;
    SOCKET.emit('connect_user', userData);
    SOCKET.emit('join_user', userData);
  }

  /**
   * Emit send_message through socket
   */
  sendMessage(messageData, callback) {
    SOCKET.emit('send_message', messageData, (res) => {
      if (typeof callback === 'function') callback(res);
    });
  }

  /**
   * Start typing notification with debouncing
   */
  startTyping({ receiver_id, shop_id, username }) {
    if (!receiver_id) return;
    SOCKET.emit('typing_start', {
      receiver_id,
      shop_id,
      username: username || this.currentUser?.username,
      sender_id: this.currentUser?.user_id || this.currentUser?.id,
    });
  }

  /**
   * Stop typing notification
   */
  stopTyping({ receiver_id, shop_id }) {
    if (!receiver_id) return;
    SOCKET.emit('typing_stop', {
      receiver_id,
      shop_id,
      sender_id: this.currentUser?.user_id || this.currentUser?.id,
    });
  }

  /**
   * Mark messages as read and notify sender
   */
  markAsRead({ unread_ids, sender_id, shop_id }) {
    SOCKET.emit('mark_read', {
      unread_ids,
      sender_id,
      shop_id,
    });
  }

  /**
   * Check real-time online status for list of user IDs
   */
  checkOnlineUsers(userIds, callback) {
    SOCKET.emit('check_online', userIds, (res) => {
      if (typeof callback === 'function') callback(res);
    });
  }

  /**
   * Listen for incoming messages
   */
  onReceiveMessage(callback) {
    SOCKET.on('receive_message', callback);
    return () => SOCKET.off('receive_message', callback);
  }

  /**
   * Listen for message sent confirmation (for multi-tab sync)
   */
  onMessageSent(callback) {
    SOCKET.on('message_sent', callback);
    return () => SOCKET.off('message_sent', callback);
  }

  /**
   * Listen for typing events
   */
  onTyping(callback) {
    SOCKET.on('user_typing', callback);
    return () => SOCKET.off('user_typing', callback);
  }

  /**
   * Listen for messages read receipt
   */
  onMessagesRead(callback) {
    SOCKET.on('messages_read', callback);
    return () => SOCKET.off('messages_read', callback);
  }

  /**
   * Listen for presence (online/offline) changes
   */
  onPresenceChange(callback) {
    SOCKET.on('user_presence_change', callback);
    return () => SOCKET.off('user_presence_change', callback);
  }

  /**
   * Emit message deletion event
   */
  deleteMessage(payload) {
    SOCKET.emit('delete_message', payload);
  }

  /**
   * Listen for message deletion
   */
  onMessageDeleted(callback) {
    SOCKET.on('message_deleted', callback);
    return () => SOCKET.off('message_deleted', callback);
  }
}

export const chatSocket = new ChatSocketService();
export default chatSocket;

