"use client";

import { ShoppingCartIcon } from "lucide-react";
import { useCart, getCartCount } from "@/hooks/use-cart";
import { CartContent } from "@/components/pos/cart-content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Persistent desktop cart panel. */
export function CartPanel() {
  const items = useCart((state) => state.items);
  const count = getCartCount(items);

  return (
    <Card className="flex h-[calc(100vh-7.5rem)] flex-col rounded-2xl">
      <CardHeader className="flex-row items-center justify-between border-b py-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingCartIcon className="size-4 text-primary" />
          Your Cart
        </CardTitle>
        <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
          {count} {count === 1 ? "item" : "items"}
        </span>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <CartContent />
      </CardContent>
    </Card>
  );
}
