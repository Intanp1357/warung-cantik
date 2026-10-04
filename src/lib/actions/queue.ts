"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { queueStatusActionSchema } from "@/lib/validations/queue";
import { getErrorMessage } from "@/lib/utils/errors";
import type { ActionResult, QueueStatus } from "@/types";

/**
 * Marks one queue item as pending / done / cancelled.
 * Stock is kept in sync inside the `set_queue_status` Postgres function
 * (a cancelled item returns its stock to the product).
 */
export async function setQueueStatusAction(
  itemId: string,
  status: QueueStatus,
): Promise<ActionResult<QueueStatus>> {
  const parsed = queueStatusActionSchema.safeParse({ itemId, status });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid queue item.",
    };
  }

  const context = await getSessionContext();
  if (!context) {
    return { ok: false, error: "Your session has expired. Please log in again." };
  }
  if (context.profile.role !== "owner" && context.profile.role !== "cashier") {
    return { ok: false, error: "You do not have permission to do that." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("set_queue_status", {
      p_item_id: parsed.data.itemId,
      p_status: parsed.data.status,
    });

    if (error) return { ok: false, error: getErrorMessage(error) };

    revalidatePath("/", "layout");
    return { ok: true, data: parsed.data.status };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}
