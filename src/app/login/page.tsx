import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import { getShopSettings } from "@/lib/queries/catalog";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Login" };

export default async function LoginPage() {
  const context = await getSessionContext();
  if (context) {
    redirect(context.profile.role === "owner" ? "/dashboard" : "/pos");
  }

  const settings = await getShopSettings();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <LoginForm shopName={settings.data?.shop_name ?? null} />
      </div>
    </div>
  );
}
