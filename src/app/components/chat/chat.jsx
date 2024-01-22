import React, { useState, useEffect, useRef } from 'react';
import './styles.css';
import { CloseOutlined } from '@ant-design/icons';
import { useChatStore, useGlobalStore } from '../../services';
import { SOCKET, apiConfig, getColorByName, netWorkCall } from '../../utils';
import { MessageHeader } from './view';
import { Card } from 'antd';

function ChatApp() {
  const [socketID, setSocketID] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [messageList, setMessageList] = useState([]);
  const [userMenu, setUserMenu] = useState({});
  const [userStatus, setUserStatus] = useState({});
  const [allShops, setAllShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [receiveMessage, setReceiveMessage] = useState({
    data: '',
    type: '',
  });
  const scrollRef = useRef(null);

  const { receiver_id, shop_id, handleChatClose, updateShop } = useChatStore(
    (state) => state
  );
  const { user_data } = useGlobalStore((state) => state);

  const [selectedChat, setSelectedChat] = useState(receiver_id);

  ///trigeger when particular chat is selected or chat is open when message is sent or received
  const updateIsRead = async (unread_ids) => {
    let response = await netWorkCall(
      apiConfig.chat_update_read,
      'POST',
      JSON.stringify({
        unread: unread_ids,
      }),
      true
    );
    return response?.success;
  };

  const sendMessage = async () => {
    if (currentMessage !== '' && selectedChat !== user_data.user_id) {
      const messageData = {
        sender_id: user_data.user_id,
        message: currentMessage,
        receiver_id: selectedChat,
        username: user_data.username,
        shop_id: shop_id,
      };
      const response = await netWorkCall(
        apiConfig.chat_create,
        'POST',
        JSON.stringify(messageData),
        true
      );
      if (response.data) {
        await SOCKET.emit('send_message', response.data);
        setReceiveMessage({ data: response.data, type: 'receiver_id' });
        setCurrentMessage('');
      }
    }
  };

  const handleHeaderClick = async (unread, key) => {
    /// update is read for all unread
    updateIsRead(unread);

    let currentMessageList = userMenu[key].map((item) => {
      return {
        ...item,
        is_read: true,
      };
    });
    /// set selected chat
    setSelectedChat(key);
    /// update current shop of the chat owner and updating isRead
    updateShop(userMenu[key][0].shop_id);
    setUserMenu({
      ...userMenu,
      [key]: currentMessageList,
    });
  };

  const fetchInitShopsData = async () => {
    const response = await netWorkCall(
      apiConfig.chat_shops,
      'POST',
      JSON.stringify({}),
      true
    );
    if (response?.data && Object.keys(response.data).length) {
      setAllShops([...response.data]);
      setSelectedShop(0);
    }
  };

  const fetchInitMessageData = async (shop_id) => {
    const response = await netWorkCall(
      apiConfig.chat_users,
      'POST',
      JSON.stringify({
        shop_id: shop_id,
      }),
      true
    );
    if (response.data && Object.keys(response.data).length) {
      setUserMenu({ ...response.data.chats });
      setUserStatus({ ...response.data.status });
    }
  };

  useEffect(() => {
    // add on temporary state on sending and receving io socket is trigger and the main state is renderd
    let { data, type } = receiveMessage;
    if (!data?.id) return false;
    data.is_read = true;
    if (type && data) {
      if (userMenu[data[type]]) {
        userMenu[data[type]].push(data);
      } else {
        userMenu[data[type]] = [data];
      }
      setUserMenu({ ...userMenu });
      updateIsRead([data?.id]);
      setReceiveMessage({ data: {}, type: '' });
    }
  }, [receiveMessage]);

  useEffect(() => {
    SOCKET.on('socket_id', (id) => {
      setSocketID(id);
    });

    SOCKET.on('receive_message', (data) => {
      setReceiveMessage({ data: data, type: 'sender_id' });
    });

    return () => {
      SOCKET.off('socket_id');
      SOCKET.off('receive_message');
    };
  }, [SOCKET]);

  useEffect(() => {
    SOCKET.emit('connect_user', user_data);
  }, []);

  useEffect(() => {
    fetchInitShopsData();
  }, []);

  useEffect(() => {
    setSelectedChat(receiver_id);
  }, [receiver_id]);

  useEffect(() => {
    if (selectedShop >= 0 && allShops && allShops?.length) {
      fetchInitMessageData(allShops[selectedShop].shop_id);
    }
  }, [selectedShop]);

  /// if chat not selected or selected chat as currect user id --- SET isChatSelected false
  const isChatSelected =
    !selectedChat || selectedChat === user_data?.user_id ? false : true;

  return (
    <div class="container">
      <div class="chat-container shop-only">
        {allShops?.map((item, index) => {
          return (
            <Card
              style={{
                width: '100%',
                borderRadius: 0,
                borderRight: 'none',
                borderLeft: 'none',
              }}
              className={`message-header-root ${
                selectedShop === index ? 'highlight' : ''
              }`}
              onClick={() => {
                setSelectedShop(index);
                setSelectedChat(null);
              }}
            >
              {item?.shopChats?.shop_name}
            </Card>
          );
        })}
      </div>
      <button
        style={{ position: 'absolute', right: 15, top: 15, zIndex: 1000 }}
        onClick={() => {
          if (isChatSelected && selectedChat !== receiver_id)
            setSelectedChat(user_data?.user_id);
          else handleChatClose();
        }}
      >
        <CloseOutlined />
      </button>
      <div className="chat-container chat-only">
        <div className="chat-box">
          {!Object.keys(userMenu).length && !isChatSelected && (
            <div class="chat-no-chat sub-title">No Chat Found</div>
          )}
          {/* entire chat list to show if no chat selected */}
          <div
            class="user-list"
            style={{ display: isChatSelected ? 'none' : '' }}
          >
            {!isChatSelected &&
              Object.keys(userMenu).map((key, index) => {
                if (key === user_data.user_id) return;
                let chatData = userMenu[key];
                let isOnline = userStatus[key]?.isOnline;
                let totalUnread = userMenu[key]
                  .map((item) => {
                    if (!item.is_read && item.receiver_id === user_data.user_id)
                      return item.id;
                  })
                  .filter((item) => item !== undefined);
                let lastData = chatData[chatData.length - 1];
                return (
                  <MessageHeader
                    name={lastData.username}
                    message={lastData.message}
                    handleHeaderClick={() =>
                      handleHeaderClick(totalUnread, key)
                    }
                    color={getColorByName(lastData.username)}
                    totalUnread={totalUnread.length}
                    dateTime={lastData.updatedAt}
                    index={index}
                    isOnline={isOnline}
                  />
                );
              })}
          </div>
          <div class="msg-container-wrapper">
            <div
              class="message-container"
              style={{ display: isChatSelected ? '' : 'none' }}
            >
              {isChatSelected &&
                userMenu[selectedChat]?.map((msg) => {
                  let className = `${
                    !msg?.is_read ? 'highlight-msg' : 'ss'
                  } message ${
                    msg.sender_id === user_data?.user_id
                      ? 'my-msg'
                      : 'other-msg'
                  }`;
                  return <div class={className}>{msg.message}</div>;
                })}
            </div>
          </div>
          <div
            class="input-container"
            style={{ display: isChatSelected ? '' : 'none' }}
          >
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.keyCode === 13) {
                  sendMessage(currentMessage);
                }
              }}
            />
            <button onClick={() => sendMessage(currentMessage)}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatApp;
