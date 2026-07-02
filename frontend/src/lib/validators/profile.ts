import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

export type ProfileFormInput = z.infer<typeof profileSchema>;

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type PasswordFormInput = z.infer<typeof passwordSchema>;
