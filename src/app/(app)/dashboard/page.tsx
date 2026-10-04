import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  BarChart3Icon,
  HeartIcon,
  ReceiptTextIcon,
  ShoppingBagIcon,
  WalletIcon,
} from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { getDashboardData, type DashboardData } from "@/lib/queries/dashboard";
import { getTransactions } from "@/lib/queries/transactions";
import type { QueryResult } from "@/lib/queries/result";
import { DATE_RANGES, type DateRangeKey } from "@/lib/constants";
import { formatNumber, formatRupiah, greeting } from "@/lib/utils/format";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import {
  DashboardStatsSkeleton,
  RecentTransactionsSkeleton,
} from "@/components/shared/skeletons";
import { StatCard } from "@/components/dashboard/stat-card";
import { LazySalesChart } from "@/components/dashboard/lazy-sales-chart";
import { TransactionCard } from "@/components/transactions/transaction-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import type { Transaction } from "@/types";

export const metadata: Metadata = { title: "Dashboard" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Streams in as soon as the summary RPC answers. */
async function DashboardStats({
  promise,
  prefix,
}: {
  promise: Promise<QueryResult<DashboardData>>;
  prefix: string;
}) {
  const stats = await promise;

  if (stats.error) return <ErrorState message={stats.error} />;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={`${prefix} sales`}
          value={formatRupiah(stats.data.sales)}
          icon={<WalletIcon className="size-4" />}
        />
        <StatCard
          label={`${prefix} transactions`}
          value={formatNumber(stats.data.transactionCount)}
          icon={<ReceiptTextIcon className="size-4" />}
        />
        <StatCard
          label="Products sold"
          value={formatNumber(stats.data.itemsSold)}
          icon={<ShoppingBagIcon className="size-4" />}
        />
        <StatCard
          label="Average transaction"
          value={formatRupiah(stats.data.average)}
          icon={<BarChart3Icon className="size-4" />}
          hint="per sale"
        />
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sales Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <LazySalesChart data={stats.data.series} />
        </CardContent>
      </Card>
    </>
  );
}

/** Streams inside the "Recent transactions" card shell. */
async function RecentTransactionList({
  promise,
}: {
  promise: Promise<QueryResult<{ items: Transaction[]; count: number }>>;
}) {
  const recent = await promise;

  if (recent.error) return <ErrorState message={recent.error} />;

  if ((recent.data?.items.length ?? 0) === 0) {
    return (
      <EmptyState
        icon={<HeartIcon className="size-5" fill="currentColor" />}
        title="No transactions yet"
        description="Sales will show up here as soon as you check out an order."
        action={
          <Link href="/pos" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Open POS
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {recent.data?.items.map((transaction) => (
        <TransactionCard key={transaction.id} transaction={transaction} />
      ))}
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { profile } = await requireOwner();

  const params = await searchParams;
  const rangeValue = Array.isArray(params.range) ? params.range[0] : params.range;
  const range: DateRangeKey = ["today", "week", "month"].includes(rangeValue ?? "")
    ? (rangeValue as DateRangeKey)
    : "today";

  // Both queries start immediately and stream into independent sections —
  // no waterfall, and neither one blocks the page header.
  const statsPromise = getDashboardData(range);
  const recentPromise = getTransactions({ pageSize: 5 });

  const firstName = (profile.full_name || "there").split(" ")[0];
  const prefix =
    range === "today" ? "Today's" : range === "week" ? "This week's" : "This month's";

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${greeting()}, ${firstName}! 👋`}
        description="Here is how the shop is doing."
        action={
          <nav aria-label="Date range" className="flex gap-2">
            {DATE_RANGES.map((option) => (
              <Link
                key={option.value}
                href={`/dashboard?range=${option.value}`}
                aria-current={range === option.value ? "true" : undefined}
                className={cn(
                  buttonVariants({
                    variant: range === option.value ? "default" : "outline",
                    size: "sm",
                  }),
                  "rounded-full",
                )}
              >
                {option.label}
              </Link>
            ))}
          </nav>
        }
      />

      <div className="space-y-5">
        <Suspense fallback={<DashboardStatsSkeleton />}>
          <DashboardStats promise={statsPromise} prefix={prefix} />
        </Suspense>

        <Card className="rounded-2xl">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent transactions</CardTitle>
            <Link
              href="/transactions"
              className={cn(
                buttonVariants({ variant: "ghost", size: "xs" }),
                "text-primary",
              )}
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<RecentTransactionsSkeleton />}>
              <RecentTransactionList promise={recentPromise} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
