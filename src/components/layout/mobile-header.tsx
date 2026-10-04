import { HeartIcon } from "lucide-react";
import { ROLE_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import type { Profile } from "@/types";

interface MobileHeaderProps {
  profile: Profile;
  shopName: string;
}

export function MobileHeader({ profile, shopName }: MobileHeaderProps) {
  return (
    <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <HeartIcon className="size-3.5" fill="currentColor" />
        </span>
        <span className="truncate text-sm font-semibold tracking-tight">
          {shopName}
        </span>
      </div>
      <Badge variant="secondary">{ROLE_LABELS[profile.role]}</Badge>
    </header>
  );
}
