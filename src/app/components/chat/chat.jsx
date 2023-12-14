import React, { useState, useEffect } from 'react';
import './styles.css';
import { CloseOutlined } from '@ant-design/icons';
import { useChatStore, useGlobalStore } from '../../services';
import { SOCKET, apiConfig, netWorkCall } from '../../utils';
import { MessageHeader } from './view';

function ChatApp() {
  const [socketID, setSocketID] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [messageList, setMessageList] = useState([]);
  const [userMenu, setUserMenu] = useState({})
  const [receiveMessage, setReceiveMessage] = useState({
    data: '',
    type: ''
  })

  const { receiver_id, shop_id, handleChatClose, updateReceiver } = useChatStore((state) => state);
  const { user_data } = useGlobalStore((state) => state);

  const [selectedChat, setSelectedChat] = useState(receiver_id)

  const sendMessage = async () => {
    if (currentMessage !== '' && selectedChat !== user_data.user_id) {
      const messageData = {
        sender_id: user_data.user_id,
        message: currentMessage,
        receiver_id: selectedChat,
        username: user_data.username,
        shop_id: shop_id
      };
      const response = await netWorkCall(
        apiConfig.chat_create,
        'POST',
        JSON.stringify(messageData),
        true
      );
      if (response.data) {
        await SOCKET.emit('send_message', response.data);
        setReceiveMessage({ data: response.data, type: 'receiver_id' })
        setCurrentMessage("")
      }
    }
  };


  const handleHeaderClick = (key) => {
    setSelectedChat(key)
  }

  useEffect(() => {
    // add on temporary state on sending and receving io socket is trigger and the main state is renderd
    const { data, type } = receiveMessage;
    if (type && data) {
      if (userMenu[data[type]]) {
        userMenu[data[type]].push(data)
      } else {
        userMenu[data[type]] = [data]
      }
      setUserMenu({ ...userMenu })
      setReceiveMessage({ data: {}, type: '' })
    }
  }, [receiveMessage])

  useEffect(() => {
    SOCKET.on('socket_id', (id) => {
      setSocketID(id);
    });

    SOCKET.on('receive_message', (data) => {
      setReceiveMessage({ data: data, type: 'sender_id' })
    });

    return () => {
      SOCKET.off('socket_id');
      SOCKET.off('receive_message');
    };
  }, [SOCKET]);

  useEffect(() => {
    SOCKET.emit('connect_user', user_data)
  }, [])


  useEffect(() => {
    fetchInitData();
  }, [])

  useEffect(()=>{
    setSelectedChat(receiver_id)
  },[receiver_id])

  const fetchInitData = async () => {
    const response = await netWorkCall(
      apiConfig.chat_users,
      'POST',
      JSON.stringify({}),
      true
    );
    if (response.data && Object.keys(response.data).length) {
      setUserMenu({ ...response.data })
    }
  }

  const isChatSelected = selectedChat === user_data?.user_id ? false : true;
  
  return (
    <div class="container">
      <button
        style={{ position: 'absolute', right: 15, top: 35 }}
        onClick={() => {
          if (isChatSelected && selectedChat !== receiver_id ) setSelectedChat(user_data?.user_id)
          else handleChatClose()
        }}
      >
        <CloseOutlined />
      </button>
      <div class="chat-container">
        <div class="user-list" style={{ display: isChatSelected ? 'none' : '' }}>
          {
            Object.keys(userMenu).map(key => {
              if (key === user_data.user_id) return
              let chatData = userMenu[key];
              let totalUnread = userMenu[key].filter(item => !item.is_read).length
              let lastData = chatData[chatData.length-1];
              return <MessageHeader
                name={lastData.username}
                message={lastData.message}
                handleHeaderClick={() => handleHeaderClick(key)}
                color={Math.floor(Math.random() * (4 - 0))}
                totalUnread={totalUnread}
                dateTime={lastData.updatedAt}
              />
            })
          }
        </div>
        <div class="msg-container-wrapper">
          <div class="message-container" style={{ display: isChatSelected ? '' : 'none' }}>
            {userMenu[selectedChat]?.map((msg) => {
              return (
                <div
                  class={`message ${msg.sender_id === user_data?.user_id ? 'my-msg' : 'other-msg'
                    }`}
                >
                  {msg.message}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div class="input-container" style={{ display: isChatSelected ? '' : 'none' }}>
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
