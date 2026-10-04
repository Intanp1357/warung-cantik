"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "cn";
import { useDebounce } from "@/hooks/use-debounce";
import { DATE_RANGES, PAYMENT_METHODS, type DateRangeKey } from "@/lib/constants";
import { SearchInput } from "@/components/products/search-input";

type RangeValue = DateRangeKey | "all";
type MethodValue = "all" | "cash" | "qris" | "transfer";

const RANGE_OPTIONS: { value: RangeValue; label: string }[] = [
  { value: "all", label: "All" },
  ...DATE_RANGES,
];

const METHOD_OPTIONS: { value: MethodValue; label: string }[] = [
  { value: "all", label: "All payments" },
  ...PAYMENT_METHODS,
];

interface TransactionFiltersProps {
  search: string;
  range: RangeValue;
  method: MethodValue;
}

export function TransactionFilters({
  search,
  range,
  method,
}: TransactionFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(search);
  const debouncedQuery = useDebounce(query, 400);

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (debouncedQuery.trim() !== search.trim()) {
      update("q", debouncedQuery.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  return (
    <div className="space-y-3">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search transaction code..."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="group"
          aria-label="Date range"
          className="-mx-1 flex gap-2 overflow-x-auto px-1"
          style={{ scrollbarWidth: "none" }}
        >
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={range === option.value}
              onClick={() => update("range", option.value === "all" ? "" : option.value)}
              className={cn(
                "h-8 shrink-0 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
                range === option.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div
          role="group"
          aria-label="Payment method"
          className="-mx-1 flex gap-2 overflow-x-auto px-1"
          style={{ scrollbarWidth: "none" }}
        >
          {METHOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={method === option.value}
              onClick={() => update("method", option.value === "all" ? "" : option.value)}
              className={cn(
                "h-8 shrink-0 rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors",
                method === option.value
                  ? "border-secondary-foreground bg-secondary text-secondary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
