import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, SessionContext } from "@/types";

/**
 * Returns the signed-in user together with their profile, or `null`.
 *
 * Performance notes:
 * - `getClaims()` verifies the JWT locally (JWKS is cached), so a normal page
 *   render does not talk to the Auth server at all. `getUser()` is only used
 *   as a fallback — it is a network round-trip and also refreshes the session.
 * - Wrapped in React `cache()` so the layout and the page share one result
 *   per request instead of querying the profile twice.
 */
export const getSessionContext = cache(
  async (): Promise<SessionContext | null> => {
    try {
      const supabase = await createClient();

      let userId: string | null = null;
      let email = "";

      const { data: claimData, error: claimError } = await supabase.auth.getClaims();
      if (!claimError && claimData?.claims) {
        const sub = claimData.claims.sub;
        if (typeof sub === "string") {
          userId = sub;
          email =
            typeof claimData.claims.email === "string" ? claimData.claims.email : "";
        }
      }

      if (!userId) {
        // Symmetric signing keys / expired token: ask the Auth server,
        // which also refreshes the session when possible.
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          userId = user.id;
          email = user.email ?? "";
        }
      }

      if (!userId) return null;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, role, created_at, updated_at")
        .eq("id", userId)
        .maybeSingle();

      if (!profileData) return null;

      const profile = profileData as Profile;
      return { user: { id: userId, email }, profile };
    } catch {
      return null;
    }
  },
);

/** Redirects to `/login` when there is no authenticated user. */
export async function requireSession(): Promise<SessionContext> {
  const context = await getSessionContext();
  if (!context) redirect("/login");
  return context;
}

/** Owner-only routes: cashiers are sent back to the POS. */
export async function requireOwner(): Promise<SessionContext> {
  const context = await requireSession();
  if (context.profile.role !== "owner") redirect("/pos");
  return context;
}
