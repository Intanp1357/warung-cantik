import type { Metadata } from "next";
import { getCategories, getProducts } from "@/lib/queries/catalog";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { POSView } from "@/components/pos/pos-view";

export const metadata: Metadata = { title: "POS" };

export default async function PosPage() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  if (products.error || categories.error) {
    return (
      <div className="space-y-4">
        <PageHeader title="Point of Sale" />
        <ErrorState
          message={products.error ?? categories.error ?? undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      <PageHeader
        title="Point of Sale"
        description="Tap a product to add it to the cart."
      />
      <POSView products={products.data} categories={categories.data} />
    </div>
  );
}
