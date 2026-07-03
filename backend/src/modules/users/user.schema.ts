import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  avatarUrl: z.string().url("Enter a valid URL").nullable().optional(),
  currency: z.enum(["USD", "GBP", "EUR"]).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
