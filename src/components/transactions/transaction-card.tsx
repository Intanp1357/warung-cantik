import Link from "next/link";
import { ChevronRightIcon, Clock3Icon } from "lucide-react";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { formatDateTime, formatRupiah } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { Transaction } from "@/types";

export function TransactionCard({ transaction }: { transaction: Transaction }) {
  const itemCount = transaction.item_count ?? 0;

  return (
    <article className="flex items-center gap-3 rounded-2xl border bg-card p-4">
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="truncate font-mono text-sm font-semibold tracking-tight">
          {transaction.transaction_code}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock3Icon className="size-3.5" />
          {formatDateTime(transaction.created_at)}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {PAYMENT_METHOD_LABELS[transaction.payment_method]}
          </Badge>
          {transaction.created_by_name ? (
            <span className="text-xs text-muted-foreground">
              {transaction.created_by_name}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <p className="text-base font-semibold text-primary">
          {formatRupiah(transaction.total_amount)}
        </p>
        <p className="text-xs text-muted-foreground">
          {itemCount} item
        </p>
        <Link
          href={`/transactions/${transaction.id}`}
          className={buttonVariants({ variant: "outline", size: "xs" })}
        >
          Lihat detail
          <ChevronRightIcon />
        </Link>
      </div>
    </article>
  );
}
