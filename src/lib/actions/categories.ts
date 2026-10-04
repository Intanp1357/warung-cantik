"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validations/product";
import { getErrorMessage } from "@/lib/utils/errors";
import type { ActionResult } from "@/types";

async function requireOwnerContext(): Promise<ActionResult> {
  const context = await getSessionContext();
  if (!context) {
    return { ok: false, error: "Your session has expired. Please log in again." };
  }
  if (context.profile.role !== "owner") {
    return { ok: false, error: "Only the owner can manage categories." };
  }
  return { ok: true, data: undefined };
}

export async function createCategoryAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const guard = await requireOwnerContext();
  if (!guard.ok) return guard;

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the category form.",
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .insert({
        name: parsed.data.name,
        description: parsed.data.description || null,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "A category with that name already exists." };
      }
      return { ok: false, error: getErrorMessage(error, "Failed to save category") };
    }

    revalidatePath("/", "layout");
    return { ok: true, data: { id: data.id as string } };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, "Failed to save category") };
  }
}

export async function updateCategoryAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const guard = await requireOwnerContext();
  if (!guard.ok) return guard;

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the category form.",
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("categories")
      .update({
        name: parsed.data.name,
        description: parsed.data.description || null,
      })
      .eq("id", id);

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "A category with that name already exists." };
      }
      return { ok: false, error: getErrorMessage(error, "Failed to update category") };
    }

    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, "Failed to update category") };
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const guard = await requireOwnerContext();
  if (!guard.ok) return guard;

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) {
      if (error.code === "23503") {
        return {
          ok: false,
          error: "This category still has products. Move or delete them first.",
        };
      }
      return { ok: false, error: getErrorMessage(error, "Failed to delete category") };
    }

    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, "Failed to delete category") };
  }
}
