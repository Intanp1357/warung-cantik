"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { createProductAction, updateProductAction } from "@/lib/actions/products";
import { productSchema, type ProductValues } from "@/lib/validations/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/shared/form-field";
import { ImageUpload } from "@/components/products/image-upload";
import type { Category, ProductWithCategory } from "@/types";

const emptyValues: ProductValues = {
  name: "",
  description: "",
  category_id: "",
  price: 0,
  cost_price: 0,
  stock: null,
  image_url: "",
  is_available: true,
  has_toppings: false,
};

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductWithCategory | null;
  categories: Category[];
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
}: ProductFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!open) return;

    reset(
      product
        ? {
            name: product.name,
            description: product.description ?? "",
            category_id: product.category_id ?? "",
            price: product.price,
            cost_price: product.cost_price,
            stock: product.stock,
            image_url: product.image_url ?? "",
            is_available: product.is_available,
            has_toppings: product.has_toppings,
          }
        : emptyValues,
    );
  }, [open, product, reset]);

  const imageUrl = useWatch({ control, name: "image_url" });
  const available = useWatch({ control, name: "is_available" });
  const hasToppings = useWatch({ control, name: "has_toppings" });
  const categoryId = useWatch({ control, name: "category_id" });
  // A topping is never ordered with toppings of its own.
  const isToppingCategory =
    categories.find((category) => category.id === categoryId)?.is_topping ?? false;

  const onSubmit = handleSubmit(async (values) => {
    const result = product
      ? await updateProductAction(product.id, {
          ...values,
          has_toppings: isToppingCategory ? false : values.has_toppings,
        })
      : await createProductAction({
          ...values,
          has_toppings: isToppingCategory ? false : values.has_toppings,
        });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(product ? "Produk diperbarui" : "Produk berhasil ditambahkan");
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? "Ubah produk" : "Tambah produk"}</DialogTitle>
          <DialogDescription>
            {product
              ? "Perbarui detail produk di bawah ini."
              : "Produk baru langsung muncul di POS."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormField label="Nama produk" htmlFor="product-name" required error={errors.name?.message}>
            <Input
              id="product-name"
              placeholder="Es Teh Manis"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </FormField>

          <FormField
            label="Deskripsi"
            htmlFor="product-description"
            error={errors.description?.message}
          >
            <Textarea
              id="product-description"
              rows={2}
              placeholder="Teh manis dingin"
              {...register("description")}
            />
          </FormField>

          <FormField
            label="Kategori"
            htmlFor="product-category"
            error={errors.category_id?.message}
          >
            <select
              id="product-category"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              {...register("category_id")}
            >
              <option value="">Tanpa kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Harga (Rp)" htmlFor="product-price" required error={errors.price?.message}>
              <Input
                id="product-price"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="5000"
                aria-invalid={Boolean(errors.price)}
                {...register("price", { valueAsNumber: true })}
              />
            </FormField>

            <FormField label="Harga modal (Rp)" htmlFor="product-cost" required error={errors.cost_price?.message}>
              <Input
                id="product-cost"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="2000"
                aria-invalid={Boolean(errors.cost_price)}
                {...register("cost_price", { valueAsNumber: true })}
              />
            </FormField>
          </div>

          <FormField
            label="Stok"
            htmlFor="product-stock"
            error={errors.stock?.message}
            hint="Kosongkan jika tidak ingin melacak stok."
          >
            <Input
              id="product-stock"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Tanpa batas"
              {...register("stock", {
                setValueAs: (value) =>
                  value === "" || value === null || value === undefined
                    ? null
                    : Number(value),
              })}
            />
          </FormField>

          <FormField label="Gambar produk" error={errors.image_url?.message}>
            <ImageUpload
              value={imageUrl || null}
              onChange={(next) => setValue("image_url", next ?? "")}
            />
          </FormField>

          <div className="flex items-center justify-between rounded-xl border bg-card p-3">
            <Label htmlFor="product-available" className="text-sm">
              Dijual
              <span className="block text-xs font-normal text-muted-foreground">
                {available ? "Tampil di POS" : "Disembunyikan karena habis"}
              </span>
            </Label>
            <Switch
              id="product-available"
              checked={available}
              onCheckedChange={(checked) => setValue("is_available", checked)}
            />
          </div>

          <div
            className={cn(
              "flex items-center justify-between rounded-xl border bg-card p-3",
              isToppingCategory && "opacity-60",
            )}
          >
            <Label htmlFor="product-toppings" className="text-sm">
              Terima topping
              <span className="block text-xs font-normal text-muted-foreground">
                {isToppingCategory
                  ? "Topping tidak bisa menambah topping sendiri."
                  : hasToppings
                    ? "Kasir memilih topping saat menjual ini"
                    : "Dijual tanpa topping"}
              </span>
            </Label>
            <Switch
              id="product-toppings"
              checked={hasToppings && !isToppingCategory}
              disabled={isToppingCategory}
              onCheckedChange={(checked) => setValue("has_toppings", checked)}
            />
          </div>

          {!isToppingCategory ? (
            <p className="text-xs text-muted-foreground">
              Topping yang ditawarkan berasal dari produk pada kategori topping
              kamu (misalnya <span className="font-medium">Topping</span>
              ).
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan produk"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
