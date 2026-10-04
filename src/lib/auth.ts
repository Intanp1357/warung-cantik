import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, SessionContext } from "@/types";

/** Returns the signed-in user together with their profile, or `null`. */
export async function getSessionContext(): Promise<SessionContext | null> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle();

    if (!data) return null;

    const profile = data as Profile;
    return { user: { id: user.id, email: user.email ?? "" }, profile };
  } catch {
    return null;
  }
}

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
