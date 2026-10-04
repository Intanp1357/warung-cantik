import { getShopSettings } from "@/lib/queries/catalog";
import { getPendingQueueCount } from "@/lib/queries/queue";
import { requireSession } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { BottomNav } from "@/components/layout/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const [settings, pendingCount] = await Promise.all([
    getShopSettings(),
    getPendingQueueCount(),
  ]);
  const shopName = settings.data?.shop_name || APP_NAME;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        profile={session.profile}
        shopName={shopName}
        pendingCount={pendingCount}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader profile={session.profile} shopName={shopName} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 pb-28 sm:px-6 lg:px-8 lg:py-6 lg:pb-10">
          {children}
        </main>
      </div>

      <BottomNav
        profile={session.profile}
        shopName={shopName}
        pendingCount={pendingCount}
      />
    </div>
  );
}
