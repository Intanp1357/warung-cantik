import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HeartIcon } from "lucide-react";
import { getTransactions } from "@/lib/queries/transactions";
import {
  startOfMonth,
  startOfToday,
  startOfWeek,
} from "@/lib/utils/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TransactionListSkeleton } from "@/components/shared/skeletons";
import { TransactionCard } from "@/components/transactions/transaction-card";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export const metadata: Metadata = { title: "Transactions" };

const PAGE_SIZE = 20;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const search = first(params.q) ?? "";
  const rangeValue = first(params.range);
  const range = ["today", "week", "month"].includes(rangeValue ?? "")
    ? (rangeValue as "today" | "week" | "month")
    : "all";
  const methodValue = first(params.method);
  const method = ["cash", "qris", "transfer"].includes(methodValue ?? "")
    ? (methodValue as "cash" | "qris" | "transfer")
    : "all";
  const page = Math.max(1, Number(first(params.page) ?? 1) || 1);

  const from =
    range === "today"
      ? startOfToday().toISOString()
      : range === "week"
        ? startOfWeek().toISOString()
        : range === "month"
          ? startOfMonth().toISOString()
          : undefined;

  const result = await getTransactions({
    search,
    from,
    method,
    page,
    pageSize: PAGE_SIZE,
  });

  const buildHref = (nextPage: number) => {
    const query = new URLSearchParams();
    if (search) query.set("q", search);
    if (range !== "all") query.set("range", range);
    if (method !== "all") query.set("method", method);
    if (nextPage > 1) query.set("page", String(nextPage));
    const suffix = query.toString();
    return suffix ? `/transactions?${suffix}` : "/transactions";
  };

  const totalPages = Math.max(1, Math.ceil((result.data?.count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Transaction History"
        description="Every sale, searchable and printable."
      />

      <Suspense fallback={<TransactionListSkeleton />}>
        <TransactionFilters
          search={search}
          range={range}
          method={method}
        />
      </Suspense>

      {result.error ? (
        <ErrorState message={result.error} />
      ) : (result.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          icon={<HeartIcon className="size-5" fill="currentColor" />}
          title="No transactions yet"
          description="Your transaction history will appear here."
          action={
            <Link
              href="/pos"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Open POS
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {result.data?.items.map((transaction) => (
            <TransactionCard key={transaction.id} transaction={transaction} />
          ))}
        </div>
      )}

      {totalPages > 1 && !result.error ? (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between gap-2"
        >
          {page > 1 ? (
            <Link
              href={buildHref(page - 1)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Previous
            </Link>
          ) : (
            <span
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "pointer-events-none opacity-40",
              )}
            >
              Previous
            </span>
          )}

          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={buildHref(page + 1)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Next
            </Link>
          ) : (
            <span
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "pointer-events-none opacity-40",
              )}
            >
              Next
            </span>
          )}
        </nav>
      ) : null}
    </div>
  );
}
