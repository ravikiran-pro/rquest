import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      cart: {
        shop_id: null,
        shop_name: '',
        items: [],
      },
      isCartOpen: false,

      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),

      addItem: (shop, item) => {
        const { cart } = get();
        // If cart belongs to a different shop, reset cart to new shop
        const isSameShop = cart.shop_id === shop.id;
        let items = isSameShop ? [...cart.items] : [];

        const existingIndex = items.findIndex((i) => i.listing_id === item.id);
        if (existingIndex > -1) {
          items[existingIndex].quantity += 1;
        } else {
          items.push({
            listing_id: item.id,
            item_name: item.name,
            unit_price: parseFloat(item.price) || 0,
            quantity: 1,
            unit: item.unit || 'piece',
            img_url: item.img_url || '',
          });
        }

        set({
          cart: {
            shop_id: shop.id,
            shop_name: shop.shop_name,
            items,
          },
        });
      },

      updateQuantity: (listing_id, delta) => {
        const { cart } = get();
        const items = cart.items
          .map((i) => {
            if (i.listing_id === listing_id) {
              const newQty = i.quantity + delta;
              return newQty > 0 ? { ...i, quantity: newQty } : null;
            }
            return i;
          })
          .filter(Boolean);

        set({
          cart: {
            ...cart,
            shop_id: items.length === 0 ? null : cart.shop_id,
            shop_name: items.length === 0 ? '' : cart.shop_name,
            items,
          },
        });
      },

      removeItem: (listing_id) => {
        const { cart } = get();
        const items = cart.items.filter((i) => i.listing_id !== listing_id);
        set({
          cart: {
            ...cart,
            shop_id: items.length === 0 ? null : cart.shop_id,
            shop_name: items.length === 0 ? '' : cart.shop_name,
            items,
          },
        });
      },

      clearCart: () => {
        set({
          cart: {
            shop_id: null,
            shop_name: '',
            items: [],
          },
          isCartOpen: false,
          pendingCheckout: false,
        },
        );
      },

      pendingCheckout: false,
      setPendingCheckout: (val) => set({ pendingCheckout: val }),
    }),
    {
      name: 'rquest-cart-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useCartStore;

