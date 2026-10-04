"use client";

import { useMemo, useState } from "react";
import { SearchIcon, StoreIcon } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { ProductCard } from "@/components/products/product-card";
import { SearchInput } from "@/components/products/search-input";
import { CategoryTabs } from "@/components/products/category-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { Category, ProductWithCategory } from "@/types";

export function ProductGrid({ products }: { products: ProductWithCategory[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

interface ProductCatalogProps {
  products: ProductWithCategory[];
  categories: Category[];
}

/** Search + category filter + product grid (POS and catalog views). */
export function ProductCatalog({ products, categories }: ProductCatalogProps) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const debouncedQuery = useDebounce(query).trim().toLowerCase();

  const filtered = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        categoryId === "all" || product.category_id === categoryId;
      const matchesQuery =
        !debouncedQuery ||
        product.name.toLowerCase().includes(debouncedQuery) ||
        (product.description ?? "").toLowerCase().includes(debouncedQuery) ||
        (product.category?.name ?? "").toLowerCase().includes(debouncedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [products, categoryId, debouncedQuery]);

  const resetFilters = () => {
    setQuery("");
    setCategoryId("all");
  };

  return (
    <div className="space-y-3">
      <SearchInput value={query} onChange={setQuery} />

      <CategoryTabs
        categories={categories}
        value={categoryId}
        onChange={setCategoryId}
      />

      {filtered.length > 0 ? (
        <ProductGrid products={filtered} />
      ) : (
        <EmptyState
          icon={
            debouncedQuery ? (
              <SearchIcon className="size-5" />
            ) : (
              <StoreIcon className="size-5" />
            )
          }
          title={products.length === 0 ? "No products yet" : "No products found"}
          description={
            products.length === 0
              ? "Ask the owner to add products to the catalog."
              : "Try a different keyword or category."
          }
          action={
            products.length > 0 ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
          className="bg-transparent"
        />
      )}
    </div>
  );
}
