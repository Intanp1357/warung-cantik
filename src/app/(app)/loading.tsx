import { ProductGridSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded-lg bg-muted" />
      </div>
      <ProductGridSkeleton count={8} />
    </div>
  );
}
