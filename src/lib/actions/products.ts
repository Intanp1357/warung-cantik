"use server";

import { revalidatePath, updateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/cache-tags";
import { getSessionContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { productSchema } from "@/lib/validations/product";
import { GENERIC_ERROR, getErrorMessage } from "@/lib/utils/errors";
import type { ActionResult } from "@/types";

async function requireOwnerContext(): Promise<ActionResult> {
  const context = await getSessionContext();
  if (!context) {
    return { ok: false, error: "Sesi kamu sudah berakhir. Silakan masuk kembali." };
  }
  if (context.profile.role !== "owner") {
    return { ok: false, error: "Hanya pemilik yang bisa mengelola produk." };
  }
  return { ok: true, data: undefined };
}

export async function createProductAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const guard = await requireOwnerContext();
  if (!guard.ok) return guard;

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Periksa formulir produk.",
    };
  }

  try {
    const supabase = await createClient();
    const values = parsed.data;

    const { data, error } = await supabase
      .from("products")
      .insert({
        name: values.name,
        description: values.description || null,
        category_id: values.category_id || null,
        price: values.price,
        cost_price: values.cost_price,
        stock: values.stock,
        image_url: values.image_url || null,
        is_available: values.is_available,
        has_toppings: values.has_toppings,
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: getErrorMessage(error, "Failed to save product") };

    updateTag(CATALOG_TAG);
    revalidatePath("/", "layout");
    return { ok: true, data: { id: data.id as string } };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, "Failed to save product") };
  }
}

export async function updateProductAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const guard = await requireOwnerContext();
  if (!guard.ok) return guard;

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Periksa formulir produk.",
    };
  }

  try {
    const supabase = await createClient();
    const values = parsed.data;

    const { error } = await supabase
      .from("products")
      .update({
        name: values.name,
        description: values.description || null,
        category_id: values.category_id || null,
        price: values.price,
        cost_price: values.cost_price,
        stock: values.stock,
        image_url: values.image_url || null,
        is_available: values.is_available,
        has_toppings: values.has_toppings,
      })
      .eq("id", id);

    if (error) return { ok: false, error: getErrorMessage(error, "Failed to update product") };

    updateTag(CATALOG_TAG);
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, "Failed to update product") };
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  const guard = await requireOwnerContext();
  if (!guard.ok) return guard;

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) return { ok: false, error: getErrorMessage(error, "Failed to delete product") };

    updateTag(CATALOG_TAG);
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, GENERIC_ERROR) };
  }
}
