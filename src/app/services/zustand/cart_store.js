import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { isSellable, maxOrderQty } from '../../utils/stock';

const useCartStore = create(
  persist(
    (set, get) => ({
      cart: {
        shop_id: null,
        shop_name: '',
        owner_id: null,
        items: [],
      },
      isCartOpen: false,

      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),

      /**
       * Adds one unit. Returns { ok, reason } so callers can explain a refusal:
       *   reason 'out' (not sellable now) or 'max' (the counted stock is already in the cart).
       */
      addItem: (shop, item) => {
        if (!isSellable(item)) return { ok: false, reason: 'out' };
        const { cart } = get();
        // If cart belongs to a different shop, reset cart to new shop
        const isSameShop = cart.shop_id === shop?.id;
        const items = isSameShop ? [...cart.items] : [];
        const maxQty = maxOrderQty(item);

        const existingIndex = items.findIndex((i) => i.listing_id === item.id);
        if (existingIndex > -1) {
          const line = items[existingIndex];
          if (maxQty !== null && line.quantity >= maxQty) return { ok: false, reason: 'max', max: maxQty };
          items[existingIndex] = { ...line, quantity: line.quantity + 1, max_qty: maxQty, stock_issue: null };
        } else {
          items.push({
            listing_id: item.id,
            item_name: item.name,
            unit_price: parseFloat(item.price) || 0,
            quantity: 1,
            unit: item.unit || 'piece',
            img_url: item.img_url || '',
            listing_type: item.listing_type || 'product',
            max_qty: maxQty,
            stock_issue: null,
          });
        }

        set({
          cart: {
            shop_id: shop?.id,
            shop_name: shop?.shop_name,
            owner_id: shop?.owner_id || (isSameShop ? cart.owner_id : null),
            items,
          },
        });
        return { ok: true };
      },

      updateQuantity: (listing_id, delta) => {
        const { cart } = get();
        const items = cart.items
          .map((i) => {
            if (i.listing_id === listing_id) {
              let newQty = i.quantity + delta;
              const cap = i.stock_issue ? i.stock_issue.available : i.max_qty;
              if (delta > 0 && cap !== null && cap !== undefined) newQty = Math.min(newQty, cap);
              if (newQty <= 0) return null;
              const fixed = i.stock_issue && newQty <= i.stock_issue.available;
              return { ...i, quantity: newQty, stock_issue: fixed ? null : i.stock_issue };
            }
            return i;
          })
          .filter(Boolean);

        set({
          cart: {
            ...cart,
            shop_id: items.length === 0 ? null : cart.shop_id,
            shop_name: items.length === 0 ? '' : cart.shop_name,
            owner_id: items.length === 0 ? null : cart.owner_id,
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
            owner_id: items.length === 0 ? null : cart.owner_id,
            items,
          },
        });
      },

      /**
       * Marks lines the server refused (409 OUT_OF_STOCK items: [{ listing_id, available }]).
       * The line keeps its quantity until the customer fixes it.
       */
      markStockIssues: (issues) => {
        const { cart } = get();
        const byId = new Map((issues || []).map((it) => [it.listing_id, it]));
        set({
          cart: {
            ...cart,
            items: cart.items.map((i) => {
              const hit = byId.get(i.listing_id);
              if (!hit) return i;
              const available = Math.max(0, Number(hit.available) || 0);
              return { ...i, max_qty: available, stock_issue: { available } };
            }),
          },
        });
      },

      /** Lowers marked lines to what is available and removes the ones with nothing left. */
      resolveStockIssues: () => {
        const { cart } = get();
        const items = cart.items
          .map((i) => {
            if (!i.stock_issue) return i;
            const available = i.stock_issue.available;
            return available > 0 ? { ...i, quantity: Math.min(i.quantity, available), stock_issue: null } : null;
          })
          .filter(Boolean);
        set({
          cart: {
            ...cart,
            shop_id: items.length === 0 ? null : cart.shop_id,
            shop_name: items.length === 0 ? '' : cart.shop_name,
            owner_id: items.length === 0 ? null : cart.owner_id,
            items,
          },
        });
      },

      clearCart: () => {
        set({
          cart: {
            shop_id: null,
            shop_name: '',
            owner_id: null,
            items: [],
          },
          isCartOpen: false,
          pendingCheckout: false,
        });
      },

      pendingCheckout: false,
      setPendingCheckout: (val) => set({ pendingCheckout: val }),
    }),
    {
      name: 'rquest-cart-storage',
      storage: createJSONStorage(() => localStorage),
      // isCartOpen is a transient UI signal (it now means "go to /cart"); never restore it on load
      partialize: (state) => {
        const { isCartOpen, ...rest } = state; // eslint-disable-line no-unused-vars
        return rest;
      },
      // ...and drop a stale value saved by older builds (it would redirect to /cart once)
      merge: (persisted, current) => ({ ...current, ...(persisted || {}), isCartOpen: false }),
    }
  )
);

export default useCartStore;

