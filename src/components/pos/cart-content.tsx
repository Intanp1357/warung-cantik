"use client";

import { useState } from "react";
import {
  ImageIcon,
  MinusIcon,
  PlusIcon,
  ShoppingCartIcon,
  Trash2Icon,
} from "lucide-react";
import Image from "next/image";
import {
  getCartCount,
  getCartTotal,
  getLineTotal,
  lineKeyOf,
  useCart,
} from "@/hooks/use-cart";
import { formatRupiah, formatRupiahCompact } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { CheckoutDialog } from "@/components/pos/checkout-dialog";

interface CartContentProps {
  /** Called when checkout finishes (closes the mobile sheet). */
  onFinished?: () => void;
  /** Rendered as the empty-state action (e.g. "Browse products"). */
  onBrowse?: () => void;
}

export function CartContent({ onFinished, onBrowse }: CartContentProps) {
  const items = useCart((state) => state.items);
  const increment = useCart((state) => state.increment);
  const decrement = useCart((state) => state.decrement);
  const remove = useCart((state) => state.remove);
  const clear = useCart((state) => state.clear);

  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const total = getCartTotal(items);
  const count = getCartCount(items);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingCartIcon className="size-5" />}
        title="Your cart is empty"
        description="Start adding delicious products to your order."
        action={
          onBrowse ? (
            <Button variant="outline" size="sm" onClick={onBrowse}>
              Browse products
            </Button>
          ) : undefined
        }
        className="border-0 bg-transparent"
      />
    );
  }

  return (
    <>
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto py-1">
        {items.map((item) => {
          const canIncrease =
            item.stock === null || item.quantity < item.stock;
          const key = lineKeyOf(item);
          const toppings = item.toppings ?? [];

          return (
            <div
              key={key}
              className="flex items-center gap-3 rounded-xl border bg-card p-2.5"
            >
              <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-muted-foreground/60">
                    <ImageIcon className="size-4" aria-hidden />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatRupiahCompact(item.price)}
                </p>

                {toppings.length > 0 ? (
                  <ul className="mt-1 space-y-0.5">
                    {toppings.map((topping) => (
                      <li
                        key={topping.id}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      >
                        <span className="rounded-full bg-accent px-1.5 py-px text-[10px] font-semibold text-accent-foreground">
                          ×{topping.quantity}
                        </span>
                        <span className="truncate">{topping.name}</span>
                        <span className="ml-auto shrink-0">
                          {formatRupiahCompact(
                            topping.price * topping.quantity,
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-1.5 inline-flex h-7 items-center gap-1 rounded-lg bg-muted px-1">
                  <button
                    type="button"
                    onClick={() => decrement(key)}
                    aria-label={`Decrease ${item.name}`}
                    className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
                  >
                    <MinusIcon className="size-3.5" />
                  </button>
                  <span className="min-w-5 text-center text-xs font-semibold tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => increment(key)}
                    disabled={!canIncrease}
                    aria-label={`Increase ${item.name}`}
                    className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-40"
                  >
                    <PlusIcon className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={() => remove(key)}
                  aria-label={`Remove ${item.name} from cart`}
                  className="rounded-md p-1.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2Icon className="size-4" />
                </button>
                <p className="text-sm font-semibold">
                  {formatRupiahCompact(getLineTotal(item))}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-3 border-t pt-3">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Items</span>
            <span>{count}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-medium text-foreground">Subtotal</span>
            <span className="text-base font-semibold text-primary">
              {formatRupiah(total)}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Clear cart"
            onClick={clear}
            className="shrink-0"
          >
            <Trash2Icon />
          </Button>
          <Button
            type="button"
            className="h-10 flex-1"
            onClick={() => setCheckoutOpen(true)}
          >
            Checkout
          </Button>
        </div>
      </div>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        onFinished={onFinished}
      />
    </>
  );
}
