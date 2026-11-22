/**
 * 购物车状态管理 / Cart Store
 * @description 管理购物车本地状态（商品数量、总价等）
 * @module store/cartStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  addItem: (product: any, variant: any, quantity: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      totalItems: 0,
      subtotal: 0,

      addItem: (product, variant, quantity) => {
        const items = [...get().items];
        const existingIndex = items.findIndex(
          item => item.product_id === product.id && item.variant_id === variant?.id
        );

        if (existingIndex >= 0) {
          items[existingIndex].quantity += quantity;
        } else {
          items.push({
            id: Date.now().toString(),
            cart_id: '',
            product_id: product.id,
            variant_id: variant?.id,
            quantity,
            unit_price: variant?.price || product.price,
            subtotal: (variant?.price || product.price) * quantity,
            name: product.name,
            image: product.primary_image,
            in_stock: product.available_stock > 0,
          });
        }

        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

        set({ items, totalItems, subtotal });
      },

      removeItem: (itemId) => {
        const items = get().items.filter(item => item.id !== itemId);
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        set({ items, totalItems, subtotal });
      },

      updateQuantity: (itemId, quantity) => {
        const items = get().items.map(item =>
          item.id === itemId ? { ...item, quantity, subtotal: item.unit_price * quantity } : item
        );
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        set({ items, totalItems, subtotal });
      },

      clearCart: () => set({ items: [], totalItems: 0, subtotal: 0 }),
    }),
    { name: 'cart-storage' }
  )
);
