/**
 * Next.js data-cache tags (see `unstable_cache` in the queries and
 * `revalidateTag` in the server actions).
 *
 * Rule: whenever a mutation changes rows behind a tag, revalidate that tag in
 * the same action — otherwise the cached copy stays stale until it expires.
 */
export const CATALOG_TAG = "catalog";
export const SETTINGS_TAG = "settings";
