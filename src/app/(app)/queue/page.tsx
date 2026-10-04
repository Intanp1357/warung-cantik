import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getQueue } from "@/lib/queries/queue";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { QueueBoard } from "@/components/queue/queue-board";
import { cn } from "cn";
import type { QueueStatus } from "@/types";

export const metadata: Metadata = { title: "Queue" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATUS_TABS: { status: QueueStatus; label: string }[] = [
  { status: "pending", label: "Pending" },
  { status: "done", label: "Served" },
  { status: "cancelled", label: "Cancelled" },
];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseStatus(value: string | undefined): QueueStatus {
  if (value === "done" || value === "cancelled") return value;
  return "pending";
}

export default async function QueuePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireSession();

  const params = await searchParams;
  const status = parseStatus(first(params.status));

  const result = await getQueue(status);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Product Queue"
        description="Every checked-out product, until it is served."
      />

      <nav aria-label="Queue filters" className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const active = tab.status === status;

          return (
            <Link
              key={tab.status}
              href={`/queue?status=${tab.status}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {result.error ? (
        <ErrorState message={result.error} />
      ) : (
        <>
          <QueueBoard status={status} groups={result.data.groups} />

          <p className="text-xs text-muted-foreground">
            Cancelling an item returns its stock to the product. Use Undo to
            put a product back into the queue.
          </p>
        </>
      )}
    </div>
  );
}
