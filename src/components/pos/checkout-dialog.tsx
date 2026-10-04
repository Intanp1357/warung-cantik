"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BanknoteIcon,
  CircleCheckIcon,
  LandmarkIcon,
  Loader2Icon,
  QrCodeIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import {
  createTransactionAction,
  type CheckoutData,
} from "@/lib/actions/checkout";
import { getCartTotal, useCart } from "@/hooks/use-cart";
import { CASH_PRESETS, PAYMENT_METHODS } from "@/lib/constants";
import { formatRupiah } from "@/lib/utils/format";
import { notifyQueueChanged } from "@/lib/utils/queue-events";
import type { PaymentMethod } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const METHOD_ICONS: Record<PaymentMethod, React.ComponentType<{ className?: string }>> = {
  cash: BanknoteIcon,
  qris: QrCodeIcon,
  transfer: LandmarkIcon,
};

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinished?: () => void;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  onFinished,
}: CheckoutDialogProps) {
  const items = useCart((state) => state.items);
  const clear = useCart((state) => state.clear);
  // Idempotency key: stays the same while the cart is unchanged, so retrying a
  // failed payment can never record the sale twice.
  const checkoutReference = useCart((state) => state.checkoutReference);

  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CheckoutData | null>(null);

  const total = getCartTotal(items);
  const cashAmount = Number(amount || 0);
  const paymentAmount = method === "cash" ? cashAmount : total;
  const change = Math.max(0, paymentAmount - total);
  const insufficient = method === "cash" && cashAmount < total;

  const handleOpenChange = (next: boolean) => {
    if (pending) return;
    if (!next) {
      setResult(null);
      setAmount("");
    }
    onOpenChange(next);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (items.length === 0 || insufficient || pending) return;

    setPending(true);
    try {
      const response = await createTransactionAction({
        items: items.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
        payment_method: method,
        payment_amount: paymentAmount,
        client_reference: checkoutReference,
      });

      if (!response.ok) {
        toast.error(response.error);
        return;
      }

      setResult(response.data);
      clear();
      notifyQueueChanged();
    } catch {
      // Network hiccup: the retry below reuses the same client reference, so
      // the server will never record the sale twice.
      toast.error("Connection problem. Check the network and try again.");
    } finally {
      setPending(false);
    }
  };

  const finish = () => {
    handleOpenChange(false);
    onFinished?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        {result ? (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
              <CircleCheckIcon className="size-7" />
            </span>
            <div className="space-y-1">
              <p className="font-semibold">Transaction completed</p>
              <p className="text-sm text-muted-foreground">
                Save this code for the receipt.
              </p>
              <p className="mt-2 inline-block rounded-lg bg-muted px-3 py-1.5 font-mono text-sm font-semibold tracking-tight">
                {result.transaction_code}
              </p>
            </div>

            <div className="w-full space-y-1.5 rounded-xl bg-muted p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment method</span>
                <span className="font-medium capitalize">{method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Queue</span>
                <span className="font-medium">
                  {result.item_count} product
                  {result.item_count === 1 ? "" : "s"} waiting
                </span>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-2">
              <Button variant="outline" asChild>
                <Link
                  href={`/transactions/${result.id}`}
                  onClick={() => {
                    handleOpenChange(false);
                    onFinished?.();
                  }}
                >
                  View detail
                </Link>
              </Button>
              <Button onClick={finish}>New order</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <DialogHeader>
              <DialogTitle>Checkout</DialogTitle>
              <DialogDescription>
                Confirm the payment to save this transaction.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-xl font-semibold text-primary">
                  {formatRupiah(total)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Payment method</p>
              <div
                role="radiogroup"
                aria-label="Payment method"
                className="grid grid-cols-3 gap-2"
              >
                {PAYMENT_METHODS.map((option) => {
                  const Icon = METHOD_ICONS[option.value];
                  const active = method === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setMethod(option.value)}
                      className={cn(
                        "flex h-16 flex-col items-center justify-center gap-1 rounded-xl border text-sm font-medium transition-colors",
                        active
                          ? "border-primary bg-accent text-accent-foreground"
                          : "bg-card text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <Icon className="size-5" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {method === "cash" ? (
              <div className="space-y-2">
                <label htmlFor="payment-amount" className="text-sm font-medium">
                  Payment amount
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                    Rp
                  </span>
                  <Input
                    id="payment-amount"
                    inputMode="numeric"
                    autoComplete="off"
                    value={amount}
                    onChange={(event) =>
                      setAmount(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="0"
                    className="h-10 pl-9 text-base font-semibold"
                    aria-invalid={insufficient}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() => setAmount(String(total))}
                  >
                    Exact
                  </Button>
                  {CASH_PRESETS.map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => setAmount(String(preset))}
                    >
                      {formatRupiah(preset)}
                    </Button>
                  ))}
                </div>

                {insufficient ? (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    Payment amount is less than the total.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                The payment amount is set automatically for {method} payments.
              </p>
            )}

            <div className="flex items-center justify-between rounded-xl border bg-card p-4">
              <span className="text-sm text-muted-foreground">Change</span>
              <span className="text-lg font-semibold">
                {formatRupiah(change)}
              </span>
            </div>

            <Button
              type="submit"
              className="h-11 w-full text-base"
              disabled={pending || items.length === 0 || insufficient}
            >
              {pending ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm payment"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
