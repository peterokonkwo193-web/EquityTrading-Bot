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
    setValue,
    watch,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting, isDirty: isProfileDirty, isValid: isProfileValid },
  } = useForm<ProfileFormInput>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
    values: user ? { name: user.name, currency: user.currency } : undefined,
  });

  const selectedCurrency = watch("currency");

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
        <form onSubmit={handleProfileSubmit(onSubmitProfile)} className="flex max-w-md flex-col gap-5" noValidate>
          <Input label="Full name" error={profileErrors.name?.message} {...registerProfile("name")} />
          <Input label="Email" value={user?.email ?? ""} disabled readOnly />

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Preferred Currency</label>
            <div className="grid grid-cols-3 gap-3">
              {CURRENCIES.map((curr) => {
                const isSelected = selectedCurrency === curr;
                return (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => {
                      setValue("currency", curr, { shouldDirty: true, shouldValidate: true });
                    }}
                    className={`flex flex-col items-center justify-center p-4 border rounded-xl gap-1.5 transition-all select-none ${
                      isSelected
                        ? "border-gold bg-gold/[0.05] text-gold"
                        : "border-white/10 bg-white/[0.01] text-text-secondary hover:bg-white/[0.03] hover:text-text-primary"
                    }`}
                  >
                    <span className="font-bold text-sm tracking-wide">{curr}</span>
                    <span className="text-[10px] text-text-muted text-center leading-tight">
                      {curr === "USD" ? "Dollar ($)" : curr === "GBP" ? "Pound (£)" : "Euro (€)"}
                    </span>
                  </button>
                );
              })}
            </div>
            {profileErrors.currency && (
              <p className="text-xs text-danger">{profileErrors.currency.message}</p>
            )}
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
