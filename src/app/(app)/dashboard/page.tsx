import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3Icon,
  HeartIcon,
  ReceiptTextIcon,
  ShoppingBagIcon,
  WalletIcon,
} from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries/dashboard";
import { getTransactions } from "@/lib/queries/transactions";
import { DATE_RANGES, type DateRangeKey } from "@/lib/constants";
import { formatNumber, formatRupiah, greeting } from "@/lib/utils/format";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { TransactionCard } from "@/components/transactions/transaction-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export const metadata: Metadata = { title: "Dashboard" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

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

  const [stats, recent] = await Promise.all([
    getDashboardData(range),
    getTransactions({ pageSize: 5 }),
  ]);

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

      {stats.error ? (
        <ErrorState message={stats.error} />
      ) : (
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
              <SalesChart data={stats.data.series} />
            </CardContent>
          </Card>
        </>
      )}

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
          {recent.error ? (
            <ErrorState message={recent.error} />
          ) : (recent.data?.items.length ?? 0) === 0 ? (
            <EmptyState
              icon={<HeartIcon className="size-5" fill="currentColor" />}
              title="No transactions yet"
              description="Sales will show up here as soon as you check out an order."
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
              {recent.data?.items.map((transaction) => (
                <TransactionCard key={transaction.id} transaction={transaction} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
