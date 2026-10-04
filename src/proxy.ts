import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { shouldRefreshSession } from "@/lib/supabase/session";

/**
 * Refreshes the Supabase auth session when the access token is about to expire.
 * Without this, the access token cannot be rotated from Server Components
 * and long cashier shifts would be logged out after the token expires.
 *
 * The Auth round-trip only happens when the token is close to expiry — a fresh
 * token is verified locally later in `getSessionContext`, which keeps the
 * common navigation path free of network calls to the Auth server.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: no code between createServerClient and getUser().
  if (shouldRefreshSession(request.cookies.getAll())) {
    await supabase.auth.getUser();
  }

  return response;
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
