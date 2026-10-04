"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { newId } from "@/lib/utils/id";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  /** Snapshot of the stock at add time — the server re-validates on checkout. */
  stock: number | null;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  /**
   * Idempotency key for the current cart: it changes whenever the cart changes
   * (and after a successful checkout), so retrying the same cart reuses the key
   * and the server can recognise the replay instead of creating a second
   * transaction.
   */
  checkoutReference: string;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  remove: (id: string) => void;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  clear: () => void;
}

const MAX_QUANTITY = 999;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      checkoutReference: newId(),

      add: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((entry) => entry.id === item.id);
          if (existing) {
            return {
              checkoutReference: newId(),
              items: state.items.map((entry) =>
                entry.id === item.id
                  ? {
                      ...entry,
                      quantity: Math.min(MAX_QUANTITY, entry.quantity + quantity),
                    }
                  : entry,
              ),
            };
          }
          return {
            checkoutReference: newId(),
            items: [
              ...state.items,
              { ...item, quantity: Math.min(MAX_QUANTITY, quantity) },
            ],
          };
        }),

      remove: (id) =>
        set((state) => ({
          checkoutReference: newId(),
          items: state.items.filter((i) => i.id !== id),
        })),

      increment: (id) =>
        set((state) => ({
          checkoutReference: newId(),
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, quantity: Math.min(MAX_QUANTITY, item.quantity + 1) }
              : item,
          ),
        })),

      decrement: (id) =>
        set((state) => ({
          checkoutReference: newId(),
          items: state.items.flatMap((item) => {
            if (item.id !== id) return [item];
            if (item.quantity <= 1) return [];
            return [{ ...item, quantity: item.quantity - 1 }];
          }),
        })),

      clear: () => set({ items: [], checkoutReference: newId() }),
    }),
    {
      name: "warung-pos-cart",
      // Loaded after mount so the first client render matches the server.
      skipHydration: true,
    },
  ),
);

/** Loads the persisted cart once, after hydration. */
export function getCartCount(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function getCartTotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}
