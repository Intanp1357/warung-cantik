"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { newId } from "@/lib/utils/id";

/** A topping picked for one cart line. `id` is the topping product's id. */
export interface CartTopping {
  id: string;
  name: string;
  price: number;
  /** Stock snapshot at pick time — the server re-validates on checkout. */
  stock: number | null;
  quantity: number;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  /** Snapshot of the stock at add time — the server re-validates on checkout. */
  stock: number | null;
  quantity: number;
  /** Toppings chosen for this line; `[]` when the product has none. */
  toppings: CartTopping[];
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
  remove: (lineKey: string) => void;
  increment: (lineKey: string) => void;
  decrement: (lineKey: string) => void;
  clear: () => void;
}

const MAX_QUANTITY = 999;

/**
 * Identity of a cart line: the product alone is not enough, because the same
 * product with different toppings has to stay a separate line
 * (e.g. "Seblak" and "Seblak + Kerupuk").
 *
 * Only the *set* of toppings defines the line — quantities are mutable state
 * that grows when the cashier picks the same combination again
 * (2 portions with an egg each = 2 product + 2 egg).
 * A line without toppings keeps its plain product id, so a cart saved by an
 * older build still resolves correctly.
 */
export function cartLineKey(
  productId: string,
  toppings?: CartTopping[] | null,
): string {
  if (!toppings || toppings.length === 0) return productId;

  const signature = [...toppings]
    .map((topping) => topping.id)
    .sort()
    .join(",");

  return `${productId}|${signature}`;
}

export function lineKeyOf(item: Pick<CartItem, "id" | "toppings">): string {
  return cartLineKey(item.id, item.toppings);
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      checkoutReference: newId(),

      add: (item, quantity = 1) =>
        set((state) => {
          const key = cartLineKey(item.id, item.toppings);
          const existing = state.items.find((entry) => lineKeyOf(entry) === key);

          // Same product + same toppings → the line grows: one more portion
          // plus the topping quantities that were just picked.
          if (existing) {
            const picked = item.toppings ?? [];

            return {
              checkoutReference: newId(),
              items: state.items.map((entry) => {
                if (lineKeyOf(entry) !== key) return entry;

                return {
                  ...entry,
                  quantity: Math.min(MAX_QUANTITY, entry.quantity + quantity),
                  toppings: picked.reduce<CartTopping[]>(
                    (list, topping) =>
                      list.map((current) =>
                        current.id === topping.id
                          ? {
                              ...current,
                              quantity: Math.min(
                                MAX_QUANTITY,
                                current.quantity + topping.quantity,
                              ),
                            }
                          : current,
                      ),
                    entry.toppings ?? [],
                  ),
                };
              }),
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

      remove: (lineKey) =>
        set((state) => ({
          checkoutReference: newId(),
          items: state.items.filter((item) => lineKeyOf(item) !== lineKey),
        })),

      increment: (lineKey) =>
        set((state) => ({
          checkoutReference: newId(),
          items: state.items.map((item) =>
            lineKeyOf(item) === lineKey
              ? { ...item, quantity: Math.min(MAX_QUANTITY, item.quantity + 1) }
              : item,
          ),
        })),

      decrement: (lineKey) =>
        set((state) => ({
          checkoutReference: newId(),
          items: state.items.flatMap((item) => {
            if (lineKeyOf(item) !== lineKey) return [item];
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

/** Units in the cart, toppings included. */
export function getCartCount(items: CartItem[]): number {
  return items.reduce((total, item) => total + getLineCount(item), 0);
}

/** Units of one line, toppings included. */
export function getLineCount(item: CartItem): number {
  const toppings = item.toppings ?? [];
  return toppings.reduce((sum, topping) => sum + topping.quantity, item.quantity);
}

/** Price of one line: product × quantity + every topping × its quantity. */
export function getLineTotal(item: CartItem): number {
  const toppings = item.toppings ?? [];
  const toppingTotal = toppings.reduce(
    (sum, topping) => sum + topping.price * topping.quantity,
    0,
  );
  return item.price * item.quantity + toppingTotal;
}

export function getCartTotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + getLineTotal(item), 0);
}
