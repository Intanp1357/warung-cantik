import { z } from "zod";

/** One topping on a cart line — only ids and quantities leave the client. */
export const cartToppingSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(999),
});

export const cartItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(999),
  toppings: z.array(cartToppingSchema).max(30).optional(),
});

export const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1, "Keranjangmu kosong"),
  payment_method: z.enum(["cash", "qris", "transfer"]),
  payment_amount: z
    .number({ error: "Jumlah bayar wajib diisi" })
    .min(0, "Jumlah bayar minimal 0")
    .max(100_000_000, "Jumlah bayar terlalu besar"),
  /**
   * Idempotency key: the same cart retried after a network failure must not
   * create a second transaction. Generated on the client, stored server-side.
   */
  client_reference: z.string().uuid().optional(),
});

export type CheckoutValues = z.infer<typeof checkoutSchema>;
