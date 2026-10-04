"use server";

import { revalidatePath, updateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/cache-tags";
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

    // Fast path: verify the JWT locally instead of a round-trip to the Auth
    // server (the RPC re-checks `auth.uid()` anyway).
    const { data: claimData, error: claimError } = await supabase.auth.getClaims();
    const hasSession =
      !claimError && typeof claimData?.claims?.sub === "string";

    if (!hasSession) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { ok: false, error: "Your session has expired. Please log in again." };
      }
    }

    const { data, error } = await supabase.rpc("create_transaction", {
      p_items: parsed.data.items,
      p_payment_method: parsed.data.payment_method,
      p_payment_amount: parsed.data.payment_amount,
      // Idempotency key: a retry of the same cart returns the first result.
      p_client_reference: parsed.data.client_reference ?? null,
    });

    if (error) return { ok: false, error: getErrorMessage(error) };

    // Stock changed → the cached product catalog must be refreshed.
    updateTag(CATALOG_TAG);
    revalidatePath("/", "layout");

    const row = Array.isArray(data) ? data[0] : data;
    const code = row?.new_code ?? row?.transaction_code;
    if (!row || typeof code !== "string") {
      return { ok: false, error: GENERIC_ERROR };
    }

    const transactionId = (row.new_id ?? row.id) as string;
    const itemCount =
      typeof row.new_item_count === "number"
        ? row.new_item_count
        : // Fallback: the RPC stores exactly the requested quantities.
          parsed.data.items.reduce(
            (sum, item) =>
              sum +
              item.quantity +
              (item.toppings ?? []).reduce(
                (toppingSum, topping) => toppingSum + topping.quantity,
                0,
              ),
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
