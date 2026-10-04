"use client";

import { cn } from "cn";
import type { Category } from "@/types";

interface CategoryTabsProps {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
}

export function CategoryTabs({ categories, value, onChange }: CategoryTabsProps) {
  const options = [{ id: "all", name: "All" }, ...categories];

  return (
    <div
      role="tablist"
      aria-label="Product categories"
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      style={{ scrollbarWidth: "none" }}
    >
      {options.map((option) => {
        const active = value === option.id;

        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={cn(
              "h-8 shrink-0 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {option.name}
          </button>
        );
      })}
    </div>
  );
}
