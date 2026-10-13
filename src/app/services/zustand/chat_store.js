import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useChatStore = create(
  persist(
    (set, get) => ({
      isChat: false,
      receiver_id: null,
      shop_id: null,
      chatMetadata: null, // e.g. { username, shop_name }
      unreadTotal: 0,

      handleChatOpen: (receiver_id = null, shop_id = null, chatMetadata = null) =>
        set(() => ({
          isChat: true,
          receiver_id: receiver_id,
          shop_id: shop_id,
          chatMetadata: chatMetadata,
        })),

      handleChatClose: () =>
        set(() => ({
          isChat: false,
        })),

      updateShop: (shop_id) =>
        set(() => ({
          shop_id: shop_id,
        })),

      setReceiver: (receiver_id) =>
        set(() => ({
          receiver_id: receiver_id,
        })),

      setUnreadTotal: (count) =>
        set(() => ({
          unreadTotal: Math.max(0, Number(count) || 0),
        })),

      decrementUnread: (count = 1) =>
        set((state) => ({
          unreadTotal: Math.max(0, state.unreadTotal - count),
        })),

      incrementUnread: (count = 1) =>
        set((state) => ({
          unreadTotal: state.unreadTotal + count,
        })),
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export default useChatStore;
