"use server";

import { createClient } from "@/lib/supabase/server";
import { checkoutSchema } from "@/lib/validations/checkout";
import { GENERIC_ERROR, getErrorMessage } from "@/lib/utils/errors";
import type { ActionResult } from "@/types";

export interface CheckoutData {
  id: string;
  transaction_code: string;
  /** Total units that just entered the product queue. */
  item_count: number;
}

/**
 * Creates a transaction atomically inside Postgres.
 * Prices, availability, stock and totals are re-read on the server —
 * the client only sends product ids and quantities.
 */
export async function createTransactionAction(
  input: unknown,
): Promise<ActionResult<CheckoutData>> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid checkout data.",
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "Your session has expired. Please log in again." };
    }

    const { data, error } = await supabase.rpc("create_transaction", {
      p_items: parsed.data.items,
      p_payment_method: parsed.data.payment_method,
      p_payment_amount: parsed.data.payment_amount,
    });

    if (error) return { ok: false, error: getErrorMessage(error) };

    const row = Array.isArray(data) ? data[0] : data;
    const code = row?.new_code ?? row?.transaction_code;
    if (!row || typeof code !== "string") {
      return { ok: false, error: GENERIC_ERROR };
    }

    const transactionId = (row.new_id ?? row.id) as string;
    const { data: items } = await supabase
      .from("transaction_items")
      .select("quantity")
      .eq("transaction_id", transactionId);

    const itemCount = (items ?? []).reduce(
      (sum, item) => sum + (item.quantity ?? 0),
      0,
    );

    return {
      ok: true,
      data: {
        id: transactionId,
        transaction_code: code,
        item_count: itemCount,
      },
    };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}
