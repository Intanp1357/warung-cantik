"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

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

      add: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((entry) => entry.id === item.id);
          if (existing) {
            return {
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
            items: [
              ...state.items,
              { ...item, quantity: Math.min(MAX_QUANTITY, quantity) },
            ],
          };
        }),

      remove: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      increment: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, quantity: Math.min(MAX_QUANTITY, item.quantity + 1) }
              : item,
          ),
        })),

      decrement: (id) =>
        set((state) => ({
          items: state.items.flatMap((item) => {
            if (item.id !== id) return [item];
            if (item.quantity <= 1) return [];
            return [{ ...item, quantity: item.quantity - 1 }];
          }),
        })),

      clear: () => set({ items: [] }),
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
