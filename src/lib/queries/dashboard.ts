import { createClient } from "@/lib/supabase/server";
import type { DateRangeKey } from "@/lib/constants";
import { startOfMonth, startOfToday, startOfWeek } from "@/lib/utils/format";
import { fail, ok, type QueryResult } from "./result";

export interface SalesPoint {
  label: string;
  value: number;
}

export interface DashboardData {
  sales: number;
  transactionCount: number;
  itemsSold: number;
  average: number;
  series: SalesPoint[];
}

export function rangeToDates(range: DateRangeKey): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);

  const from =
    range === "today" ? startOfToday() : range === "week" ? startOfWeek() : startOfMonth();

  return { from, to };
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildSeries(range: DateRangeKey, from: Date): SalesPoint[] {
  if (range === "today") {
    return Array.from({ length: 24 }, (_, hour) => ({
      label: String(hour).padStart(2, "0"),
      value: 0,
    }));
  }

  if (range === "week") {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(from);
      date.setDate(from.getDate() + index);
      return { label: DAY_LABELS[date.getDay()], value: 0 };
    });
  }

  const daysInMonth = new Date(from.getFullYear(), from.getMonth() + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => ({
    label: String(index + 1),
    value: 0,
  }));
}

interface SummaryRow {
  revenue: number | string;
  transaction_count: number | string;
  items_sold: number | string;
  average: number | string;
  series: { index: number; value: number | string }[];
}

const BUCKET_BY_RANGE: Record<DateRangeKey, "hour" | "weekday" | "daynum"> = {
  today: "hour",
  week: "weekday",
  month: "daynum",
};

/**
 * One Postgres round-trip for all four stat cards and the chart series —
 * aggregation happens in the database (`dashboard_summary` RPC) instead of
 * downloading every transaction of the range.
 * Dashboard data is never cached: it must reflect the latest sale.
 */
export async function getDashboardData(
  range: DateRangeKey,
): Promise<QueryResult<DashboardData>> {
  try {
    const { from, to } = rangeToDates(range);
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("dashboard_summary", {
      p_from: from.toISOString(),
      p_to: to.toISOString(),
      p_bucket: BUCKET_BY_RANGE[range],
      p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    });

    if (error) return fail(error);

    const row = (data ?? {}) as SummaryRow;
    const series = buildSeries(range, from);

    for (const point of row.series ?? []) {
      const target = series[point.index];
      if (target) target.value = Number(point.value);
    }

    return ok({
      sales: Number(row.revenue ?? 0),
      transactionCount: Number(row.transaction_count ?? 0),
      itemsSold: Number(row.items_sold ?? 0),
      average: Number(row.average ?? 0),
      series,
    });
  } catch (error) {
    return fail(error);
  }
}
