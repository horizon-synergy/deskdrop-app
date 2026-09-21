/**
 * cartStore.ts
 * ----------------------------------------------------------------------------
 * Client-side shopping cart state. Uses Zustand's `persist` middleware to
 * back the store with `localStorage`, so a visitor's cart survives a page
 * refresh or closing the tab — standard, expected behavior for an
 * e-commerce cart, and safe here because this is real browser
 * localStorage in a deployed web app (not the sandboxed artifact
 * environment, which has a separate, unrelated restriction against
 * browser storage APIs).
 *
 * The cart is keyed by `${productId}_${variantId}` so adding the same
 * variant twice increments quantity rather than creating a duplicate row.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartLineItem } from '@/types/cart.types';
import { sumMoney } from '@/lib/utils/money';
import type { Money } from '@/types/common.types';

function lineKey(productId: string, variantId: string): string {
  return `${productId}_${variantId}`;
}

interface CartState {
  /** Keyed by lineKey() for O(1) lookup/update when adding an item already in the cart. */
  itemsByKey: Record<string, CartLineItem>;
}

interface CartActions {
  addItem: (item: Omit<CartLineItem, 'quantity'>, quantity?: number) => void;
  updateQuantity: (productId: string, variantId: string, quantity: number) => void;
  removeItem: (productId: string, variantId: string) => void;
  clear: () => void;
}

type CartStore = CartState & CartActions;

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      itemsByKey: {},

      addItem: (item, quantity = 1) => {
        set((state) => {
          const key = lineKey(item.productId, item.variantId);
          const existing = state.itemsByKey[key];
          const nextQuantity = (existing?.quantity ?? 0) + quantity;
          return {
            itemsByKey: {
              ...state.itemsByKey,
              [key]: { ...item, quantity: nextQuantity },
            },
          };
        });
      },

      updateQuantity: (productId, variantId, quantity) => {
        set((state) => {
          const key = lineKey(productId, variantId);
          const existing = state.itemsByKey[key];
          if (!existing) return state;

          if (quantity <= 0) {
            const { [key]: _removed, ...rest } = state.itemsByKey;
            return { itemsByKey: rest };
          }
          return {
            itemsByKey: { ...state.itemsByKey, [key]: { ...existing, quantity } },
          };
        });
      },

      removeItem: (productId, variantId) => {
        set((state) => {
          const key = lineKey(productId, variantId);
          const { [key]: _removed, ...rest } = state.itemsByKey;
          return { itemsByKey: rest };
        });
      },

      clear: () => set({ itemsByKey: {} }),
    }),
    {
      name: 'deskdrop-cart', // localStorage key
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/* -------------------------------------------------------------------------- *
 * Derived selectors — small pure functions built on top of the store's raw
 * state, so components read a stable computed shape instead of each
 * re-deriving totals from itemsByKey inline.
 * -------------------------------------------------------------------------- */

export function useCartItems(): CartLineItem[] {
  return useCartStore((state) => Object.values(state.itemsByKey));
}

export function useCartItemCount(): number {
  return useCartStore((state) =>
    Object.values(state.itemsByKey).reduce((count, item) => count + item.quantity, 0),
  );
}

export function useCartSubtotal(): Money {
  const items = useCartItems();
  if (items.length === 0) return { amountInMinorUnits: 0, currency: 'USD' };
  const currency = items[0]?.unitPrice.currency ?? 'USD';
  return sumMoney(
    items.map((item) => ({
      amountInMinorUnits: item.unitPrice.amountInMinorUnits * item.quantity,
      currency: item.unitPrice.currency,
    })),
    currency,
  );
}
