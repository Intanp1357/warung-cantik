import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .pipe(z.email("Enter a valid email address")),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const resetPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .pipe(z.email("Enter a valid email address")),
});

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
