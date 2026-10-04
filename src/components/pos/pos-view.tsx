"use client";

import { useState } from "react";
import { ShoppingCartIcon } from "lucide-react";
import { formatRupiah } from "@/lib/utils/format";
import { getCartCount, getCartTotal, useCart } from "@/hooks/use-cart";
import { ProductCatalog } from "@/components/products/product-catalog";
import { CartPanel } from "@/components/pos/cart-panel";
import { CartContent } from "@/components/pos/cart-content";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Category, ProductWithCategory } from "@/types";

interface POSViewProps {
  products: ProductWithCategory[];
  categories: Category[];
}

export function POSView({ products, categories }: POSViewProps) {
  const [cartOpen, setCartOpen] = useState(false);
  const items = useCart((state) => state.items);

  const count = getCartCount(items);
  const total = getCartTotal(items);

  return (
    <>
      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          <ProductCatalog products={products} categories={categories} />
        </div>

        <aside className="hidden w-[350px] shrink-0 lg:block xl:w-[380px]">
          <div className="sticky top-6">
            <CartPanel />
          </div>
        </aside>
      </div>

      {/* Mobile: floating cart bar above the bottom navigation */}
      <div className="no-print fixed inset-x-0 bottom-14 z-40 border-t bg-card px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          disabled={count === 0}
          className="flex h-11 w-full items-center justify-between rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
        >
          <span className="flex items-center gap-2">
            <ShoppingCartIcon className="size-4" />
            {count === 0 ? "Keranjang kosong" : `${count} item`}
          </span>
          <span className="flex items-center gap-2">
            {count > 0 ? formatRupiah(total) : null}
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
              Lihat keranjang
            </span>
          </span>
        </button>
      </div>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[88vh] gap-3 rounded-t-2xl"
        >
          <SheetHeader className="border-b pb-3">
            <SheetTitle>Keranjangmu 🛒</SheetTitle>
          </SheetHeader>
          <CartContent
            onFinished={() => setCartOpen(false)}
            onBrowse={() => setCartOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
