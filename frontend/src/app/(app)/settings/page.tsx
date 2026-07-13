"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogOut } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBanner } from "@/components/status/StatusBanner";
import { useStatus } from "@/hooks/useStatus";
import { LogoutConfirmModal } from "@/components/modals/LogoutConfirmModal";
import { useAuth } from "@/context/AuthContext";
import { profileSchema, ProfileFormInput, passwordSchema, PasswordFormInput } from "@/lib/validators/profile";
import { changePassword, updateProfile } from "@/lib/endpoints";
import { ApiError } from "@/lib/apiClient";

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const profileStatus = useStatus();
  const passwordStatus = useStatus();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting, isDirty: isProfileDirty, isValid: isProfileValid },
  } = useForm<ProfileFormInput>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
    values: user ? { name: user.name, currency: user.currency } : undefined,
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting, isValid: isPasswordValid },
  } = useForm<PasswordFormInput>({
    resolver: zodResolver(passwordSchema),
    mode: "onChange",
  });

  const onSubmitProfile = async (values: ProfileFormInput) => {
    profileStatus.clear();
    try {
      const updated = await updateProfile(values);
      setUser({ ...user!, name: updated.name, currency: updated.currency });
      profileStatus.success("Profile updated successfully");
    } catch (err) {
      profileStatus.error(err instanceof ApiError ? err.message : "Failed to update profile.");
    }
  };

  const onSubmitPassword = async (values: PasswordFormInput) => {
    passwordStatus.clear();
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      passwordStatus.success("Password updated successfully");
      resetPassword();
    } catch (err) {
      passwordStatus.error(err instanceof ApiError ? err.message : "Failed to update password.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex items-center gap-4">
        <Avatar name={user?.name ?? "?"} size="lg" />
        <div>
          <p className="text-lg font-semibold text-text-primary">{user?.name}</p>
          <p className="text-sm text-text-secondary">{user?.email}</p>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Profile</h2>
        <form onSubmit={handleProfileSubmit(onSubmitProfile)} className="flex max-w-md flex-col gap-5" noValidate>
          <Input label="Full name" error={profileErrors.name?.message} {...registerProfile("name")} />
          <Input label="Email" value={user?.email ?? ""} disabled readOnly />

          <StatusBanner status={profileStatus.status} />

          <Button
            type="submit"
            className="w-fit"
            isLoading={isProfileSubmitting}
            disabled={!isProfileDirty || !isProfileValid}
          >
            Save changes
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Change password</h2>
        <form onSubmit={handlePasswordSubmit(onSubmitPassword)} className="flex max-w-md flex-col gap-4" noValidate>
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            error={passwordErrors.currentPassword?.message}
            {...registerPassword("currentPassword")}
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            error={passwordErrors.newPassword?.message}
            {...registerPassword("newPassword")}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            error={passwordErrors.confirmPassword?.message}
            {...registerPassword("confirmPassword")}
          />

          <StatusBanner status={passwordStatus.status} />

          <Button type="submit" className="w-fit" isLoading={isPasswordSubmitting} disabled={!isPasswordValid}>
            Update password
          </Button>
        </form>
      </Card>

      <Card>
        <Button variant="danger" onClick={() => setIsLogoutModalOpen(true)}>
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </Card>

      <LogoutConfirmModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} />
    </div>
  );
}
