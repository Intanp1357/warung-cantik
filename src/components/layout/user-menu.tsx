"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon, HeartIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils/format";
import { ROLE_LABELS } from "@/lib/constants";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { Profile } from "@/types";

interface UserMenuProps {
  profile: Profile;
  align?: "start" | "end";
}

export function UserMenu({ profile, align = "end" }: UserMenuProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleLogout = async () => {
    setPending(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Gagal keluar. Silakan coba lagi.");
    } finally {
      setPending(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto w-full justify-start gap-2.5 px-2 py-2 font-normal"
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
              {getInitials(profile.full_name || "Pengguna")}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-medium">
              {profile.full_name || "Pengguna"}
            </span>
            <span className="block text-xs text-muted-foreground">
              {ROLE_LABELS[profile.role]}
            </span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel className="truncate">
          {profile.full_name || "Pengguna"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={pending} onClick={handleLogout}>
          <LogOutIcon />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BrandMark({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <HeartIcon className="size-4" fill="currentColor" />
      </span>
      <span className="truncate text-sm font-semibold tracking-tight">
        {name}
      </span>
    </div>
  );
}
