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
      title="Oops! Something went wrong."
      description={message ?? "Please try again in a moment."}
      action={
        onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : undefined
      }
    />
  );
}
