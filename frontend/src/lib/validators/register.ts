import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    currency: z.enum(["USD", "GBP", "EUR"], { message: "Select a currency" }),
    country: z.string().length(2, "Select your country"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormInput = z.infer<typeof registerSchema>;

export const verifyEmailSchema = z.object({
  code: z.string().min(1, "Enter the verification code"),
});

export type VerifyEmailFormInput = z.infer<typeof verifyEmailSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

export type ForgotPasswordFormInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormInput = z.infer<typeof resetPasswordSchema>;
