"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogOut } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBanner } from "@/components/status/StatusBanner";
import { useStatus } from "@/hooks/useStatus";
import { LogoutConfirmModal } from "@/components/modals/LogoutConfirmModal";
import { useAuth } from "@/context/AuthContext";
import { profileSchema, ProfileFormInput, passwordSchema, PasswordFormInput } from "@/lib/validators/profile";
import { changePassword, fetchSettings, updateSettings, updateProfile } from "@/lib/endpoints";
import { ApiError } from "@/lib/apiClient";
import { Settings } from "@/types";

const CURRENCIES = ["USD", "GBP", "EUR"] as const;

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const profileStatus = useStatus();
  const passwordStatus = useStatus();
  const prefsStatus = useStatus();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
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

  useEffect(() => {
    fetchSettings()
      .then(setSettings)
      .catch(() => setSettings(null))
      .finally(() => setIsSettingsLoading(false));
  }, []);

  const handleToggle = async (key: keyof Pick<Settings, "emailNotifications" | "pushNotifications" | "tradeAlerts">, value: boolean) => {
    if (!settings) return;
    const previous = settings;
    setSettings({ ...settings, [key]: value });
    prefsStatus.clear();
    try {
      const updated = await updateSettings({ [key]: value });
      setSettings(updated);
    } catch (err) {
      setSettings(previous);
      prefsStatus.error(err instanceof ApiError ? err.message : "Failed to update preference.");
    }
  };

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
        <form onSubmit={handleProfileSubmit(onSubmitProfile)} className="flex max-w-md flex-col gap-4" noValidate>
          <Input label="Full name" error={profileErrors.name?.message} {...registerProfile("name")} />
          <Input label="Email" value={user?.email ?? ""} disabled readOnly />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Preferred currency</label>
            <select
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              {...registerProfile("currency")}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

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
        <h2 className="mb-2 text-lg font-semibold text-text-primary">Notification preferences</h2>
        {isSettingsLoading || !settings ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            <div className="divide-y divide-white/10">
              <Toggle
                label="Email notifications"
                description="Receive account updates via email"
                checked={settings.emailNotifications}
                onChange={(v) => handleToggle("emailNotifications", v)}
              />
              <Toggle
                label="Push notifications"
                description="Receive updates in your browser"
                checked={settings.pushNotifications}
                onChange={(v) => handleToggle("pushNotifications", v)}
              />
              <Toggle
                label="Trade alerts"
                description="Get notified about simulated trade results"
                checked={settings.tradeAlerts}
                onChange={(v) => handleToggle("tradeAlerts", v)}
              />
            </div>
            <StatusBanner status={prefsStatus.status} className="mt-3" />
          </>
        )}
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
