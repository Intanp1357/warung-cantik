"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ImageIcon, MinusIcon, PlusIcon } from "lucide-react";
import { cn } from "cn";
import { useCart, type CartTopping } from "@/hooks/use-cart";
import { formatRupiah } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProductWithCategory } from "@/types";

const MAX_TOPPING_QUANTITY = 999;

interface ToppingDialogProps {
  /** Product being ordered — `null` closes the dialog. */
  product: ProductWithCategory | null;
  /** Products of the topping category. */
  toppings: ProductWithCategory[];
  onOpenChange: (open: boolean) => void;
}

interface Choice {
  product: ProductWithCategory;
  quantity: number;
  max: number;
  disabled: boolean;
}

/**
 * Lets the cashier pick toppings (each with its own quantity) before a line
 * is added to the cart. The base product stays a single cart line, so the
 * receipt and the kitchen queue show one row per product.
 */
export function ToppingDialog({
  product,
  toppings,
  onOpenChange,
}: ToppingDialogProps) {
  return (
    <Dialog open={product !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        {product ? (
          <ToppingPicker
            key={product.id}
            product={product}
            toppings={toppings}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ToppingPicker({
  product,
  toppings,
  onClose,
}: {
  product: ProductWithCategory;
  toppings: ProductWithCategory[];
  onClose: () => void;
}) {
  const add = useCart((state) => state.add);
  // Unmounted whenever the dialog closes, so every order starts fresh.
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const choices: Choice[] = useMemo(
    () =>
      toppings
        .filter((topping) => topping.id !== product.id)
        .map((topping) => {
          const max =
            topping.stock === null ? MAX_TOPPING_QUANTITY : topping.stock;
          return {
            product: topping,
            quantity: quantities[topping.id] ?? 0,
            max,
            disabled: !topping.is_available || topping.stock === 0,
          };
        }),
    [toppings, quantities, product.id],
  );

  const selected = choices.filter(
    (choice) => !choice.disabled && choice.quantity > 0,
  );
  const toppingTotal = selected.reduce(
    (sum, choice) => sum + choice.product.price * choice.quantity,
    0,
  );
  const total = product.price + toppingTotal;

  const setQuantity = (id: string, next: number, max: number) => {
    setQuantities((previous) => ({
      ...previous,
      [id]: Math.max(0, Math.min(next, max)),
    }));
  };

  const handleAdd = () => {
    const picked: CartTopping[] = selected.map((choice) => ({
      id: choice.product.id,
      name: choice.product.name,
      price: choice.product.price,
      stock: choice.product.stock,
      quantity: choice.quantity,
    }));

    add({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      stock: product.stock,
      toppings: picked,
    });

    onClose();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{product.name}</DialogTitle>
        <DialogDescription>
          {choices.length > 0
            ? "Optional — leave everything at 0 to order it plain."
            : "No toppings are available right now."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-sm">
          <span className="text-muted-foreground">Base price</span>
          <span className="font-semibold">{formatRupiah(product.price)}</span>
        </div>

        {choices.length > 0 ? (
          <div className="space-y-2">
            {choices.map((choice) => (
              <div
                key={choice.product.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-2.5",
                  choice.disabled && "opacity-60",
                )}
              >
                <div className="size-9 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {choice.product.image_url ? (
                    <Image
                      src={choice.product.image_url}
                      alt={choice.product.name}
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted-foreground/60">
                      <ImageIcon className="size-4" aria-hidden />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {choice.product.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {choice.disabled
                      ? choice.product.is_available
                        ? "Sold out"
                        : "Not available"
                      : `+${formatRupiah(choice.product.price)}`}
                  </p>
                </div>

                <div className="inline-flex h-8 items-center gap-1 rounded-lg bg-muted px-1">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity(
                        choice.product.id,
                        choice.quantity - 1,
                        choice.max,
                      )
                    }
                    disabled={choice.disabled || choice.quantity === 0}
                    aria-label={`Remove one ${choice.product.name}`}
                    className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-40"
                  >
                    <MinusIcon className="size-3.5" />
                  </button>
                  <span className="min-w-5 text-center text-xs font-semibold tabular-nums">
                    {choice.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity(
                        choice.product.id,
                        choice.quantity + 1,
                        choice.max,
                      )
                    }
                    disabled={choice.disabled || choice.quantity >= choice.max}
                    aria-label={`Add one ${choice.product.name}`}
                    className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-40"
                  >
                    <PlusIcon className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="space-y-1 rounded-xl bg-muted p-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Toppings</span>
            <span>{formatRupiah(toppingTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Total</span>
            <span className="text-base font-semibold text-primary">
              {formatRupiah(total)}
            </span>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button type="button" onClick={handleAdd}>
          Add to cart
        </Button>
      </DialogFooter>
    </>
  );
}
