import type { Metadata } from "next";
import { requireOwner } from "@/lib/auth";
import { getCategories, getProducts } from "@/lib/queries/catalog";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { CategoryManager } from "@/components/products/category-manager";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireOwner();

  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts(),
  ]);

  if (categories.error || products.error) {
    return (
      <div className="space-y-4">
        <PageHeader title="Categories" />
        <ErrorState message={categories.error ?? products.error ?? undefined} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Categories"
        description="Group products so cashiers find them faster."
      />
      <CategoryManager
        categories={categories.data}
        products={products.data}
      />
    </div>
  );
}
