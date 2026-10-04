import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { CATALOG_TAG, SETTINGS_TAG } from "@/lib/cache-tags";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { fail, ok, type QueryResult } from "./result";
import type { Category, ProductWithCategory, ShopSettings } from "@/types";

/**
 * Product/category/shop data changes rarely and is identical for every staff
 * member, so it is safe to share through the Next.js data cache.
 * Every mutation invalidates its tag (see `updateTag` in the actions), which
 * keeps the cached copy in sync with Supabase immediately.
 *
 * Next.js does not allow `cookies()` inside `unstable_cache()`, so the session
 * cookies are read *outside* the cache scope and passed in as an argument —
 * they also key the entry, which means one entry per signed-in session and
 * never data that was fetched with somebody else's credentials.
 */
type SessionCookie = { name: string; value: string };

const CATALOG_COLUMNS = "id, name, description, created_at, updated_at";
const PRODUCT_COLUMNS =
  "id, name, description, category_id, price, cost_price, stock, image_url, is_available, created_at, updated_at";

async function readSessionCookies(): Promise<SessionCookie[]> {
  const store = await cookies();
  return store.getAll().filter(({ name }) => name.startsWith("sb-"));
}

/** Read-only client: a cache scope can never persist refreshed cookies. */
function scopedClient(sessionCookies: SessionCookie[]) {
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => sessionCookies,
      setAll: () => {
        // no-op: session refresh happens in the proxy, before rendering
      },
    },
  });
}

async function fetchCategories(sessionCookies: SessionCookie[]): Promise<Category[]> {
  const supabase = scopedClient(sessionCookies);
  const { data, error } = await supabase
    .from("categories")
    .select(CATALOG_COLUMNS)
    .order("name");

  if (error) throw error; // never cache a failed fetch
  return (data ?? []) as Category[];
}

async function fetchProducts(
  sessionCookies: SessionCookie[],
): Promise<ProductWithCategory[]> {
  const supabase = scopedClient(sessionCookies);
  const { data, error } = await supabase
    .from("products")
    .select(`${PRODUCT_COLUMNS}, category:categories(id, name)`)
    .order("name");

  if (error) throw error; // never cache a failed fetch
  return (data ?? []) as unknown as ProductWithCategory[];
}

async function fetchShopSettings(
  sessionCookies: SessionCookie[],
): Promise<ShopSettings | null> {
  const supabase = scopedClient(sessionCookies);
  const { data, error } = await supabase
    .from("shop_settings")
    .select("id, shop_name, address, phone, receipt_footer, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw error; // never cache a failed fetch
  return (data ?? null) as ShopSettings | null;
}

const cachedCategories = unstable_cache(fetchCategories, ["categories"], {
  tags: [CATALOG_TAG],
  revalidate: 300,
});

const cachedProducts = unstable_cache(fetchProducts, ["products"], {
  tags: [CATALOG_TAG],
  revalidate: 300,
});

const cachedShopSettings = unstable_cache(fetchShopSettings, ["shop-settings"], {
  tags: [SETTINGS_TAG],
  revalidate: 600,
});

export async function getCategories(): Promise<QueryResult<Category[]>> {
  try {
    return ok(await cachedCategories(await readSessionCookies()));
  } catch (error) {
    return fail(error);
  }
}

export async function getProducts(): Promise<QueryResult<ProductWithCategory[]>> {
  try {
    return ok(await cachedProducts(await readSessionCookies()));
  } catch (error) {
    return fail(error);
  }
}

export async function getShopSettings(): Promise<QueryResult<ShopSettings | null>> {
  try {
    return ok(await cachedShopSettings(await readSessionCookies()));
  } catch (error) {
    return fail(error);
  }
}
