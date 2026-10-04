import { z } from "zod";

export const cartItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(999),
});

export const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1, "Your cart is empty"),
  payment_method: z.enum(["cash", "qris", "transfer"]),
  payment_amount: z
    .number({ error: "Payment amount is required" })
    .min(0, "Payment amount must be 0 or more")
    .max(100_000_000, "Payment amount is too large"),
});

export type CheckoutValues = z.infer<typeof checkoutSchema>;
