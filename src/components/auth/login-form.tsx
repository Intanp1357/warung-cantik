"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeOffIcon, HeartIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { createClient, } from "@/lib/supabase/client";
import { isSupabaseConfigured, missingConfigMessage } from "@/lib/supabase/config";
import { loginSchema, type LoginValues } from "@/lib/validations/auth";
import { getErrorMessage } from "@/lib/utils/errors";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LoginFormProps {
  shopName: string | null;
}

export function LoginForm({ shopName }: LoginFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPending, setResetPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    if (!isSupabaseConfigured) {
      toast.error(missingConfigMessage);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        toast.error(getErrorMessage(error));
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      router.push(profile?.role === "owner" ? "/dashboard" : "/pos");
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resetEmail.trim()) {
      toast.error("Enter your email address first.");
      return;
    }

    setResetPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin,
      });

      if (error) {
        toast.error(getErrorMessage(error));
        return;
      }

      toast.success("Password reset link sent. Check your inbox.");
      setResetOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setResetPending(false);
    }
  };

  return (
    <div className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <HeartIcon className="size-6" fill="currentColor" />
        </span>
        <p className="text-lg font-semibold tracking-tight">
          {shopName ?? APP_NAME}
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Welcome back! 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Log in to start cashiering.
        </p>
      </div>

      {!isSupabaseConfigured ? (
        <Alert className="mb-4">
          <AlertDescription>{missingConfigMessage}</AlertDescription>
        </Alert>
      ) : null}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@warung.com"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
        </FormField>

        <FormField
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
        >
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="pr-10"
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOffIcon className="size-4" />
              ) : (
                <EyeIcon className="size-4" />
              )}
            </button>
          </div>
        </FormField>

        <Button
          type="submit"
          className="h-10 w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2Icon className="animate-spin" />
              Logging in...
            </>
          ) : (
            "Login"
          )}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setResetOpen(true)}
          className="text-sm font-medium text-primary hover:underline"
        >
          Forgot password?
        </button>
      </div>

      {process.env.NODE_ENV !== "production" ? (
        <p className="mt-6 rounded-xl bg-muted p-3 text-center text-xs text-muted-foreground">
          Demo: owner@warung.test / owner123
          <br />
          cashier@warung.test / cashier123
        </p>
      ) : null}

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              We&apos;ll email you a link to set a new password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <FormField label="Email" htmlFor="reset-email">
              <Input
                id="reset-email"
                type="email"
                required
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                placeholder="you@warung.com"
              />
            </FormField>
            <DialogFooter>
              <Button type="submit" disabled={resetPending}>
                {resetPending ? "Sending..." : "Send reset link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
