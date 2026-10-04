import {
  ClipboardList,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings,
  Store,
  Tags,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, ownerOnly: true },
  { href: "/pos", label: "POS", icon: Store },
  { href: "/queue", label: "Queue", icon: ClipboardList },
  { href: "/products", label: "Products", icon: Package, ownerOnly: true },
  { href: "/categories", label: "Categories", icon: Tags, ownerOnly: true },
  { href: "/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/settings", label: "Settings", icon: Settings, ownerOnly: true },
];

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.ownerOnly || role === "owner");
}

/** Mobile bottom navigation (see prompt §21). */
export function mobileNavForRole(role: Role): NavItem[] {
  const items = navForRole(role);
  const preferred =
    role === "owner"
      ? ["/dashboard", "/pos", "/transactions"]
      : ["/pos", "/queue", "/transactions"];

  return items.filter((item) => preferred.includes(item.href));
}
