import { createClient } from "@/lib/supabase/server";
import { fail, ok, type QueryResult } from "./result";
import type { QueueGroup, QueueItem, QueueStatus, TransactionItem } from "@/types";

interface QueueRow extends TransactionItem {
  transaction: {
    id: string;
    transaction_code: string;
    payment_method: string;
    total_amount: number;
    created_at: string;
    cashier: { full_name: string } | null;
  };
}

/** Only the columns the queue actually renders (no `SELECT *`). */
const QUEUE_SELECT = `
  id,
  transaction_id,
  product_id,
  product_name,
  quantity,
  price,
  subtotal,
  created_at,
  queue_status,
  resolved_at,
  resolved_by,
  transaction:transactions!inner(
    id,
    transaction_code,
    payment_method,
    total_amount,
    created_at,
    cashier:profiles!transactions_created_by_fkey(full_name)
  )
`;

export const QUEUE_PAGE_SIZE = 150;

/**
 * Queue items for one status, grouped by their transaction.
 * Pending items are returned oldest first (queue order), resolved items
 * newest first (recent activity).
 */
export async function getQueue(
  status: QueueStatus,
  limit = QUEUE_PAGE_SIZE,
): Promise<QueryResult<{ groups: QueueGroup[]; count: number }>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("transaction_items")
      .select(QUEUE_SELECT)
      .eq("queue_status", status)
      .order("created_at", { ascending: status === "pending" })
      .limit(limit);

    if (error) return fail(error);

    const rows = (data ?? []) as unknown as QueueRow[];
    const groups: QueueGroup[] = [];
    const indexByTransaction = new Map<string, QueueGroup>();

    for (const row of rows) {
      const transaction: QueueGroup["transaction"] = {
        id: row.transaction.id,
        transaction_code: row.transaction.transaction_code,
        payment_method: row.transaction.payment_method as QueueItem["transaction"]["payment_method"],
        total_amount: row.transaction.total_amount,
        created_at: row.transaction.created_at,
        cashier_name: row.transaction.cashier?.full_name ?? null,
      };

      let group = indexByTransaction.get(transaction.id);
      if (!group) {
        group = { transaction, items: [] };
        indexByTransaction.set(transaction.id, group);
        groups.push(group);
      }

      const item: QueueItem = {
        id: row.id,
        transaction_id: row.transaction_id,
        product_id: row.product_id,
        product_name: row.product_name,
        quantity: row.quantity,
        price: row.price,
        subtotal: row.subtotal,
        created_at: row.created_at,
        queue_status: row.queue_status,
        resolved_at: row.resolved_at,
        resolved_by: row.resolved_by,
        transaction,
      };

      group.items.push(item);
    }

    return ok({ groups, count: rows.length });
  } catch (error) {
    return fail(error);
  }
}
