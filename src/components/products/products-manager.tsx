"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  ImageIcon,
  PackagePlusIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { deleteProductAction, updateProductAction } from "@/lib/actions/products";
import { useDebounce } from "@/hooks/use-debounce";
import { formatRupiah } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SearchInput } from "@/components/products/search-input";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import type { Category, ProductWithCategory } from "@/types";

interface ProductsManagerProps {
  products: ProductWithCategory[];
  categories: Category[];
}

export function ProductsManager({ products, categories }: ProductsManagerProps) {
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductWithCategory | null>(null);
  const [deleting, setDeleting] = useState<ProductWithCategory | null>(null);
  const debouncedQuery = useDebounce(query).trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!debouncedQuery) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(debouncedQuery) ||
        (product.category?.name ?? "").toLowerCase().includes(debouncedQuery),
    );
  }, [products, debouncedQuery]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (product: ProductWithCategory) => {
    setEditing(product);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const result = await deleteProductAction(deleting.id);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Product deleted");
  };

  const toggleAvailability = async (product: ProductWithCategory) => {
    const result = await updateProductAction(product.id, {
      name: product.name,
      description: product.description ?? "",
      category_id: product.category_id ?? "",
      price: product.price,
      cost_price: product.cost_price,
      stock: product.stock,
      image_url: product.image_url ?? "",
      is_available: !product.is_available,
    });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(
      product.is_available
        ? `${product.name} marked as unavailable`
        : `${product.name} is available again`,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchInput value={query} onChange={setQuery} placeholder="Search products..." />
        </div>
        <Button onClick={openCreate} className="h-10 w-full sm:w-auto">
          <PackagePlusIcon />
          Add product
        </Button>
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((product) => (
            <article
              key={product.id}
              className="flex gap-3 rounded-2xl border bg-card p-3"
            >
              <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-muted-foreground/60">
                    <ImageIcon className="size-6" aria-hidden />
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">
                      {product.name}
                    </h3>
                    <p className="truncate text-xs text-muted-foreground">
                      {product.description || "No description"}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-primary">
                    {formatRupiah(product.price)}
                  </p>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {product.category?.name ?? "Uncategorized"}
                  </Badge>
                  <Badge variant="outline">
                    {product.stock === null
                      ? "Unlimited stock"
                      : `${product.stock} in stock`}
                  </Badge>
                  <Badge variant={product.is_available ? "outline" : "destructive"}>
                    {product.is_available ? "Available" : "Unavailable"}
                  </Badge>
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={product.is_available}
                      onCheckedChange={() => void toggleAvailability(product)}
                      aria-label={`Toggle availability for ${product.name}`}
                    />
                    Available
                  </label>

                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label={`Edit ${product.name}`}
                      onClick={() => openEdit(product)}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label={`Delete ${product.name}`}
                      onClick={() => setDeleting(product)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<PackagePlusIcon className="size-5" />}
          title={products.length === 0 ? "No products yet" : "No products found"}
          description={
            products.length === 0
              ? "Add your first product to start selling."
              : "Try a different search keyword."
          }
          action={
            products.length === 0 ? (
              <Button size="sm" onClick={openCreate}>
                Add product
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                Clear search
              </Button>
            )
          }
        />
      )}

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editing}
        categories={categories}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
        title="Delete this product?"
        description={
          deleting
            ? `${deleting.name} will be removed from the catalog. Past transactions keep their records.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
