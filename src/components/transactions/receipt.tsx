import { APP_NAME, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import {
  formatDate,
  formatNumber,
  formatTime,
} from "@/lib/utils/format";
import type { ShopSettings, Transaction } from "@/types";

interface ReceiptProps {
  transaction: Transaction;
  shop: ShopSettings | null;
}

/** Clean receipt layout — optimised for browser / thermal printing. */
export function Receipt({ transaction, shop }: ReceiptProps) {
  const items = transaction.items ?? [];

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border bg-card p-5 shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <div className="text-center">
        <p className="text-base font-semibold tracking-tight">
          {shop?.shop_name ?? APP_NAME}
        </p>
        {shop?.address ? (
          <p className="text-xs text-muted-foreground">{shop.address}</p>
        ) : null}
        {shop?.phone ? (
          <p className="text-xs text-muted-foreground">{shop.phone}</p>
        ) : null}
      </div>

      <div className="my-3 border-t border-dashed" />

      <div className="flex items-start justify-between gap-3 font-mono text-xs">
        <div>
          <p className="font-semibold">{transaction.transaction_code}</p>
          <p className="text-muted-foreground">
            {formatDate(transaction.created_at)} {formatTime(transaction.created_at)}
          </p>
        </div>
        <div className="text-right text-muted-foreground">
          <p>Kasir</p>
          <p className="text-foreground">{transaction.created_by_name ?? "-"}</p>
        </div>
      </div>

      <div className="my-3 border-t border-dashed" />

      <div className="space-y-3 font-mono text-xs">
        {items.map((item) => (
          <div key={item.id}>
            <p className="text-[13px] font-semibold">{item.product_name}</p>
            <div className="flex justify-between text-muted-foreground">
              <span>
                {item.quantity} x {formatNumber(item.price)}
              </span>
              <span className="font-medium text-foreground">
                {formatNumber(item.subtotal)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="my-3 border-t border-dashed" />

      <div className="space-y-1.5 font-mono text-xs">
        <div className="flex justify-between text-[13px] font-bold">
          <span>TOTAL</span>
          <span>{formatNumber(transaction.total_amount)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>{PAYMENT_METHOD_LABELS[transaction.payment_method].toUpperCase()}</span>
          <span>{formatNumber(transaction.payment_amount)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>CHANGE</span>
          <span>{formatNumber(transaction.change_amount)}</span>
        </div>
      </div>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        {shop?.receipt_footer ?? "Thank you! ♡"}
      </p>
    </div>
  );
}
