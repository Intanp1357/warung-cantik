"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { navForRole } from "@/components/layout/nav-items";
import { useQueueCount } from "@/components/layout/queue-count-provider";
import { BrandMark, UserMenu } from "@/components/layout/user-menu";
import type { Profile } from "@/types";

interface SidebarProps {
  profile: Profile;
  shopName: string;
}

export function Sidebar({ profile, shopName }: SidebarProps) {
  const pathname = usePathname();
  const items = navForRole(profile.role);
  const { pendingCount } = useQueueCount();

  return (
    <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card lg:flex">
      <div className="px-4 py-5">
        <BrandMark name={shopName} />
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="Main navigation">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon
                className={cn("size-4", active ? "text-primary" : undefined)}
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
      </nav>

      <div className="border-t p-3">
        <UserMenu profile={profile} align="start" />
      </div>
    </aside>
  );
}
