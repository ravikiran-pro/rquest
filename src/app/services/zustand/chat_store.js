import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useChatStore = create(
  persist(
    (set, get) => ({
      isChat: false,
      receiver_id: null,
      shop_id: null,
      handleChatOpen: (receiver_id, shop_id) =>
        set(() => ({
          isChat: true,
          receiver_id: receiver_id,
          shop_id: shop_id,
        })),

      handleChatClose: (isChat) => set(() => ({ isChat: false })),
      updateShop: (shop_id) =>
      set(() => ({
        shop_id: shop_id,
      })),
    }),
    {
      name: 'chat-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => sessionStorage), // (optional) by default, 'localStorage' is used
    }
  )
);

export default useChatStore;
