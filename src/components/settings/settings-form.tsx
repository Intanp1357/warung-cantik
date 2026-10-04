"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { updateShopSettingsAction } from "@/lib/actions/settings";
import {
  shopSettingsSchema,
  type ShopSettingsValues,
} from "@/lib/validations/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/shared/form-field";
import type { ShopSettings } from "@/types";

interface SettingsFormProps {
  settings: ShopSettings | null;
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ShopSettingsValues>({
    resolver: zodResolver(shopSettingsSchema),
    defaultValues: {
      shop_name: settings?.shop_name ?? "",
      address: settings?.address ?? "",
      phone: settings?.phone ?? "",
      receipt_footer: settings?.receipt_footer ?? "",
    },
  });

  useEffect(() => {
    if (!settings) return;
    reset({
      shop_name: settings.shop_name,
      address: settings.address,
      phone: settings.phone,
      receipt_footer: settings.receipt_footer,
    });
  }, [settings, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const result = await updateShopSettingsAction(values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Pengaturan disimpan");
    reset(values);
  });

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Detail warung</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormField label="Nama warung" htmlFor="shop-name" required error={errors.shop_name?.message}>
            <Input
              id="shop-name"
              placeholder="Warung Cantik"
              aria-invalid={Boolean(errors.shop_name)}
              {...register("shop_name")}
            />
          </FormField>

          <FormField label="Alamat" htmlFor="shop-address" error={errors.address?.message}>
            <Input
              id="shop-address"
              placeholder="Jl. Mawar No. 10"
              {...register("address")}
            />
          </FormField>

          <FormField label="Nomor telepon" htmlFor="shop-phone" error={errors.phone?.message}>
            <Input id="shop-phone" placeholder="0812-0000-0000" {...register("phone")} />
          </FormField>

          <FormField
            label="Kata penutup struk"
            htmlFor="shop-footer"
            error={errors.receipt_footer?.message}
            hint="Dicetak di bagian bawah setiap struk."
          >
            <Input
              id="shop-footer"
              placeholder="Terima kasih! ♡"
              {...register("receipt_footer")}
            />
          </FormField>

          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? (
              <>
                <Loader2Icon className="animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Simpan pengaturan"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
