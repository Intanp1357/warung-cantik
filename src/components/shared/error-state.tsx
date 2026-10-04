import { TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <EmptyState
      icon={<TriangleAlertIcon className="size-5" />}
      title="Ups, terjadi kesalahan."
      description={message ?? "Coba lagi beberapa saat lagi."}
      action={
        onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Coba lagi
          </Button>
        ) : undefined
      }
    />
  );
}
