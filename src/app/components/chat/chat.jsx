import React, { useState, useEffect, useRef, useMemo } from 'react';
import './styles.css';
import {
  CloseOutlined,
  ArrowLeftOutlined,
  ShopOutlined,
  CheckOutlined,
  LoadingOutlined,
  MessageOutlined,
  UserOutlined,
  DeleteOutlined,
  InboxOutlined,
  MoreOutlined,
  RollbackOutlined,
  SearchOutlined,
  SendOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { Dropdown, Popconfirm, Tooltip, Select, Input } from 'antd';
import {
  MainContainer,
  Sidebar,
  ConversationList,
  Conversation,
  ConversationHeader,
  ChatContainer,
  MessageList,
  Message,
  TypingIndicator,
  Avatar,
  Status,
  MessageSeparator,
} from '@chatscope/chat-ui-kit-react';
import { format, isToday, isYesterday } from 'date-fns';
import { useLocation } from 'react-router-dom';
import { useChatStore, useGlobalStore, chatSocket } from '../../services';
import { apiConfig, netWorkCall } from '../../utils';

const AVATAR_PALETTE = [
  '#4f46e5', // Indigo
  '#7c3aed', // Purple
  '#0284c7', // Sky Blue
  '#0d9488', // Teal
  '#059669', // Emerald
  '#d97706', // Amber
  '#ea580c', // Orange
  '#e11d48', // Rose
  '#db2777', // Pink
];

function getAvatarColor(name = '') {
  if (!name) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function formatMessageTime(dateTimeString) {
  if (!dateTimeString) return '';
  const date = new Date(dateTimeString);
  if (isNaN(date.getTime())) return '';

  if (isToday(date)) {
    return format(date, 'h:mm a');
  } else if (isYesterday(date)) {
    return `Yesterday ${format(date, 'h:mm a')}`;
  }
  return format(date, 'MMM d, h:mm a');
}

function formatConversationTime(dateTimeString) {
  if (!dateTimeString) return '';
  const date = new Date(dateTimeString);
  if (isNaN(date.getTime())) return '';

  if (isToday(date)) {
    return format(date, 'h:mm a');
  } else if (isYesterday(date)) {
    return 'Yesterday';
  }
  return format(date, 'dd/MM/yy');
}

function ChatApp() {
  const location = useLocation();
  const {
    receiver_id,
    shop_id,
    chatMetadata,
    handleChatClose,
    setUnreadTotal,
  } = useChatStore((state) => state);
  const { user_data } = useGlobalStore((state) => state);

  const [allShops, setAllShops] = useState([]);
  const [selectedChat, setSelectedChat] = useState(receiver_id);
  const [userMenu, setUserMenu] = useState({});
  const [userStatus, setUserStatus] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unread' | 'archived'
  const [selectedStoreFilter, setSelectedStoreFilter] = useState('all');
  const [inputText, setInputText] = useState('');
  const [archivedChats, setArchivedChats] = useState(() => {
    try {
      const saved = localStorage.getItem(`rquest_archived_chats_${user_data?.user_id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isTyping, setIsTyping] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(true);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 640);
  const [isMobileView, setIsMobileView] = useState(() => window.innerWidth <= 768);
  const [browsingShop, setBrowsingShop] = useState(null);

  const isMountedRef = useRef(true);
  const typingTimeoutRef = useRef(null);
  const receiverTypingResetRef = useRef(null);

  // Track mounted status to prevent React state update on unmounted component
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (receiverTypingResetRef.current) clearTimeout(receiverTypingResetRef.current);
    };
  }, []);

  // Sync archivedChats to localStorage
  useEffect(() => {
    if (user_data?.user_id) {
      try {
        localStorage.setItem(
          `rquest_archived_chats_${user_data.user_id}`,
          JSON.stringify(archivedChats)
        );
      } catch (err) {
        console.error('Failed to save archived chats:', err);
      }
    }
  }, [archivedChats, user_data?.user_id]);

  // Detect current store if browsing a storefront page (/shop/:shop_id)
  useEffect(() => {
    let isCurrent = true;
    const match = location?.pathname?.match(/\/shop\/([a-zA-Z0-9-]+)/);
    const routeShopId = match ? match[1] : null;

    if (routeShopId) {
      netWorkCall(`${apiConfig.shop_details}/${routeShopId}/details`, 'GET', null, false)
        .then((res) => {
          if (res?.data) {
          if (isCurrent && isMountedRef.current && res?.data) {
            setBrowsingShop(res.data);
          }
        })
        .catch(() => {});
    } else {
      setBrowsingShop(null);
    }

    return () => {
      isCurrent = false;
    };
  }, [location?.pathname]);

  // Track responsive screen size
  // Track responsive screen size safely
  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth <= 640);
    const handleResize = () => {
      if (isMountedRef.current) {
        setIsMobileView(window.innerWidth <= 768);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync active receiver from Zustand store
  useEffect(() => {
    if (receiver_id) {
    if (receiver_id && isMountedRef.current) {
      setSelectedChat(receiver_id);
      setUserMenu((prev) => ({
        ...prev,
        [receiver_id]: prev[receiver_id] || [],
      }));
    }
  }, [receiver_id]);

  // Load shops list for store filter dropdown
  const fetchShops = async () => {
    try {
      const response = await netWorkCall(
        apiConfig.chat_shops,
        'POST',
        JSON.stringify({}),
        true
      );
      if (!isMountedRef.current) return;
      let shopsList = (response?.data && Array.isArray(response.data)) ? response.data : [];

      const targetShopId = shop_id || browsingShop?.id;
      const targetShopName = chatMetadata?.shop_name || browsingShop?.shop_name;
      const targetOwnerId = receiver_id || browsingShop?.owner_id;

      if (targetShopId && !shopsList.some((s) => s.shop_id === targetShopId)) {
        shopsList = [
          {
            shop_id: targetShopId,
            shopChats: {
              id: targetShopId,
              shop_name: targetShopName || 'Store',
              owner_id: targetOwnerId,
            },
          },
          ...shopsList,
        ];
      }

      setAllShops(shopsList);
    } catch (err) {
      console.error('Failed to load shops:', err);
      if (isMountedRef.current) {
        console.error('Failed to load shops:', err);
      }
    }
  };

  // Load ALL conversations across all shops (unified inbox)
  const fetchConversations = async () => {
    setIsChatLoading(true);
    try {
      const response = await netWorkCall(
        apiConfig.chat_users,
        'POST',
        JSON.stringify({}),
        true
      );
      if (!isMountedRef.current) return;

      if (response?.data) {
        const chats = response.data.chats || {};
        const status = response.data.status || {};

        if (receiver_id && !chats[receiver_id]) {
          chats[receiver_id] = [];
          status[receiver_id] = { isOnline: false };
        }

        setUserMenu(chats);
        setUserStatus(status);

        if (response.data.unreadTotal !== undefined) {
          setUnreadTotal(response.data.unreadTotal);
        }
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      if (isMountedRef.current) {
        console.error('Failed to load messages:', err);
      }
    } finally {
      setIsChatLoading(false);
      if (isMountedRef.current) {
        setIsChatLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchShops();
    fetchConversations();
  }, [shop_id, browsingShop?.id]);

  // Mark messages as read for active conversation
  const markMessagesAsRead = async (unreadIds, targetSenderId) => {
    if (!unreadIds || unreadIds.length === 0) return;
    try {
      await netWorkCall(
        apiConfig.chat_update_read,
        'POST',
        JSON.stringify({
          unread: unreadIds,
          sender_id: targetSenderId,
        }),
        true
      );
      if (!isMountedRef.current) return;

      chatSocket.markAsRead({
        unread_ids: unreadIds,
        sender_id: targetSenderId,
      });

      setUnreadTotal((prev) => Math.max(0, prev - unreadIds.length));
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
      if (isMountedRef.current) {
        console.error('Failed to mark messages as read:', err);
      }
    }
  };

  // Switch conversation
  const handleSelectConversation = (partnerId) => {
    setSelectedChat(partnerId);

    if (userMenu[partnerId]) {
      const unreadIds = userMenu[partnerId]
        .filter((msg) => !msg.is_read && msg.receiver_id === user_data?.user_id && !msg.is_deleted)
        .map((msg) => msg.id);

      if (unreadIds.length > 0) {
        markMessagesAsRead(unreadIds, partnerId);
        setUserMenu((prev) => ({
          ...prev,
          [partnerId]: prev[partnerId].map((m) =>
            unreadIds.includes(m.id) ? { ...m, is_read: true } : m
          ),
        }));
      }
    }
  };

  // Start chat with a specific store
  const handleStartChatWithShop = (targetShop) => {
    if (!targetShop) return;
    const targetOwnerId = targetShop.owner_id;
    const targetShopId = targetShop.id || targetShop.shop_id;

    setUserMenu((prev) => ({
      ...prev,
      [targetOwnerId]: prev[targetOwnerId] || [],
    }));

    setSelectedChat(targetOwnerId);
  };

  // Toggle archive status of a conversation
  const handleToggleArchive = (partnerId) => {
    setArchivedChats((prev) =>
      prev.includes(partnerId)
        ? prev.filter((id) => id !== partnerId)
        : [...prev, partnerId]
    );
  };

  // Delete/Clear conversation from sidebar
  // Delete/Clear conversation
  const handleDeleteConversation = (partnerId) => {
    setUserMenu((prev) => {
      const updated = { ...prev };
      delete updated[partnerId];
      return updated;
    });
    setArchivedChats((prev) => prev.filter((id) => id !== partnerId));
    if (selectedChat === partnerId) {
      setSelectedChat(null);
    }
  };

  // Delete message
  const handleDeleteMessage = async (msg) => {
    if (!msg || !msg.id || msg.status === 'pending') return;
    try {
      await netWorkCall(
        apiConfig.chat_delete,
        'POST',
        JSON.stringify({ id: msg.id }),
        true
      );
      if (!isMountedRef.current) return;

      chatSocket.deleteMessage({
        id: msg.id,
        sender_id: user_data?.user_id,
        receiver_id: selectedChat,
        shop_id: msg.shop_id,
      });

      setUserMenu((prev) => ({
        ...prev,
        [selectedChat]: (prev[selectedChat] || []).map((m) =>
          m.id === msg.id
            ? { ...m, is_deleted: true, message: '🚫 This message was deleted' }
            : m
        ),
      }));
    } catch (err) {
      console.error('Failed to delete message:', err);
      if (isMountedRef.current) {
        console.error('Failed to delete message:', err);
      }
    }
  };

  // Send message with single delivery pipeline (NO DOUBLE EMIT)
  const handleSendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || !selectedChat || selectedChat === user_data?.user_id) return;

    // Detect shop context
    const thread = userMenu[selectedChat] || [];
    const lastMsgWithShop = thread.slice().reverse().find((m) => m.shop_id);
    const currentShopId =
      shop_id ||
      chatMetadata?.shop_id ||
      lastMsgWithShop?.shop_id ||
      browsingShop?.id ||
      allShops[0]?.shop_id ||
      null;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      sender_id: user_data?.user_id,
      receiver_id: selectedChat,
      username: user_data?.username || 'Me',
      message: trimmed,
      shop_id: currentShopId,
      is_read: false,
      is_deleted: false,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Optimistically append message
    setUserMenu((prev) => ({
      ...prev,
      [selectedChat]: [...(prev[selectedChat] || []), optimisticMessage],
    }));

    // Stop typing indicator immediately
    chatSocket.stopTyping({
      receiver_id: selectedChat,
      shop_id: currentShopId,
    });

    try {
      const payload = {
        sender_id: user_data?.user_id,
        receiver_id: selectedChat,
        shop_id: currentShopId,
        message: trimmed,
        temp_id: tempId,
        username: user_data?.username,
      };

      const response = await netWorkCall(
        apiConfig.chat_create,
        'POST',
        JSON.stringify(payload),
        true
      );
      if (!isMountedRef.current) return;

      if (response?.data) {
        const savedMsg = { ...response.data, status: 'sent' };

        setUserMenu((prev) => {
          const currentThread = prev[selectedChat] || [];
          if (currentThread.some((m) => m.id === savedMsg.id)) {
            return {
              ...prev,
              [selectedChat]: currentThread.filter((m) => m.id !== tempId),
            };
          }
          return {
            ...prev,
            [selectedChat]: currentThread.map((m) =>
              m.id === tempId ? savedMsg : m
            ),
          };
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setUserMenu((prev) => ({
        ...prev,
        [selectedChat]: (prev[selectedChat] || []).map((m) =>
          m.id === tempId ? { ...m, status: 'failed' } : m
        ),
      }));
      if (isMountedRef.current) {
        console.error('Failed to send message:', err);
        setUserMenu((prev) => ({
          ...prev,
          [selectedChat]: (prev[selectedChat] || []).map((m) =>
            m.id === tempId ? { ...m, status: 'failed' } : m
          ),
        }));
      }
    }
  };

  // Real-time socket event subscribers
  useEffect(() => {
    const unsubReceive = chatSocket.onReceiveMessage((newMsg) => {
      if (!newMsg || !newMsg.sender_id) return;
      if (!isMountedRef.current || !newMsg || !newMsg.sender_id) return;
      const partnerId = newMsg.sender_id;

      setUserMenu((prev) => {
        const thread = prev[partnerId] || [];
        if (thread.some((m) => m.id === newMsg.id)) return prev;

        const isCurrentlyActive = selectedChat === partnerId;
        const updatedMsg = {
          ...newMsg,
          is_read: isCurrentlyActive ? true : newMsg.is_read,
        };

        if (isCurrentlyActive) {
          markMessagesAsRead([newMsg.id], partnerId);
        } else {
          setUnreadTotal((count) => count + 1);
        }

        // Auto-unarchive if a new incoming message arrives for an archived chat
        setArchivedChats((archived) => {
          if (archived.includes(partnerId)) {
            const next = archived.filter((id) => id !== partnerId);
            if (user_data?.user_id) {
              localStorage.setItem(
                `rquest_archived_chats_${user_data.user_id}`,
                JSON.stringify(next)
              );
            }
            return next;
          }
          return archived;
        });

        return {
          ...prev,
          [partnerId]: [...thread, updatedMsg],
        };
      });
    });

    const unsubSent = chatSocket.onMessageSent((sentMsg) => {
      if (!sentMsg || !sentMsg.receiver_id) return;
      if (!isMountedRef.current || !sentMsg || !sentMsg.receiver_id) return;
      const partnerId = sentMsg.receiver_id;

      setUserMenu((prev) => {
        const thread = prev[partnerId] || [];
        if (thread.some((m) => m.id === sentMsg.id)) return prev;

        const pendingIdx = thread.findIndex(
          (m) =>
            m.sender_id === user_data?.user_id &&
            String(m.id).startsWith('temp-') &&
            m.message === sentMsg.message
        );
        if (pendingIdx !== -1) {
          const updated = [...thread];
          updated[pendingIdx] = sentMsg;
          return {
            ...prev,
            [partnerId]: updated,
          };
        }

        return {
          ...prev,
          [partnerId]: [...thread, sentMsg],
        };
      });
    });

    const unsubTyping = chatSocket.onTyping((typingData) => {
      if (!isMountedRef.current) return;
      if (typingData.sender_id === selectedChat) {
        setIsTyping(Boolean(typingData.isTyping));

        if (receiverTypingResetRef.current) {
          clearTimeout(receiverTypingResetRef.current);
        }
        if (typingData.isTyping) {
          receiverTypingResetRef.current = setTimeout(() => {
            setIsTyping(false);
            if (isMountedRef.current) setIsTyping(false);
          }, 3500);
        }
      }
    });

    const unsubRead = chatSocket.onMessagesRead(({ message_ids, reader_id }) => {
      if (!isMountedRef.current) return;
      if (reader_id === selectedChat && Array.isArray(message_ids)) {
        setUserMenu((prev) => {
          const thread = prev[selectedChat] || [];
          return {
            ...prev,
            [selectedChat]: thread.map((m) =>
              message_ids.includes(m.id) ? { ...m, is_read: true } : m
            ),
          };
        });
      }
    });

    const unsubDeleted = chatSocket.onMessageDeleted((deletedData) => {
      if (!deletedData || !deletedData.id) return;
      if (!isMountedRef.current || !deletedData || !deletedData.id) return;
      const partnerId =
        deletedData.sender_id === user_data?.user_id
          ? deletedData.receiver_id
          : deletedData.sender_id;

      setUserMenu((prev) => {
        const thread = prev[partnerId] || [];
        return {
          ...prev,
          [partnerId]: thread.map((m) =>
            m.id === deletedData.id
              ? { ...m, is_deleted: true, message: '🚫 This message was deleted' }
              : m
          ),
        };
      });
    });

    const unsubPresence = chatSocket.onPresenceChange(({ userId, isOnline }) => {
      if (!isMountedRef.current) return;
      setUserStatus((prev) => ({
        ...prev,
        [userId]: { isOnline },
      }));
    });

    return () => {
      unsubReceive();
      unsubSent();
      unsubTyping();
      unsubRead();
      unsubDeleted();
      unsubPresence();
      if (receiverTypingResetRef.current) {
        clearTimeout(receiverTypingResetRef.current);
      }
    };
  }, [selectedChat, user_data]);

  // Handle typing debounce
  const handleInputChange = (val) => {
    if (!selectedChat) return;
    const thread = userMenu[selectedChat] || [];
    const lastMsgWithShop = thread.slice().reverse().find((m) => m.shop_id);
    const currentShopId =
      shop_id ||
      chatMetadata?.shop_id ||
      lastMsgWithShop?.shop_id ||
      browsingShop?.id ||
      null;

    if (!val || !val.trim()) {
      chatSocket.stopTyping({
        receiver_id: selectedChat,
        shop_id: currentShopId,
      });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      return;
    }

    chatSocket.startTyping({
      receiver_id: selectedChat,
      shop_id: currentShopId,
      username: user_data?.username,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      chatSocket.stopTyping({
        receiver_id: selectedChat,
        shop_id: currentShopId,
      });
      if (isMountedRef.current) {
        chatSocket.stopTyping({
          receiver_id: selectedChat,
          shop_id: currentShopId,
        });
      }
    }, 1500);
  };

  // Build sorted, filtered unified conversation list
  const conversationList = useMemo(() => {
    const userIds = Object.keys(userMenu).filter((k) => k !== user_data?.user_id);

    const list = userIds.map((partnerId) => {
      const thread = userMenu[partnerId] || [];
      const lastMsg = thread[thread.length - 1];
      const otherMsg = thread.find((m) => m.sender_id === partnerId) || lastMsg;

      const matchedShop = allShops.find(
        (s) => s.shop_id === (otherMsg?.shop_id || shop_id)
      );
      const shopName =
        otherMsg?.shop_name ||
        matchedShop?.shopChats?.shop_name ||
        (partnerId === receiver_id ? chatMetadata?.shop_name : '') ||
        (browsingShop?.owner_id === partnerId ? browsingShop.shop_name : '') ||
        '';

      const partnerName =
        otherMsg?.displayName ||
        shopName ||
        otherMsg?.username ||
        (partnerId === receiver_id ? (chatMetadata?.username || 'Store') : 'User');

      const unreadCount = thread.filter(
        (m) => !m.is_read && m.receiver_id === user_data?.user_id && !m.is_deleted
      ).length;

      const isArchived = archivedChats.includes(partnerId);
      const isOnline = userStatus[partnerId]?.isOnline || false;
      const lastTimestamp = lastMsg
        ? new Date(lastMsg.createdAt || lastMsg.updatedAt || 0).getTime()
        : 0;

      return {
        partnerId,
        name: partnerName,
        shopName,
        shopId: otherMsg?.shop_id,
        lastMsg,
        unreadCount,
        isArchived,
        isOnline,
        lastTimestamp,
        avatarColor: getAvatarColor(partnerName || 'U'),
      };
    });

    // Sort by latest activity descending
    list.sort((a, b) => b.lastTimestamp - a.lastTimestamp);

    // Filter by Tab (all, unread, archived)
    let filtered = list;
    if (activeFilter === 'all') {
      filtered = filtered.filter((c) => !c.isArchived);
    } else if (activeFilter === 'unread') {
      filtered = filtered.filter((c) => !c.isArchived && c.unreadCount > 0);
    } else if (activeFilter === 'archived') {
      filtered = filtered.filter((c) => c.isArchived);
    }

    // Filter by selected store dropdown
    if (selectedStoreFilter !== 'all') {
      filtered = filtered.filter((c) => c.shopId === selectedStoreFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.shopName?.toLowerCase().includes(q) ||
          c.lastMsg?.message?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [
    userMenu,
    userStatus,
    archivedChats,
    activeFilter,
    selectedStoreFilter,
    searchQuery,
    allShops,
    user_data,
    receiver_id,
    chatMetadata,
    shop_id,
    browsingShop,
  ]);

  // Tab counts
  const { allCount, unreadTabCount, archivedCount } = useMemo(() => {
    const userIds = Object.keys(userMenu).filter((k) => k !== user_data?.user_id);
    let all = 0;
    let unread = 0;
    let archived = 0;

    userIds.forEach((partnerId) => {
      const thread = userMenu[partnerId] || [];
      const hasUnread = thread.some(
        (m) => !m.is_read && m.receiver_id === user_data?.user_id && !m.is_deleted
      );
      const isArch = archivedChats.includes(partnerId);

      if (isArch) {
        archived++;
      } else {
        all++;
        if (hasUnread) unread++;
      }
    });

    return { allCount: all, unreadTabCount: unread, archivedCount: archived };
  }, [userMenu, archivedChats, user_data?.user_id]);

  // Active Partner Information
  const activePartnerInfo = useMemo(() => {
    if (!selectedChat) return null;
    const thread = userMenu[selectedChat] || [];
    const otherMsg = thread.find((m) => m.sender_id === selectedChat) || thread[thread.length - 1];

    const matchedShop = allShops.find(
      (s) => s.shop_id === (otherMsg?.shop_id || shop_id)
    );
    const shopName =
      otherMsg?.shop_name ||
      matchedShop?.shopChats?.shop_name ||
      chatMetadata?.shop_name ||
      (browsingShop?.owner_id === selectedChat ? browsingShop.shop_name : '') ||
      '';

    const displayName =
      otherMsg?.displayName ||
      shopName ||
      otherMsg?.username ||
      chatMetadata?.username ||
      (browsingShop?.owner_id === selectedChat ? browsingShop.shop_name : null) ||
      'Store';

    const isOnline = userStatus[selectedChat]?.isOnline || false;
    const isArchived = archivedChats.includes(selectedChat);

    return {
      id: selectedChat,
      name: displayName,
      username: otherMsg?.username || '',
      isOnline,
      shopName,
      isArchived,
      color: getAvatarColor(displayName),
    };
  }, [
    selectedChat,
    userMenu,
    userStatus,
    allShops,
    archivedChats,
    receiver_id,
    chatMetadata,
    shop_id,
    browsingShop,
  ]);

  const activeMessages = selectedChat ? userMenu[selectedChat] || [] : [];
  const showSidebar = !isMobileView || !selectedChat;
  const showChatPane = !isMobileView || Boolean(selectedChat);

  return (
    <div className="rquest-chat-overlay">
      <div className="rquest-chat-app">
        <MainContainer responsive>
          {/* Unified Inbox Sidebar */}
          {showSidebar && (
            <Sidebar position="left" scrollable={false}>
        <MainContainer>
          {/* Left Sidebar Pane (Kept in DOM to eliminate mobile unmounting crashes) */}
          <div
            className={`rquest-chat-sidebar-pane ${
              isMobileView && selectedChat ? 'rquest-mobile-hidden' : ''
            }`}
          >
            <Sidebar position="left" scrollable={false} style={{ width: '100%', height: '100%' }}>
              {/* Header */}
              <div className="rquest-sidebar-top-header">
                <div className="rquest-sidebar-title-badge">
                  <div className="rquest-sidebar-icon-wrap">
                    <MessageOutlined />
                  </div>
                  <span className="rquest-sidebar-title">Messages</span>
                </div>
                {/* Close Button on Sidebar for mobile view */}
                {isMobileView && (
                  <button
                    type="button"
                    className="rquest-header-btn rquest-header-close-btn"
                    onClick={handleChatClose}
                    title="Close Chat"
                  >
                    <CloseOutlined />
                  </button>
                )}
              </div>

              {/* Segmented Filter Pills */}
              <div className="rquest-chat-filter-tabs">
                <button
                  type="button"
                  className={`rquest-chat-filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('all')}
                >
                  All <span className="rquest-chat-filter-count">{allCount}</span>
                </button>
                <button
                  type="button"
                  className={`rquest-chat-filter-tab ${activeFilter === 'unread' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('unread')}
                >
                  Unread <span className="rquest-chat-filter-count">{unreadTabCount}</span>
                </button>
                <button
                  type="button"
                  className={`rquest-chat-filter-tab ${activeFilter === 'archived' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('archived')}
                >
                  <InboxOutlined style={{ fontSize: 11 }} /> Archived{' '}
                  <span className="rquest-chat-filter-count">{archivedCount}</span>
                </button>
              </div>

              {/* Store Filter Dropdown */}
              {allShops.length > 1 && (
                <div className="rquest-chat-store-filter-bar">
                  <Select
                    value={selectedStoreFilter}
                    onChange={(val) => setSelectedStoreFilter(val)}
                    size="small"
                    style={{ width: '100%' }}
                    suffixIcon={<FilterOutlined style={{ color: '#4f46e5' }} />}
                  >
                    <Select.Option value="all">
                      <span style={{ fontWeight: 600 }}>All Stores</span>
                    </Select.Option>
                    {allShops.map((shopItem, idx) => (
                      <Select.Option
                        key={shopItem.shop_id || idx}
                        value={shopItem.shop_id}
                      >
                        <ShopOutlined style={{ marginRight: 6, color: '#4f46e5' }} />
                        {shopItem.shopChats?.shop_name || `Store #${idx + 1}`}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
              )}

              {/* Modern Search Input */}
              <div className="rquest-chat-search-wrapper">
                <Input
                  placeholder="Search conversations..."
                  prefix={<SearchOutlined style={{ color: '#94a3b8', marginRight: 4 }} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  allowClear
                  style={{
                    borderRadius: 10,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: 13,
                    padding: '6px 12px',
                  }}
                />
              </div>

              {/* Conversation List */}
              <ConversationList loading={isChatLoading}>
                {conversationList.length === 0 && !isChatLoading ? (
                  <div className="rquest-chat-empty-state">
                    <MessageOutlined className="rquest-chat-empty-state-icon" />
                    <div className="rquest-chat-empty-state-title">
                      {activeFilter === 'archived'
                        ? 'No archived conversations'
                        : activeFilter === 'unread'
                        ? 'No unread messages'
                        : 'No conversations yet'}
                    </div>
                    <div className="rquest-chat-empty-state-desc" style={{ marginBottom: 12 }}>
                      {activeFilter === 'archived'
                        ? 'Archived messages will appear here.'
                        : 'Messages with store owners will appear here.'}
                    </div>
                    {browsingShop && activeFilter === 'all' && (
                      <button
                        type="button"
                        className="rquest-chat-start-btn"
                        onClick={() => handleStartChatWithShop(browsingShop)}
                        style={{ fontSize: 12, height: 36, padding: '0 12px' }}
                      >
                        <MessageOutlined /> Chat with {browsingShop.shop_name}
                      </button>
                    )}
                  </div>
                ) : (
                  conversationList.map((item) => {
                    const moreMenu = {
                      items: [
                        {
                          key: 'archive',
                          icon: item.isArchived ? <RollbackOutlined /> : <InboxOutlined />,
                          label: item.isArchived ? 'Unarchive chat' : 'Archive chat',
                          onClick: () => handleToggleArchive(item.partnerId),
                        },
                        {
                          key: 'delete',
                          icon: <DeleteOutlined />,
                          danger: true,
                          label: 'Delete conversation',
                          onClick: () => handleDeleteConversation(item.partnerId),
                        },
                      ],
                    };

                    return (
                      <Conversation
                        key={item.partnerId}
                        active={selectedChat === item.partnerId}
                        onClick={() => handleSelectConversation(item.partnerId)}
                      >
                        <Avatar
                          name={item.name}
                          style={{
                            backgroundColor: item.avatarColor,
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: 14,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span style={{ color: '#ffffff', fontWeight: 700 }}>
                            {(item.name || 'U')[0].toUpperCase()}
                          </span>
                          {item.isOnline && <Status status="available" />}
                        </Avatar>
                        <Conversation.Content
                          name={
                            <div className="rquest-conv-header-row">
                              <span className="rquest-conv-name">{item.name}</span>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                {item.lastMsg && (
                                  <span className="rquest-conv-time">
                                    {formatConversationTime(item.lastMsg.createdAt || item.lastMsg.updatedAt)}
                                  </span>
                                )}
                                {item.unreadCount > 0 && (
                                  <span className="rquest-conv-unread-badge">
                                    {item.unreadCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          }
                          info={
                            <div className="rquest-conv-body">
                              <div className="rquest-conv-snippet">
                                {item.lastMsg ? (
                                  item.lastMsg.is_deleted ? (
                                    <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>
                                      🚫 This message was deleted
                                    </span>
                                  ) : (
                                    <span>
                                      {item.lastMsg.sender_id === user_data?.user_id && (
                                        <span className="rquest-conv-you">You: </span>
                                      )}
                                      {item.lastMsg.message}
                                    </span>
                                  )
                                ) : (
                                  <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                                    Start a conversation
                                  </span>
                                )}
                              </div>
                              <div className="rquest-conv-meta-row">
                                {item.shopName ? (
                                  <span className="rquest-conv-store-tag">
                                    <ShopOutlined style={{ fontSize: 10 }} />
                                    <span>{item.shopName}</span>
                                  </span>
                                ) : (
                                  <span />
                                )}
                                <Dropdown menu={moreMenu} trigger={['click']} placement="bottomRight">
                                  <button
                                    type="button"
                                    className="rquest-conv-more-btn"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Options"
                                  >
                                    <MoreOutlined />
                                  </button>
                                </Dropdown>
                              </div>
                            </div>
                          }
                        />
                      </Conversation>
                    );
                  })
                )}
              </ConversationList>
            </Sidebar>
          )}
          </div>

          {/* Right Pane: Active Thread or Welcome Pane */}
          {showChatPane && (
            selectedChat && activePartnerInfo ? (
          {/* Right Main Pane (Kept in DOM to eliminate mobile unmounting crashes) */}
          <div
            className={`rquest-chat-main-pane ${
              isMobileView && !selectedChat ? 'rquest-mobile-hidden' : ''
            }`}
          >
            {selectedChat && activePartnerInfo ? (
              <ChatContainer>
                <ConversationHeader>
                  {isMobileView && (
                    <ConversationHeader.Back
                      onClick={() => setSelectedChat(null)}
                    />
                  )}
                  <Avatar
                    name={activePartnerInfo.name}
                    style={{
                      backgroundColor: activePartnerInfo.color,
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: 15,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ color: '#ffffff', fontWeight: 700 }}>
                      {(activePartnerInfo.name || 'U')[0].toUpperCase()}
                    </span>
                    {activePartnerInfo.isOnline && <Status status="available" />}
                  </Avatar>
                  <ConversationHeader.Content
                    userName={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
                          {activePartnerInfo.name}
                        </span>
                        {activePartnerInfo.shopName && (
                          <span className="rquest-header-store-badge">
                            <ShopOutlined /> {activePartnerInfo.shopName}
                          </span>
                        )}
                      </div>
                    }
                    info={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 2 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            backgroundColor: activePartnerInfo.isOnline ? '#10b981' : '#94a3b8',
                          }}
                        />
                        <span style={{ color: activePartnerInfo.isOnline ? '#10b981' : '#94a3b8', fontWeight: 500 }}>
                          {activePartnerInfo.isOnline ? 'Active now' : 'Offline'}
                        </span>
                      </div>
                    }
                  />
                  <ConversationHeader.Actions>
                    <div className="rquest-header-action-group">
                      <Dropdown
                        menu={{
                          items: [
                            {
                              key: 'archive',
                              icon: activePartnerInfo.isArchived ? <RollbackOutlined /> : <InboxOutlined />,
                              label: activePartnerInfo.isArchived ? 'Unarchive conversation' : 'Archive conversation',
                              onClick: () => handleToggleArchive(selectedChat),
                            },
                            {
                              key: 'delete_conv',
                              icon: <DeleteOutlined />,
                              danger: true,
                              label: 'Delete conversation',
                              onClick: () => handleDeleteConversation(selectedChat),
                            },
                          ],
                        }}
                        trigger={['click']}
                        placement="bottomRight"
                        destroyPopupOnHide
                      >
                        <button
                          type="button"
                          className="rquest-header-btn"
                          title="Conversation options"
                        >
                          <MoreOutlined />
                        </button>
                      </Dropdown>
                      <button
                        type="button"
                        className="rquest-header-btn rquest-header-close-btn"
                        onClick={handleChatClose}
                        title="Close Chat"
                      >
                        <CloseOutlined />
                      </button>
                    </div>
                  </ConversationHeader.Actions>
                </ConversationHeader>

                <MessageList
                  typingIndicator={
                    isTyping ? (
                      <TypingIndicator
                        content={`${activePartnerInfo.name} is typing...`}
                      />
                    ) : null
                  }
                >
                  {activeMessages.length === 0 ? (
                    <div className="rquest-chat-empty-state">
                      <MessageOutlined className="rquest-chat-empty-state-icon" />
                      <div className="rquest-chat-empty-state-title">
                        Start chatting with {activePartnerInfo.name}
                      </div>
                      <div className="rquest-chat-empty-state-desc">
                        Ask questions about items, check availability, or discuss orders!
                      </div>
                    </div>
                  ) : (
                    activeMessages.map((msg, index) => {
                      const isOutgoing = msg.sender_id === user_data?.user_id;
                      const timeStr = formatMessageTime(msg.createdAt);
                      const isDeleted = Boolean(msg.is_deleted);

                      const prevMsg = activeMessages[index - 1];
                      const showDateSeparator =
                        !prevMsg ||
                        new Date(msg.createdAt).toDateString() !==
                          new Date(prevMsg.createdAt).toDateString();

                      return (
                        <React.Fragment key={msg.id || index}>
                          {showDateSeparator && (
                            <MessageSeparator
                              content={
                                isToday(new Date(msg.createdAt))
                                  ? 'Today'
                                  : isYesterday(new Date(msg.createdAt))
                                  ? 'Yesterday'
                                  : format(new Date(msg.createdAt), 'MMMM d, yyyy')
                              }
                            />
                          )}
                          <Message
                            model={{
                              message: isDeleted ? '🚫 This message was deleted' : msg.message,
                              sentTime: timeStr,
                              sender: isOutgoing ? 'You' : activePartnerInfo.name,
                              direction: isOutgoing ? 'outgoing' : 'incoming',
                              position: 'single',
                            }}
                          >
                            <Message.Footer>
                              <div
                                className={`rquest-msg-meta ${
                                  isOutgoing ? 'outgoing' : 'incoming'
                                }`}
                              >
                                <span>{timeStr}</span>
                                {isOutgoing && !isDeleted && (
                                  <span>
                                    {msg.status === 'pending' ? (
                                      <LoadingOutlined
                                        style={{ fontSize: 10, color: '#94a3b8' }}
                                        title="Sending..."
                                      />
                                    ) : msg.is_read ? (
                                      <span className="read-ticks" title="Read (Seen)">
                                        <CheckOutlined style={{ fontSize: 10 }} />
                                        <CheckOutlined
                                          style={{ fontSize: 10, marginLeft: -5 }}
                                        />
                                      </span>
                                    ) : (
                                      <span className="sent-tick" title="Delivered">
                                        <CheckOutlined style={{ fontSize: 10 }} />
                                      </span>
                                    )}
                                  </span>
                                )}

                                {/* Delete Message Action (for sender's outgoing message) */}
                                {isOutgoing && !isDeleted && msg.status !== 'pending' && (
                                  <Popconfirm
                                    title="Delete message"
                                    description="Delete this message for everyone?"
                                    okText="Delete"
                                    cancelText="Cancel"
                                    okButtonProps={{ danger: true }}
                                    onConfirm={() => handleDeleteMessage(msg)}
                                  >
                                    <button
                                      type="button"
                                      className="rquest-msg-delete-btn"
                                      title="Delete message"
                                    >
                                      <DeleteOutlined />
                                    </button>
                                  </Popconfirm>
                                )}
                              </div>
                            </Message.Footer>
                          </Message>
                        </React.Fragment>
                      );
                    })
                  )}
                </MessageList>

                {/* Modern Chat Message Composer */}
                <div className="rquest-chat-composer">
                  <input
                    type="text"
                    className="rquest-chat-input-field"
                    placeholder="Type a message... (Press Enter to send)"
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      handleInputChange(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (inputText.trim()) {
                          handleSendMessage(inputText);
                          setInputText('');
                        }
                      }
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className={`rquest-chat-send-btn ${inputText.trim() ? 'active' : ''}`}
                    disabled={!inputText.trim()}
                    onClick={() => {
                      if (inputText.trim()) {
                        handleSendMessage(inputText);
                        setInputText('');
                      }
                    }}
                    title="Send Message"
                  >
                    <SendOutlined />
                  </button>
                </div>
              </ChatContainer>
            ) : (
              <div className="rquest-chat-welcome-pane">
                {/* Standalone Close Button for Welcome Screen */}
                <button
                  type="button"
                  className="rquest-standalone-close-btn"
                  onClick={handleChatClose}
                  title="Close Chat"
                >
                  <CloseOutlined />
                </button>

                <MessageOutlined
                  style={{ fontSize: 44, color: '#4f46e5', marginBottom: 14 }}
                />
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                  Direct Store Messages
                </div>
                <div style={{ fontSize: 13, color: '#64748b', maxWidth: 300, lineHeight: 1.5 }}>
                  Select an active conversation on the left, or chat directly with stores on Rquest.
                </div>

                {browsingShop && (
                  <div className="rquest-chat-current-store-card">
                    <div className="rquest-chat-card-tag">Store You're Viewing</div>
                    <div className="rquest-chat-card-title">{browsingShop.shop_name}</div>
                    <div className="rquest-chat-card-sub">
                      {browsingShop.area ? `${browsingShop.area} • ` : ''}Instant chat with the store owner
                    </div>
                    <button
                      type="button"
                      className="rquest-chat-start-btn"
                      onClick={() => handleStartChatWithShop(browsingShop)}
                    >
                      <MessageOutlined /> Start Chat with {browsingShop.shop_name}
                    </button>
                  </div>
                )}
              </div>
            )
          )}
            )}
          </div>
        </MainContainer>
      </div>
    </div>
  );
}

export default ChatApp;
