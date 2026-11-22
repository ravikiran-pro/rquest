import React, { useState, useEffect, useRef, useMemo } from 'react';
import './styles.css';
import {
  CloseOutlined,
  ShopOutlined,
  DeleteOutlined,
  InboxOutlined,
  MoreOutlined,
  RollbackOutlined,
  SearchOutlined,
  SendOutlined,
  FilterOutlined,
  PaperClipOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import ChatIcon from '../common/ChatIcon';
import { Dropdown, Select, Input, message, Tooltip } from 'antd';
import {
  MainContainer,
  Sidebar,
  ConversationList,
  Conversation,
  ConversationHeader,
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
import { config } from '../../utils/config';
import { colors } from '../../styles';
import ChatAttachmentPreview from './ChatAttachmentPreview';
import ChatMessageItem from './ChatMessageItem';
import NewChatModal from './NewChatModal';

const AVATAR_PALETTE = [
  colors.primary, // Maritime Navy (#C2542B)
  colors.secondary, // Radiant Cobalt (#3D6B4F)
  colors.tertiary, // Roasted Amber-Brown (#5B3A29)
  colors.semantic.success, // Emerald (#059669)
  colors.primaryContainer, // Cobalt Container (#D9714A)
  colors.secondaryHover, // Deep Cobalt (#2F5540)
  colors.semantic.warningHover, // Warm Amber (#d97706)
  colors.tertiaryHover, // Deep Espresso (#472919)
  colors.tertiaryContainer, // Umber Container (#926a56)
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

  const timeStr = `${format(date, 'h:mm')}\u00A0${format(date, 'a')}`;
  if (isToday(date)) {
    return timeStr;
  } else if (isYesterday(date)) {
    return `Yesterday ${timeStr}`;
  }
  return `${format(date, 'MMM d')}, ${timeStr}`;
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

  // Dialog behaviour: focus moves into the panel, Escape closes it, focus returns to the opener
  const overlayRef = useRef(null);
  useEffect(() => {
    const opener = document.activeElement;
    overlayRef.current?.focus();
    return () => {
      if (opener && opener !== document.body && opener.isConnected && typeof opener.focus === 'function') {
        opener.focus();
      }
    };
  }, []);

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
  const [typingUsers, setTypingUsers] = useState({});
  const [isChatLoading, setIsChatLoading] = useState(true);
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  const [browsingShop, setBrowsingShop] = useState(null);

  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  const isMountedRef = useRef(true);
  const typingTimeoutRef = useRef(null);
  const receiverTypingResetRef = useRef(null);
  const composerInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageListRef = useRef(null);
  const isUserNearBottomRef = useRef(true);

  // Smooth / instant auto-scroll to latest message
  const scrollToBottom = (behavior = 'smooth') => {
    if (messageListRef.current?.scrollToBottom) {
      try {
        messageListRef.current.scrollToBottom(behavior);
      } catch {
        // Fallback to DOM scroll if library method throws
      }
    }
    const scrollWrapper = document.querySelector('.cs-message-list__scroll-wrapper');
    if (scrollWrapper) {
      if (behavior === 'smooth') {
        scrollWrapper.scrollTo({ top: scrollWrapper.scrollHeight, behavior: 'smooth' });
      } else {
        scrollWrapper.scrollTop = scrollWrapper.scrollHeight;
      }
    }
  };

  // Track user scroll position in message list to avoid interrupting older message reads
  useEffect(() => {
    const scrollWrapper = document.querySelector('.cs-message-list__scroll-wrapper');
    if (!scrollWrapper) return;

    const handleScroll = () => {
      const threshold = 140;
      const isAtBottom =
        scrollWrapper.scrollHeight - scrollWrapper.scrollTop - scrollWrapper.clientHeight <= threshold;
      isUserNearBottomRef.current = isAtBottom;
    };

    scrollWrapper.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollWrapper.removeEventListener('scroll', handleScroll);
  }, [selectedChat]);

  // Initial conversation load / switch: snap to bottom instantly
  useEffect(() => {
    if (selectedChat) {
      isUserNearBottomRef.current = true;
      const timer = setTimeout(() => {
        scrollToBottom('auto');
      }, 70);
      return () => clearTimeout(timer);
    }
  }, [selectedChat]);

  // Handle async image attachment load inside messages
  const handleImageLoad = () => {
    if (isUserNearBottomRef.current) {
      scrollToBottom('smooth');
    }
  };

  // Upload attachment item to backend
  const uploadAttachmentItem = async (item) => {
    const formData = new FormData();
    formData.append('file', item.file);

    try {
      const token =
        sessionStorage.getItem('auth_token') ||
        localStorage.getItem('auth_token');
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(
        `${config.api_url}/api/v1/${apiConfig.chat_upload}`,
        {
          method: 'POST',
          headers,
          body: formData,
        }
      );
      const json = await response.json();
      if (!isMountedRef.current) return;

      if (json && json.success && json.data) {
        setPendingAttachments((prev) =>
          prev.map((a) =>
            a.id === item.id
              ? {
                  ...a,
                  status: 'ready',
                  uploadedUrl: json.data.url,
                  type: json.data.type || a.type,
                  name: json.data.name || a.name,
                  size: json.data.size || a.size,
                }
              : a
          )
        );
      } else {
        throw new Error(json?.message || 'Upload failed');
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Failed to upload file:', err);
      setPendingAttachments((prev) =>
        prev.map((a) =>
          a.id === item.id
            ? { ...a, status: 'error', error: err.message || 'Upload failed' }
            : a
        )
      );
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';

    const MAX_SIZE = 15 * 1024 * 1024; // 15MB
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'application/pdf',
    ];

    const newPending = [];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        message.error(`${file.name}: Only images (PNG, JPG, WebP, GIF) and PDF files are allowed.`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        message.error(`${file.name}: Exceeds maximum size limit of 15MB.`);
        continue;
      }

      const id = `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const isPdf = file.type === 'application/pdf';
      const previewUrl = !isPdf ? URL.createObjectURL(file) : null;

      const item = {
        id,
        file,
        name: file.name,
        size: file.size,
        type: isPdf ? 'pdf' : 'image',
        mimeType: file.type,
        previewUrl,
        status: 'uploading',
      };
      newPending.push(item);
      uploadAttachmentItem(item);
    }

    if (newPending.length > 0) {
      setPendingAttachments((prev) => [...prev, ...newPending]);
    }
  };

  const handleRemoveAttachment = (id) => {
    setPendingAttachments((prev) => {
      const removed = prev.find((a) => a.id === id);
      if (removed?.previewUrl && removed.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleRetryAttachment = (item) => {
    setPendingAttachments((prev) =>
      prev.map((a) =>
        a.id === item.id ? { ...a, status: 'uploading', error: null } : a
      )
    );
    uploadAttachmentItem(item);
  };

  // Track mounted status to prevent React state update on unmounted component
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (receiverTypingResetRef.current) clearTimeout(receiverTypingResetRef.current);
    };
  }, []);

  // Direct typing: Automatically direct focus to composer input when opening/switching conversations
  useEffect(() => {
    if (selectedChat) {
      const focusTimer = setTimeout(() => {
        composerInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(focusTimer);
    }
  }, [selectedChat]);


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

  // Track responsive screen size safely
  useEffect(() => {
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
      if (isMountedRef.current) {
        console.error('Failed to load messages:', err);
      }
    } finally {
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
            ? { ...m, is_deleted: true, message: 'This message was deleted' }
            : m
        ),
      }));
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Failed to delete message:', err);
      }
    }
  };

  // Send message with custom text and attachments support
  const handleSendMessage = async (customText = null) => {
    const rawText = typeof customText === 'string' ? customText : inputText;
    const trimmed = rawText.trim();

    const readyAttachments = pendingAttachments.filter((a) => a.status === 'ready');
    const hasUploading = pendingAttachments.some((a) => a.status === 'uploading');

    if (hasUploading) {
      message.warning('Please wait for attachments to finish uploading.');
      return;
    }

    if (!trimmed && readyAttachments.length === 0) return;
    if (!selectedChat || selectedChat === user_data?.user_id) return;

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

    const formattedAttachments = readyAttachments.map((a) => ({
      url: a.uploadedUrl,
      name: a.name,
      type: a.type,
      size: a.size,
      mimeType: a.mimeType,
    }));

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      sender_id: user_data?.user_id,
      receiver_id: selectedChat,
      username: user_data?.username || 'Me',
      message: trimmed,
      message_type: 'custom',
      attachments: formattedAttachments,
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

    // Reset input and clear attachments
    setInputText('');
    setPendingAttachments([]);
    if (composerInputRef.current) {
      composerInputRef.current.style.height = '40px';
      composerInputRef.current.style.overflowY = 'hidden';
    }

    // Auto-scroll to bottom on user send
    isUserNearBottomRef.current = true;
    setTimeout(() => scrollToBottom('smooth'), 50);

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
        message_type: 'custom',
        attachments: formattedAttachments,
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
          if (isUserNearBottomRef.current) {
            setTimeout(() => scrollToBottom('smooth'), 60);
          }
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
      if (!isMountedRef.current || !typingData) return;
      const senderId = String(typingData.sender_id);
      const isTypingNow = Boolean(typingData.isTyping);

      setTypingUsers((prev) => ({
        ...prev,
        [senderId]: isTypingNow,
      }));

      if (String(selectedChat) === senderId) {
        setIsTyping(isTypingNow);

        if (receiverTypingResetRef.current) {
          clearTimeout(receiverTypingResetRef.current);
        }
        if (isTypingNow) {
          receiverTypingResetRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              setIsTyping(false);
              setTypingUsers((prev) => ({ ...prev, [senderId]: false }));
            }
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
              ? { ...m, is_deleted: true, message: 'This message was deleted' }
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
        sender_id: user_data?.user_id,
      });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      return;
    }

    chatSocket.startTyping({
      receiver_id: selectedChat,
      shop_id: currentShopId,
      username: user_data?.username,
      sender_id: user_data?.user_id,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      chatSocket.stopTyping({
        receiver_id: selectedChat,
        shop_id: currentShopId,
        sender_id: user_data?.user_id,
      });
    }, 1800);
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
  return (
    <div
      className="rquest-chat-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Messages"
      tabIndex={-1}
      ref={overlayRef}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          handleChatClose();
        }
      }}
    >
      <div className="rquest-chat-app">
        <MainContainer responsive={false}>
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
                    <ChatIcon />
                  </div>
                  <span className="rquest-sidebar-title">Messages</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    className="rquest-sidebar-compose-btn"
                    onClick={() => setShowNewChatModal(true)}
                    title="Start new conversation"
                    aria-label="Start new conversation"
                  >
                    <PlusOutlined style={{ fontSize: 11 }} />
                    <span>New</span>
                  </button>
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
                    suffixIcon={<FilterOutlined style={{ color: colors.primary }} />}
                  >
                    <Select.Option value="all">
                      <span style={{ fontWeight: 600 }}>All Stores</span>
                    </Select.Option>
                    {allShops.map((shopItem, idx) => (
                      <Select.Option
                        key={shopItem.shop_id || idx}
                        value={shopItem.shop_id}
                      >
                        <ShopOutlined style={{ marginRight: 6, color: colors.primary }} />
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
                  prefix={<SearchOutlined style={{ color: 'var(--text-light, #7A7268)', marginRight: 6 }} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  allowClear
                  style={{
                    borderRadius: 10,
                    background: 'var(--surface-container-low, #F6F1E9)',
                    border: '1px solid var(--border-color, #E6DED2)',
                    fontSize: 13,
                    padding: '6px 12px',
                    color: 'var(--text-main, #2A2620)',
                    fontFamily: "var(--font-body, 'Inter', sans-serif)",
                  }}
                />
              </div>

              {/* Conversation List */}
              <ConversationList loading={isChatLoading}>
                {conversationList.length === 0 && !isChatLoading ? (
                  <div className="rquest-chat-empty-state">
                    <ChatIcon className="rquest-chat-empty-state-icon" />
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
                        <ChatIcon /> Chat with {browsingShop.shop_name}
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
                        role="button"
                        tabIndex={0}
                        aria-label={`Open chat with ${item.name || 'user'}`}
                        aria-current={selectedChat === item.partnerId ? 'true' : undefined}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectConversation(item.partnerId);
                          }
                        }}
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
                                {typingUsers[item.partnerId] ? (
                                  <span className="rquest-conv-live-typing">
                                    <span className="rquest-typing-dots-bubble">
                                      <span className="dot dot-1" />
                                      <span className="dot dot-2" />
                                      <span className="dot dot-3" />
                                    </span>
                                    <span>typing...</span>
                                  </span>
                                ) : item.lastMsg ? (
                                  item.lastMsg.is_deleted ? (
                                    <span style={{ fontStyle: 'italic', color: 'var(--text-light, #7A7268)' }}>
                                      This message was deleted
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
                                  <span style={{ color: 'var(--text-light, #7A7268)', fontStyle: 'italic' }}>
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
          </div>

          {/* Right Main Pane (Kept in DOM to eliminate mobile unmounting crashes) */}
          <div
            className={`rquest-chat-main-pane ${
              isMobileView && !selectedChat ? 'rquest-mobile-hidden' : ''
            }`}
          >
            {selectedChat && activePartnerInfo ? (
              <div className="cs-chat-container">
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
                  <ConversationHeader.Content>
                    <div className="rquest-header-name-container">
                      <span className="rquest-header-title-text" title={activePartnerInfo.name}>
                        {activePartnerInfo.name}
                      </span>
                      {activePartnerInfo.shopName && (
                        <span className="rquest-header-store-badge" title={activePartnerInfo.shopName}>
                          <ShopOutlined /> <span>{activePartnerInfo.shopName}</span>
                        </span>
                      )}
                    </div>
                    {isTyping ? (
                      <div className="rquest-header-typing-status animate-fade-in">
                        <span className="rquest-typing-dots-bubble">
                          <span className="dot dot-1" />
                          <span className="dot dot-2" />
                          <span className="dot dot-3" />
                        </span>
                        <span style={{ color: colors.primary, fontWeight: 600 }}>typing...</span>
                      </div>
                    ) : (
                      <div className="rquest-header-presence-status">
                        <span
                          className={`rquest-presence-dot ${activePartnerInfo.isOnline ? 'online' : 'offline'}`}
                        />
                        <span className={`rquest-presence-label ${activePartnerInfo.isOnline ? 'online' : 'offline'}`}>
                          {activePartnerInfo.isOnline ? 'Active now' : 'Offline'}
                        </span>
                      </div>
                    )}
                  </ConversationHeader.Content>
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
                  ref={messageListRef}
                  autoScrollToBottom={true}
                  autoScrollToBottomOnMount={true}
                  scrollBehavior="smooth"
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
                      <ChatIcon className="rquest-chat-empty-state-icon" />
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
                              sentTime: timeStr,
                              sender: isOutgoing ? 'You' : activePartnerInfo.name,
                              direction: isOutgoing ? 'outgoing' : 'incoming',
                              position: 'single',
                            }}
                          >
                            <Message.CustomContent>
                              <ChatMessageItem
                                msg={msg}
                                isOutgoing={isOutgoing}
                                timeStr={timeStr}
                                onDeleteMessage={handleDeleteMessage}
                                onImageLoad={handleImageLoad}
                              />
                            </Message.CustomContent>
                          </Message>
                        </React.Fragment>
                      );
                    })
                  )}
                </MessageList>

                {/* Pre-send Attachment Preview Bar */}
                <ChatAttachmentPreview
                  attachments={pendingAttachments}
                  onRemove={handleRemoveAttachment}
                  onRetry={handleRetryAttachment}
                />

                {/* Chat Message Composer with Attachment & Multiline Input */}
                <div className="rquest-chat-composer">
                  {/* Hidden file input for images & PDFs */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,application/pdf"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />

                  {/* Attachment button */}
                  <Tooltip title="Attach Image or PDF">
                    <button
                      type="button"
                      className="rquest-chat-attach-btn"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Add attachment"
                    >
                      <PaperClipOutlined />
                    </button>
                  </Tooltip>

                  {/* Multiline auto-resizing textarea (Enter to send, Shift + Enter for newline) */}
                  <textarea
                    ref={composerInputRef}
                    rows={1}
                    className="rquest-chat-textarea"
                    placeholder="Type a message..."
                    value={inputText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInputText(val);
                      handleInputChange(val);
                      e.target.style.height = 'auto';
                      const nextHeight = Math.min(e.target.scrollHeight, 120);
                      e.target.style.height = `${Math.max(nextHeight, 40)}px`;
                      e.target.style.overflowY = e.target.scrollHeight > 120 ? 'auto' : 'hidden';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />

                  {/* Send Button */}
                  <button
                    type="button"
                    className={`rquest-chat-send-btn ${
                      (inputText.trim() || pendingAttachments.some((a) => a.status === 'ready')) &&
                      !pendingAttachments.some((a) => a.status === 'uploading')
                        ? 'active'
                        : ''
                    }`}
                    disabled={
                      (!inputText.trim() && !pendingAttachments.some((a) => a.status === 'ready')) ||
                      pendingAttachments.some((a) => a.status === 'uploading')
                    }
                    onClick={() => handleSendMessage()}
                    title="Send Message"
                    aria-label="Send Message"
                  >
                    <SendOutlined />
                  </button>
                </div>
              </div>
            ) : (
              <div className="rquest-chat-welcome-pane">
                {/* Standalone Close Button for Welcome Screen */}
                <button
                  type="button"
                  className="rquest-standalone-close-btn"
                  onClick={handleChatClose}
                  title="Close Chat"
                  aria-label="Close Chat"
                >
                  <CloseOutlined />
                </button>

                <ChatIcon
                  style={{ fontSize: 44, color: colors.primary, marginBottom: 14 }}
                />
                <div
                  style={{
                    fontFamily: "var(--font-headline, 'Fraunces', sans-serif)",
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--text-main, #2A2620)',
                    marginBottom: 6,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Direct Store Messages
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-body, 'Inter', sans-serif)",
                    fontSize: 13,
                    color: 'var(--text-muted, #5C554B)',
                    maxWidth: 300,
                    lineHeight: 1.5,
                  }}
                >
                  Select an active conversation on the left, or start a new chat with any store on Rquest.
                </div>

                <button
                  type="button"
                  className="rquest-chat-start-btn"
                  style={{ marginTop: 16, maxWidth: 260 }}
                  onClick={() => setShowNewChatModal(true)}
                >
                  <PlusOutlined /> Start a New Conversation
                </button>

                {browsingShop && (
                  <div className="rquest-chat-current-store-card">
                    <div className="rquest-chat-card-tag">Store You&apos;re Viewing</div>
                    <div className="rquest-chat-card-title">{browsingShop.shop_name}</div>
                    <div className="rquest-chat-card-sub">
                      {browsingShop.area ? `${browsingShop.area} • ` : ''}Instant chat with the store owner
                    </div>
                    <button
                      type="button"
                      className="rquest-chat-start-btn"
                      onClick={() => handleStartChatWithShop(browsingShop)}
                    >
                      <ChatIcon /> Start Chat with {browsingShop.shop_name}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </MainContainer>
      </div>

      {/* Start New Conversation Modal */}
      <NewChatModal
        visible={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onStartChat={(partnerId, shopId, metadata) => {
          setSelectedChat(partnerId);
          setUserMenu((prev) => ({
            ...prev,
            [partnerId]: prev[partnerId] || [],
          }));
          if (metadata?.shop_name) {
            setBrowsingShop((prev) => prev || { id: shopId, shop_name: metadata.shop_name, owner_id: partnerId });
          }
        }}
        shops={allShops}
        recentUsers={Object.keys(userMenu).map((uid) => {
          const thread = userMenu[uid] || [];
          const last = thread[thread.length - 1];
          return {
            id: uid,
            displayName: last?.displayName || last?.username || 'User',
            username: last?.username,
            shop_id: last?.shop_id,
            shop_name: last?.shop_name,
          };
        })}
        userRole={user_data?.role || 'customer'}
      />
    </div>
  );
}

export default ChatApp;
