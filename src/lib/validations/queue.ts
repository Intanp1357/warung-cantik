import { z } from "zod";

export const queueStatusSchema = z.enum(["pending", "done", "cancelled"], {
  message: "Invalid queue status.",
});

export const queueStatusActionSchema = z.object({
  itemId: z.string().uuid("Invalid queue item."),
  status: queueStatusSchema,
});
