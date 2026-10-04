import { z } from "zod";

export const queueStatusSchema = z.enum(["pending", "done", "cancelled"], {
  message: "Status antrean tidak valid.",
});

export const queueStatusActionSchema = z.object({
  itemId: z.string().uuid("Item antrean tidak valid."),
  status: queueStatusSchema,
});
