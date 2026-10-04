import { createClient } from "@/lib/supabase/server";
import { fail, ok, type QueryResult } from "./result";
import type { Category, ProductWithCategory, ShopSettings } from "@/types";

export async function getCategories(): Promise<QueryResult<Category[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    if (error) return fail(error);
    return ok((data ?? []) as Category[]);
  } catch (error) {
    return fail(error);
  }
}

export async function getProducts(): Promise<QueryResult<ProductWithCategory[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*, category:categories(id, name)")
      .order("name");

    if (error) return fail(error);
    return ok((data ?? []) as unknown as ProductWithCategory[]);
  } catch (error) {
    return fail(error);
  }
}

export async function getShopSettings(): Promise<QueryResult<ShopSettings | null>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("shop_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) return fail(error);
    return ok((data ?? null) as ShopSettings | null);
  } catch (error) {
    return fail(error);
  }
}
