"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckIcon,
  ClockIcon,
  Loader2Icon,
  PartyPopperIcon,
  RefreshCwIcon,
  Undo2Icon,
  XIcon,
} from "lucide-react";
import { cn } from "cn";
import { setQueueStatusAction } from "@/lib/actions/queue";
import { useQueueCount } from "@/components/layout/queue-count-provider";
import { notifyQueueChanged } from "@/lib/utils/queue-events";
import { formatDateTime, formatRupiah } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import type { QueueGroup, QueueItem, QueueStatus } from "@/types";

interface QueueBoardProps {
  status: QueueStatus;
  groups: QueueGroup[];
}

function StatusBadge({ status }: { status: QueueStatus }) {
  if (status === "done") {
    return (
      <Badge>
        <CheckIcon />
        Served
      </Badge>
    );
  }

  if (status === "cancelled") {
    return (
      <Badge variant="destructive">
        <XIcon />
        Cancelled
      </Badge>
    );
  }

  return (
    <Badge variant="secondary">
      <ClockIcon />
      Pending
    </Badge>
  );
}

const EMPTY_COPY: Record<
  QueueStatus,
  { title: string; description: string }
> = {
  pending: {
    title: "All caught up!",
    description: "No products are waiting to be served right now.",
  },
  done: {
    title: "Nothing served yet",
    description: "Products you mark as done will show up here.",
  },
  cancelled: {
    title: "Nothing cancelled",
    description: "Cancelled items will show up here.",
  },
};

export function QueueBoard({ status, groups }: QueueBoardProps) {
  const router = useRouter();
  const { changeVersion } = useQueueCount();
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [busyGroupId, setBusyGroupId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const skipFirstVersion = useRef(true);

  // Instant refresh whenever the queue changes (own action or another device).
  useEffect(() => {
    if (skipFirstVersion.current) {
      skipFirstVersion.current = false;
      return;
    }
    router.refresh();
  }, [changeVersion, router]);

  // Fallback while the board is left open on a counter screen (paused when
  // the tab is in the background — no pointless network requests).
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, 15_000);
    return () => clearInterval(timer);
  }, [router]);

  const changeStatus = async (item: QueueItem, next: QueueStatus) => {
    if (busyItemId) return;
    setBusyItemId(item.id);

    const result = await setQueueStatusAction(item.id, next);
    setBusyItemId(null);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    if (next === "done") toast.success(`${item.product_name} marked as served`);
    else if (next === "cancelled")
      toast.success(`${item.product_name} cancelled — stock returned`);
    else toast.success(`${item.product_name} is back in the queue`);

    notifyQueueChanged();
  };

  const markGroupAsDone = async (group: QueueGroup) => {
    if (busyGroupId || busyItemId) return;
    const pending = group.items.filter(
      (item) => item.queue_status === "pending",
    );
    if (pending.length === 0) return;

    setBusyGroupId(group.transaction.id);

    for (const item of pending) {
      const result = await setQueueStatusAction(item.id, "done");
      if (!result.ok) {
        toast.error(result.error);
        break;
      }
    }

    setBusyGroupId(null);
    toast.success(`${group.transaction.transaction_code} marked as served`);
    notifyQueueChanged();
  };

  const refresh = () => {
    setRefreshing(true);
    router.refresh();
    window.setTimeout(() => setRefreshing(false), 600);
  };

  const totalItems = groups.reduce((sum, group) => sum + group.items.length, 0);
  const emptyCopy = EMPTY_COPY[status];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {totalItems} product{totalItems === 1 ? "" : "s"}{" "}
          {status === "pending" ? "waiting" : status === "done" ? "served" : "cancelled"}
          {status === "pending" ? " to be served" : ""}
        </p>

        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          aria-label="Refresh queue"
        >
          <RefreshCwIcon className={cn(refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={<PartyPopperIcon className="size-5" fill="currentColor" />}
          title={emptyCopy.title}
          description={emptyCopy.description}
        />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const busyGroup = busyGroupId === group.transaction.id;
            const hasPending = group.items.some(
              (item) => item.queue_status === "pending",
            );

            return (
              <Card key={group.transaction.id} className="rounded-2xl">
                <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <CardTitle className="font-mono text-sm">
                      {group.transaction.transaction_code}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(group.transaction.created_at)}
                      {group.transaction.cashier_name
                        ? ` • ${group.transaction.cashier_name}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {group.items.length} item
                      {group.items.length === 1 ? "" : "s"}
                    </Badge>

                    {status === "pending" && hasPending ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyGroup || busyItemId !== null}
                        onClick={() => markGroupAsDone(group)}
                      >
                        {busyGroup ? (
                          <Loader2Icon className="animate-spin" />
                        ) : (
                          <CheckIcon />
                        )}
                        Done all
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>

                <CardContent className="space-y-2">
                  {group.items.map((item) => {
                    const busy = busyItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col gap-2 rounded-xl border bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {item.product_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} × {formatRupiah(item.price)} ={" "}
                              {formatRupiah(item.subtotal)}
                            </p>
                          </div>
                          <StatusBadge status={item.queue_status} />
                        </div>

                        <div className="flex shrink-0 gap-2">
                          {item.queue_status === "pending" ? (
                            <>
                              <Button
                                size="sm"
                                disabled={busy || busyGroupId !== null}
                                onClick={() => changeStatus(item, "done")}
                              >
                                {busy ? (
                                  <Loader2Icon className="animate-spin" />
                                ) : (
                                  <CheckIcon />
                                )}
                                Done
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                disabled={busy || busyGroupId !== null}
                                onClick={() => changeStatus(item, "cancelled")}
                              >
                                {busy ? (
                                  <Loader2Icon className="animate-spin" />
                                ) : (
                                  <XIcon />
                                )}
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busy || busyGroupId !== null}
                              onClick={() => changeStatus(item, "pending")}
                            >
                              {busy ? (
                                <Loader2Icon className="animate-spin" />
                              ) : (
                                <Undo2Icon />
                              )}
                              Undo
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
