"use client";

import Image from "next/image";
import { ImageIcon, MinusIcon, PlusIcon } from "lucide-react";
import { cn } from "cn";
import { useCart } from "@/hooks/use-cart";
import { formatRupiahCompact } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import type { ProductWithCategory } from "@/types";

interface ProductCardProps {
  product: ProductWithCategory;
}

export function ProductCard({ product }: ProductCardProps) {
  const items = useCart((state) => state.items);
  const add = useCart((state) => state.add);
  const increment = useCart((state) => state.increment);
  const decrement = useCart((state) => state.decrement);

  const inCart = items.find((item) => item.id === product.id);
  const quantity = inCart?.quantity ?? 0;

  const unavailable = !product.is_available;
  const outOfStock = product.stock !== null && product.stock <= 0;
  const maxReached =
    product.stock !== null && quantity >= product.stock;
  const canAdd = !unavailable && !outOfStock && !maxReached;
  const soldOut = unavailable || outOfStock;

  const handleAdd = () => {
    if (!canAdd) return;
    add({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      stock: product.stock,
    });
  };

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border bg-card transition-shadow",
        soldOut ? "opacity-70" : "hover:shadow-sm",
      )}
    >
      <div className="relative aspect-square bg-muted">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/60">
            <ImageIcon className="size-8" aria-hidden />
          </div>
        )}

        {unavailable ? (
          <span className="absolute top-2 left-2 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            Unavailable
          </span>
        ) : null}

        {!unavailable && product.stock !== null && product.stock <= 5 ? (
          <span className="absolute top-2 left-2 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
            {product.stock === 0 ? "Out of stock" : `${product.stock} left`}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 min-h-9 text-sm leading-snug font-medium">
          {product.name}
        </h3>
        <p className="text-sm font-semibold text-primary">
          {formatRupiahCompact(product.price)}
        </p>

        <div className="mt-auto pt-2">
          {quantity > 0 ? (
            <div className="flex h-9 items-center justify-between rounded-lg bg-accent px-1 text-accent-foreground">
              <button
                type="button"
                onClick={() => decrement(product.id)}
                aria-label={`Remove one ${product.name}`}
                className="grid size-7 place-items-center rounded-md transition-colors hover:bg-white/70"
              >
                <MinusIcon className="size-4" />
              </button>
              <span className="text-sm font-semibold tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => (quantity === 0 ? handleAdd() : canAdd && increment(product.id))}
                disabled={!canAdd}
                aria-label={`Add one ${product.name}`}
                className="grid size-7 place-items-center rounded-md transition-colors hover:bg-white/70 disabled:opacity-40"
              >
                <PlusIcon className="size-4" />
              </button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              className="h-9 w-full"
              onClick={handleAdd}
              disabled={!canAdd}
            >
              {soldOut ? "Sold out" : "Add"}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
