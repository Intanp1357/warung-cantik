import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  hint?: string;
}

export function StatCard({ label, value, icon, hint }: StatCardProps) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-primary">
            {icon}
          </span>
        </div>
        <p className="text-xl font-semibold tracking-tight sm:text-2xl">
          {value}
        </p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
