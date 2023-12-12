import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './styles.css';

const socket = io('http://localhost:3001');

function ChatApp() {
  const [socketID, setSocketID] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [messageList, setMessageList] = useState([]);

  const sendMessage = async () => {
    if (currentMessage !== '') {
      const messageData = {
        sender: socketID,
        message: currentMessage,
        targetSocketId: '1iBSxm1kmX62zLm8AAAJ',
      };
      await socket.emit('send_message', messageData);
      setMessageList((list) => [...list, messageData]);
      setCurrentMessage('');
    }
  };

  useEffect(() => {
    socket.on('socket_id', (id) => {
      setSocketID(id);
    });

    socket.on('receive_message', (data) => {
      setMessageList((list) => [...list, data]);
    });

    return () => {
      socket.off('socket_id');
      socket.off('receive_message');
    };
  }, [socket]);

  return (
    <div class="container">
      <h1>Realtime Chat</h1>

      <div class="msg-container-wrapper">
        <div class="message-container">
          {messageList.map((msg) => {
            return (
              <div
                class={`message ${
                  msg.sender === socketID ? 'my-msg' : 'other-msg'
                }`}
              >
                {msg.message}
              </div>
            );
          })}
        </div>
      </div>

      <div class="input-container">
        <input
          type="text"
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
        />
        <button onClick={() => sendMessage(currentMessage)}>Send</button>
      </div>
    </div>
  );
}

export default ChatApp;
