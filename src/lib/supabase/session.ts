/**
 * Cheap session freshness check for the request proxy.
 *
 * The proxy used to call `auth.getUser()` on every request, which is a network
 * round-trip to the Supabase Auth server. Here we only *decode* the access token
 * from the cookies (no signature verification — that happens later in
 * `getSessionContext`) to decide whether a refresh is actually needed.
 *
 * Cookie formats handled (written by `@supabase/ssr`):
 * - `base64-<base64url(JSON session)>`, possibly split into `.0`, `.1`, … chunks
 * - plain JSON / raw JWT (older format)
 */

/** Refresh slightly before the token really expires. */
const REFRESH_MARGIN_MS = 60_000;

const BASE64_PREFIX = "base64-";
const JWT_PATTERN = /eyJ[\w-]+\.([\w-]+)\.[\w-]+/;

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return atob(padded);
}

function chunkOrder(name: string): number {
  const suffix = name.split(".").pop();
  const index = Number(suffix);
  return suffix !== undefined && Number.isInteger(index) ? index : -1;
}

/** Expiry (ms since epoch) of the first access token found, or `null`. */
function readExpiry(raw: string): number | null {
  const candidates = [raw];

  if (raw.startsWith(BASE64_PREFIX)) {
    try {
      candidates.push(decodeBase64Url(raw.slice(BASE64_PREFIX.length)));
    } catch {
      // fall through — the raw value is tried below
    }
  }

  for (const candidate of candidates) {
    const match = JWT_PATTERN.exec(candidate);
    if (!match) continue;

    try {
      const payload = JSON.parse(decodeBase64Url(match[1])) as { exp?: unknown };
      if (typeof payload.exp === "number") return payload.exp * 1000;
    } catch {
      // unreadable payload → keep looking
    }
  }

  return null;
}

/**
 * `true` when the access token is missing, unreadable, expired or about to
 * expire — i.e. when the Auth server round-trip is worth making.
 */
export function shouldRefreshSession(
  cookies: readonly { name: string; value: string }[],
): boolean {
  const sessionCookies = cookies
    .filter(({ name }) => name.startsWith("sb-") && name.includes("auth-token"))
    .sort((a, b) => chunkOrder(a.name) - chunkOrder(b.name));

  // No session at all → nothing to refresh (login page).
  if (sessionCookies.length === 0) return false;

  const expiry = readExpiry(sessionCookies.map(({ value }) => value).join(""));

  // Cannot tell → refresh, which is always safe.
  if (expiry === null) return true;

  return expiry - Date.now() < REFRESH_MARGIN_MS;
}
