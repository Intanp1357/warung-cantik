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

    toast.success(product ? "Product updated" : "Product added successfully");
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "Add product"}</DialogTitle>
          <DialogDescription>
            {product
              ? "Update the product details below."
              : "New products appear in the POS right away."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormField label="Product name" htmlFor="product-name" required error={errors.name?.message}>
            <Input
              id="product-name"
              placeholder="Es Teh Manis"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </FormField>

          <FormField
            label="Description"
            htmlFor="product-description"
            error={errors.description?.message}
          >
            <Textarea
              id="product-description"
              rows={2}
              placeholder="Sweet iced tea"
              {...register("description")}
            />
          </FormField>

          <FormField
            label="Category"
            htmlFor="product-category"
            error={errors.category_id?.message}
          >
            <select
              id="product-category"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              {...register("category_id")}
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Price (Rp)" htmlFor="product-price" required error={errors.price?.message}>
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

            <FormField label="Cost price (Rp)" htmlFor="product-cost" required error={errors.cost_price?.message}>
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
            label="Stock"
            htmlFor="product-stock"
            error={errors.stock?.message}
            hint="Leave empty to disable stock tracking."
          >
            <Input
              id="product-stock"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Unlimited"
              {...register("stock", {
                setValueAs: (value) =>
                  value === "" || value === null || value === undefined
                    ? null
                    : Number(value),
              })}
            />
          </FormField>

          <FormField label="Product image" error={errors.image_url?.message}>
            <ImageUpload
              value={imageUrl || null}
              onChange={(next) => setValue("image_url", next ?? "")}
            />
          </FormField>

          <div className="flex items-center justify-between rounded-xl border bg-card p-3">
            <Label htmlFor="product-available" className="text-sm">
              Available for sale
              <span className="block text-xs font-normal text-muted-foreground">
                {available ? "Shown in the POS" : "Hidden as sold out"}
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
              Add toppings
              <span className="block text-xs font-normal text-muted-foreground">
                {isToppingCategory
                  ? "A topping cannot have toppings itself."
                  : hasToppings
                    ? "Cashiers pick toppings when selling this"
                    : "Sold as a plain item"}
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
              Toppings offered here come from the products in your topping
              category (for example <span className="font-medium">Topping</span>
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
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Save product"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
