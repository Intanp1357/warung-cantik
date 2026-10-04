"use client";

import { useEffect } from "react";
import { useCart } from "@/hooks/use-cart";

/** Loads the persisted cart once, after hydration (avoids SSR mismatch). */
export function CartProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void useCart.persist.rehydrate();
  }, []);

  return <>{children}</>;
}
