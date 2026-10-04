import { createClient } from "@/lib/supabase/server";
import { fail, ok, type QueryResult } from "./result";
import type { PaymentMethod, Transaction } from "@/types";

export interface TransactionFilters {
  search?: string;
  /** ISO date string lower bound for `created_at`. */
  from?: string;
  method?: PaymentMethod | "all";
  page?: number;
  pageSize?: number;
}

interface TransactionRow {
  id: string;
  transaction_code: string;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_amount: number;
  change_amount: number;
  status: "completed" | "refunded";
  created_at: string;
  created_by: string | null;
  created_by_profile: { full_name: string } | null;
  items: { id: string }[] | null;
}

function escapeLike(value: string): string {
  return value.replace(/([%_\\])/g, "\\$1");
}

export async function getTransactions(
  filters: TransactionFilters = {},
): Promise<QueryResult<{ items: Transaction[]; count: number }>> {
  try {
    const {
      search,
      from,
      method = "all",
      page = 1,
      pageSize = 12,
    } = filters;

    const supabase = await createClient();

    let query = supabase
      .from("transactions")
      .select(
        "*, created_by_profile:profiles!transactions_created_by_fkey(full_name), items:transaction_items(id)",
        { count: "exact" },
      );

    if (search && search.trim()) {
      query = query.ilike("transaction_code", `%${escapeLike(search.trim())}%`);
    }
    if (from) {
      query = query.gte("created_at", from);
    }
    if (method !== "all") {
      query = query.eq("payment_method", method);
    }

    const fromRow = (page - 1) * pageSize;
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(fromRow, fromRow + pageSize - 1);

    if (error) return fail(error);

    const items: Transaction[] = ((data ?? []) as TransactionRow[]).map((row) => ({
      id: row.id,
      transaction_code: row.transaction_code,
      total_amount: row.total_amount,
      payment_method: row.payment_method,
      payment_amount: row.payment_amount,
      change_amount: row.change_amount,
      status: row.status,
      created_at: row.created_at,
      created_by: row.created_by,
      created_by_name: row.created_by_profile?.full_name ?? null,
      item_count: row.items?.length ?? 0,
    }));

    return ok({ items, count: count ?? items.length });
  } catch (error) {
    return fail(error);
  }
}

export async function getTransactionById(
  id: string,
): Promise<QueryResult<Transaction | null>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("transactions")
      .select(
        "*, created_by_profile:profiles!transactions_created_by_fkey(full_name), items:transaction_items(*)",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) return fail(error);
    if (!data) return ok(null);

    const row = data as unknown as TransactionRow & {
      items: Transaction["items"] | null;
    };

    const items = [...(row.items ?? [])].sort((a, b) =>
      a.product_name.localeCompare(b.product_name),
    );

    return ok({
      id: row.id,
      transaction_code: row.transaction_code,
      total_amount: row.total_amount,
      payment_method: row.payment_method,
      payment_amount: row.payment_amount,
      change_amount: row.change_amount,
      status: row.status,
      created_at: row.created_at,
      created_by: row.created_by,
      created_by_name: row.created_by_profile?.full_name ?? null,
      items,
      item_count: items.length,
    });
  } catch (error) {
    return fail(error);
  }
}
