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

function pointIndexFor(range: DateRangeKey, from: Date, iso: string): number {
  const date = new Date(iso);

  if (range === "today") return date.getHours();
  if (range === "week") {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    return Math.round((dayStart.getTime() - from.getTime()) / 86_400_000);
  }
  return date.getDate() - 1;
}

export async function getDashboardData(
  range: DateRangeKey,
): Promise<QueryResult<DashboardData>> {
  try {
    const { from, to } = rangeToDates(range);
    const supabase = await createClient();

    const [transactionsResult, itemsResult] = await Promise.all([
      supabase
        .from("transactions")
        .select("created_at, total_amount")
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .order("created_at", { ascending: true })
        .limit(5000),
      supabase
        .from("transaction_items")
        .select("quantity, transactions!inner(created_at)")
        .gte("transactions.created_at", from.toISOString())
        .lte("transactions.created_at", to.toISOString())
        .limit(10_000),
    ]);

    if (transactionsResult.error) return fail(transactionsResult.error);
    if (itemsResult.error) return fail(itemsResult.error);

    const series = buildSeries(range, from);
    let sales = 0;

    for (const row of transactionsResult.data ?? []) {
      const index = pointIndexFor(range, from, row.created_at);
      const point = series[index];
      if (point) point.value += row.total_amount;
      sales += row.total_amount;
    }

    const transactionCount = transactionsResult.data?.length ?? 0;
    const itemsSold = (itemsResult.data ?? []).reduce(
      (total, row) => total + (row.quantity ?? 0),
      0,
    );

    return ok({
      sales,
      transactionCount,
      itemsSold,
      average: transactionCount > 0 ? Math.round(sales / transactionCount) : 0,
      series,
    });
  } catch (error) {
    return fail(error);
  }
}
