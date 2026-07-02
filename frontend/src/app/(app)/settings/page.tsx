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
import { LogoutConfirmModal } from "@/components/modals/LogoutConfirmModal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/toast/ToastProvider";
import { passwordSchema, PasswordFormInput } from "@/lib/validators/profile";
import { changePassword, fetchSettings, updateSettings } from "@/lib/endpoints";
import { ApiError } from "@/lib/apiClient";
import { Settings } from "@/types";

export default function SettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
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

  const handleToggle = async (key: keyof Pick<Settings, "emailNotifications" | "pushNotifications" | "botAlerts">, value: boolean) => {
    if (!settings) return;
    const previous = settings;
    setSettings({ ...settings, [key]: value });
    try {
      const updated = await updateSettings({ [key]: value });
      setSettings(updated);
    } catch (err) {
      setSettings(previous);
      toast.error(err instanceof ApiError ? err.message : "Failed to update preference.");
    }
  };

  const onSubmitPassword = async (values: PasswordFormInput) => {
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      toast.success("Password updated successfully");
      reset();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update password.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Account</h2>
        <div className="flex flex-col gap-1 text-sm">
          <p className="text-text-secondary">
            Name: <span className="text-text-primary">{user?.name}</span>
          </p>
          <p className="text-text-secondary">
            Email: <span className="text-text-primary">{user?.email}</span>
          </p>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Change password</h2>
        <form onSubmit={handleSubmit(onSubmitPassword)} className="flex max-w-md flex-col gap-4" noValidate>
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register("currentPassword")}
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
          <Button type="submit" className="w-fit" isLoading={isSubmitting} disabled={!isValid}>
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
          <div className="divide-y divide-card-border">
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
              label="Bot alerts"
              description="Get notified about bot start, stop and errors"
              checked={settings.botAlerts}
              onChange={(v) => handleToggle("botAlerts", v)}
            />
          </div>
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
