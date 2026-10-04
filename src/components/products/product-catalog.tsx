"use client";

import { useMemo, useState } from "react";
import { SearchIcon, StoreIcon } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { ProductCard } from "@/components/products/product-card";
import { SearchInput } from "@/components/products/search-input";
import { CategoryTabs } from "@/components/products/category-tabs";
import { ToppingDialog } from "@/components/pos/topping-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { Category, ProductWithCategory } from "@/types";

interface ProductGridProps {
  products: ProductWithCategory[];
  /** Present on the POS: topping-capable cards open the topping picker. */
  onPick?: (product: ProductWithCategory) => void;
}

export function ProductGrid({ products, onPick }: ProductGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onPick={product.has_toppings ? onPick : undefined}
        />
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
  const [picking, setPicking] = useState<ProductWithCategory | null>(null);
  const debouncedQuery = useDebounce(query).trim().toLowerCase();

  // Toppings are the products of the category flagged as the topping category.
  const toppingProducts = useMemo(
    () => products.filter((product) => product.category?.is_topping),
    [products],
  );

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
        <ProductGrid
          products={filtered}
          onPick={toppingProducts.length > 0 ? setPicking : undefined}
        />
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

      <ToppingDialog
        product={picking}
        toppings={toppingProducts}
        onOpenChange={(open) => {
          if (!open) setPicking(null);
        }}
      />
    </div>
  );
}
