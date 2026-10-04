"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { HeartIcon, LogOutIcon, MoreHorizontalIcon } from "lucide-react";
import { cn } from "cn";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils/format";
import { ROLE_LABELS } from "@/lib/constants";
import { mobileNavForRole, navForRole } from "@/components/layout/nav-items";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Profile } from "@/types";

interface BottomNavProps {
  profile: Profile;
  shopName: string;
  /** Number of products waiting in the queue (nav badge). */
  pendingCount?: number;
}

export function BottomNav({
  profile,
  shopName,
  pendingCount = 0,
}: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const primaryItems = mobileNavForRole(profile.role);
  const allItems = navForRole(profile.role);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const queueBadge =
    pendingCount > 0 ? (
      <span className="rounded-full bg-primary px-1.5 text-[9px] leading-4 font-semibold text-primary-foreground tabular-nums">
        {pendingCount > 99 ? "99+" : pendingCount}
      </span>
    ) : null;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <nav
        aria-label="Mobile navigation"
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:hidden"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {primaryItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 min-w-16 flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                <span className="flex items-center gap-1">
                  {item.label}
                  {item.href === "/queue" ? queueBadge : null}
                </span>
              </Link>
            );
          })}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="flex min-h-14 min-w-16 flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] font-medium text-muted-foreground">
              <MoreHorizontalIcon className="size-5" />
              More
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
              <SheetHeader>
                <SheetTitle>{shopName}</SheetTitle>
              </SheetHeader>

              <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
                <Avatar className="size-10">
                  <AvatarFallback className="bg-accent text-sm font-semibold text-accent-foreground">
                    {getInitials(profile.full_name || "User")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {profile.full_name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[profile.role]}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                {allItems.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-4",
                          active ? "text-primary" : undefined,
                        )}
                      />
                      {item.label}
                      {item.href === "/queue" && pendingCount > 0 ? (
                        <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] leading-none font-semibold text-primary-foreground tabular-nums">
                          {pendingCount > 99 ? "99+" : pendingCount}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive"
                >
                  <LogOutIcon className="size-4" />
                  Log out
                </button>
              </div>

              <p className="flex items-center justify-center gap-1 pt-2 text-xs text-muted-foreground">
                <HeartIcon className="size-3 text-primary" fill="currentColor" />
                {shopName}
              </p>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}
