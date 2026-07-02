"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { useToast } from "@/components/toast/ToastProvider";
import { profileSchema, ProfileFormInput } from "@/lib/validators/profile";
import { updateProfile } from "@/lib/endpoints";
import { ApiError } from "@/lib/apiClient";

export default function ProfilePage() {
  const { user } = useAuth();
  const { accounts } = useAccount();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty, isValid },
  } = useForm<ProfileFormInput>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
    defaultValues: { name: user?.name ?? "" },
  });

  useEffect(() => {
    if (user) reset({ name: user.name });
  }, [user, reset]);

  const onSubmit = async (values: ProfileFormInput) => {
    try {
      await updateProfile(values);
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update profile.");
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
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Edit profile</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-md flex-col gap-4" noValidate>
          <Input label="Full name" error={errors.name?.message} {...register("name")} />
          <Input label="Email" value={user?.email ?? ""} disabled readOnly />
          <Button type="submit" className="w-fit" isLoading={isSubmitting} disabled={!isDirty || !isValid}>
            Save changes
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Trading accounts</h2>
        <ul className="flex flex-col divide-y divide-card-border">
          {accounts.map((account) => (
            <li key={account.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="text-text-primary">{account.name}</p>
                <p className="text-xs text-text-muted">{account.accountNumber}</p>
              </div>
              <span className="text-text-secondary">
                ${Number(account.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
