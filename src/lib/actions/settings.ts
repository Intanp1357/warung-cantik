"use server";

import { revalidatePath, updateTag } from "next/cache";
import { SETTINGS_TAG } from "@/lib/cache-tags";
import { getSessionContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { shopSettingsSchema } from "@/lib/validations/product";
import { getErrorMessage } from "@/lib/utils/errors";
import type { ActionResult } from "@/types";

export async function updateShopSettingsAction(
  input: unknown,
): Promise<ActionResult> {
  const context = await getSessionContext();
  if (!context) {
    return { ok: false, error: "Your session has expired. Please log in again." };
  }
  if (context.profile.role !== "owner") {
    return { ok: false, error: "Only the owner can change shop settings." };
  }

  const parsed = shopSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the settings form.",
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("shop_settings").upsert({
      id: 1,
      shop_name: parsed.data.shop_name,
      address: parsed.data.address || "",
      phone: parsed.data.phone || "",
      receipt_footer: parsed.data.receipt_footer || "",
    });

    if (error) {
      return { ok: false, error: getErrorMessage(error, "Failed to save settings") };
    }

    updateTag(SETTINGS_TAG);
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, "Failed to save settings") };
  }
}
