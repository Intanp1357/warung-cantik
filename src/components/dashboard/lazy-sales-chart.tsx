"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { SalesPoint } from "@/lib/queries/dashboard";

/**
 * Recharts is a large visual library and the chart sits below the fold,
 * so it is loaded lazily instead of being part of the route's initial JS.
 * The placeholder keeps the exact chart height (h-64) to avoid layout shift.
 */
const SalesChart = dynamic(
  () => import("./sales-chart").then((module) => module.SalesChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full" aria-hidden="true">
        <Skeleton className="h-full w-full rounded-xl" />
      </div>
    ),
  },
);

export function LazySalesChart({ data }: { data: SalesPoint[] }) {
  return <SalesChart data={data} />;
}
