"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, PencilIcon, TagsIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/lib/actions/categories";
import { categorySchema, type CategoryValues } from "@/lib/validations/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/shared/form-field";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { Category, ProductWithCategory } from "@/types";

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
}

function CategoryFormDialog({
  open,
  onOpenChange,
  category,
}: CategoryFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: category?.name ?? "",
      description: category?.description ?? "",
    });
  }, [open, category, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const result = category
      ? await updateCategoryAction(category.id, values)
      : await createCategoryAction(values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(category ? "Category updated" : "Category added");
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "Add category"}</DialogTitle>
          <DialogDescription>
            Categories keep the POS easy to browse.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormField label="Category name" htmlFor="category-name" required error={errors.name?.message}>
            <Input
              id="category-name"
              placeholder="Drink"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </FormField>

          <FormField
            label="Description"
            htmlFor="category-description"
            error={errors.description?.message}
          >
            <Input
              id="category-description"
              placeholder="Fresh drinks"
              {...register("description")}
            />
          </FormField>

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
                "Save category"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface CategoryManagerProps {
  categories: Category[];
  products: ProductWithCategory[];
}

export function CategoryManager({ categories, products }: CategoryManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) {
      if (!product.category_id) continue;
      map.set(product.category_id, (map.get(product.category_id) ?? 0) + 1);
    }
    return map;
  }, [products]);

  const handleDelete = async () => {
    if (!deleting) return;
    const result = await deleteCategoryAction(deleting.id);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Category deleted");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          className="h-10 w-full sm:w-auto"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <TagsIcon />
          Add category
        </Button>
      </div>

      {categories.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <article
              key={category.id}
              className="flex flex-col gap-3 rounded-2xl border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">
                    {category.name}
                  </h3>
                  <p className="truncate text-xs text-muted-foreground">
                    {category.description || "No description"}
                  </p>
                </div>
                <Badge variant="secondary">
                  {counts.get(category.id) ?? 0} products
                </Badge>
              </div>

              <div className="mt-auto flex justify-end gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Edit ${category.name}`}
                  onClick={() => {
                    setEditing(category);
                    setDialogOpen(true);
                  }}
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Delete ${category.name}`}
                  onClick={() => setDeleting(category)}
                >
                  <Trash2Icon />
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<TagsIcon className="size-5" />}
          title="No categories yet"
          description="Add categories like Food, Drink or Snack."
          action={
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              Add category
            </Button>
          }
        />
      )}

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
        title="Delete this category?"
        description={
          deleting
            ? `${deleting.name} will be removed. Products keep working without a category.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
