import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { getShopSettings } from "@/lib/queries/catalog";
import { getTransactionById } from "@/lib/queries/transactions";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Receipt } from "@/components/transactions/receipt";
import { PrintButton } from "@/components/transactions/print-button";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Transaction Detail" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TransactionDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [transaction, shop] = await Promise.all([
    getTransactionById(id),
    getShopSettings(),
  ]);

  if (transaction.error) {
    return <ErrorState message={transaction.error} />;
  }

  if (!transaction.data) {
    return (
      <EmptyState
        title="Transaction not found"
        description="This transaction may have been removed."
        action={
          <Link href="/transactions" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Back to transactions
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between">
        <Link
          href="/transactions"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ArrowLeftIcon />
          Back
        </Link>
        <PrintButton />
      </div>

      <div className="space-y-3">
        <div className="no-print mx-auto w-full max-w-sm">
          <h1 className="text-center text-lg font-semibold tracking-tight">
            Transaction Detail
          </h1>
        </div>

        <Receipt
          transaction={transaction.data}
          shop={shop.error ? null : shop.data}
        />
      </div>
    </div>
  );
}
