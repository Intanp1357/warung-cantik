import type { Metadata } from "next";
import { requireOwner } from "@/lib/auth";
import { getCategories, getProducts } from "@/lib/queries/catalog";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { ProductsManager } from "@/components/products/products-manager";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage() {
  await requireOwner();

  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  if (products.error || categories.error) {
    return (
      <div className="space-y-4">
        <PageHeader title="Products" />
        <ErrorState message={products.error ?? categories.error ?? undefined} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Products"
        description="Manage your catalog, prices and stock."
      />
      <ProductsManager
        products={products.data}
        categories={categories.data}
      />
    </div>
  );
}
