import type { Metadata } from "next";
import { requireOwner } from "@/lib/auth";
import { getShopSettings } from "@/lib/queries/catalog";
import { PAYMENT_METHOD_LABELS, ROLE_LABELS } from "@/lib/constants";
import { formatLongDate } from "@/lib/utils/format";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { SettingsForm } from "@/components/settings/settings-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { profile, user } = await requireOwner();
  const settings = await getShopSettings();

  if (settings.error) {
    return (
      <div className="space-y-4">
        <PageHeader title="Settings" />
        <ErrorState message={settings.error} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Shop details used across the POS and receipts."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SettingsForm settings={settings.data} />

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Your account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-muted p-3">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="truncate text-sm font-medium">
                {profile.full_name || "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-muted p-3">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="truncate text-sm font-medium">{user.email}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-muted p-3">
              <span className="text-sm text-muted-foreground">Role</span>
              <Badge variant="secondary">{ROLE_LABELS[profile.role]}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-muted p-3">
              <span className="text-sm text-muted-foreground">Member since</span>
              <span className="text-sm font-medium">
                {formatLongDate(profile.created_at)}
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              Payments accepted:{" "}
              {Object.values(PAYMENT_METHOD_LABELS).join(" • ")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
