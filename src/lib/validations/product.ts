import { z } from "zod";

export const productSchema = z.object({
  name: z.string().trim().min(1, "Nama produk wajib diisi").max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  category_id: z.string().uuid("Pilih kategori").or(z.literal("")),
  price: z
    .number({ error: "Harga wajib diisi" })
    .min(0, "Harga minimal 0")
    .max(100_000_000, "Harga terlalu besar"),
  cost_price: z
    .number({ error: "Harga modal wajib diisi" })
    .min(0, "Harga modal minimal 0")
    .max(100_000_000, "Harga modal terlalu besar"),
  /** Empty input means "stock tracking disabled" (unlimited stock). */
  stock: z
    .number()
    .min(0, "Stok minimal 0")
    .max(1_000_000, "Stok terlalu besar")
    .nullable(),
  image_url: z.string().url("URL gambar tidak valid").or(z.literal("")).nullable(),
  is_available: z.boolean(),
  /** Cashier can pick toppings for this product at the POS. */
  has_toppings: z.boolean(),
});

export type ProductValues = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Nama kategori wajib diisi").max(50),
  description: z.string().trim().max(200).optional().or(z.literal("")),
  /** Products of this category are offered as toppings. */
  is_topping: z.boolean(),
});

export type CategoryValues = z.infer<typeof categorySchema>;

export const shopSettingsSchema = z.object({
  shop_name: z.string().trim().min(1, "Nama warung wajib diisi").max(80),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  receipt_footer: z.string().trim().max(120).optional().or(z.literal("")),
});

export type ShopSettingsValues = z.infer<typeof shopSettingsSchema>;
