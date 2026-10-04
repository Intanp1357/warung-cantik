import { z } from "zod";

export const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  category_id: z.string().uuid("Choose a category").or(z.literal("")),
  price: z
    .number({ error: "Price is required" })
    .min(0, "Price must be 0 or more")
    .max(100_000_000, "Price is too large"),
  cost_price: z
    .number({ error: "Cost price is required" })
    .min(0, "Cost price must be 0 or more")
    .max(100_000_000, "Cost price is too large"),
  /** Empty input means "stock tracking disabled" (unlimited stock). */
  stock: z
    .number()
    .min(0, "Stock must be 0 or more")
    .max(1_000_000, "Stock is too large")
    .nullable(),
  image_url: z.string().url("Image URL must be valid").or(z.literal("")).nullable(),
  is_available: z.boolean(),
  /** Cashier can pick toppings for this product at the POS. */
  has_toppings: z.boolean(),
});

export type ProductValues = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(50),
  description: z.string().trim().max(200).optional().or(z.literal("")),
  /** Products of this category are offered as toppings. */
  is_topping: z.boolean(),
});

export type CategoryValues = z.infer<typeof categorySchema>;

export const shopSettingsSchema = z.object({
  shop_name: z.string().trim().min(1, "Shop name is required").max(80),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  receipt_footer: z.string().trim().max(120).optional().or(z.literal("")),
});

export type ShopSettingsValues = z.infer<typeof shopSettingsSchema>;
