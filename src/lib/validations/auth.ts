import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email wajib diisi")
    .pipe(z.email("Masukkan alamat email yang valid")),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const resetPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email wajib diisi")
    .pipe(z.email("Masukkan alamat email yang valid")),
});

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
