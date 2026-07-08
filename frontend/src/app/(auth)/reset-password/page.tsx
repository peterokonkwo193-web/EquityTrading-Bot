"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusBanner } from "@/components/status/StatusBanner";
import { useStatus } from "@/hooks/useStatus";
import { resetPasswordSchema, ResetPasswordFormInput } from "@/lib/validators/register";
import { resetPassword } from "@/lib/endpoints";
import { ApiError } from "@/lib/apiClient";

export default function ResetPasswordPage() {
  const router = useRouter();
  const status = useStatus();
  const [email, setEmail] = useState<string | null>(null);
  const [simulatedToken, setSimulatedToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ResetPasswordFormInput>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onChange",
  });

  useEffect(() => {
    const raw = sessionStorage.getItem("pending-reset");
    if (raw) {
      const { email, token } = JSON.parse(raw) as { email: string; token: string };
      setEmail(email);
      setSimulatedToken(token);
      setValue("token", token, { shouldValidate: true });
    }
  }, [setValue]);

  const onSubmit = async (values: ResetPasswordFormInput) => {
    status.clear();
    if (!email) {
      status.error("No pending reset request found. Please request a new one.");
      return;
    }
    try {
      await resetPassword({ email, token: values.token, newPassword: values.newPassword });
      sessionStorage.removeItem("pending-reset");
      status.success("Password reset. You can now log in.");
      setTimeout(() => router.replace("/login"), 1200);
    } catch (err) {
      status.error(err instanceof ApiError ? err.message : "Reset failed. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-2xl p-8 shadow-card">
        <div className="mb-8 flex flex-col items-center gap-2">
          <ShieldCheck className="h-10 w-10 text-gold" />
          <h1 className="text-xl font-semibold text-text-primary">Reset password</h1>
          <p className="text-center text-sm text-text-secondary">
            {email ? `Resetting password for ${email}` : "Enter your reset code and new password"}
          </p>
        </div>

        {simulatedToken && (
          <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center text-sm text-text-secondary">
            Security bypass token (Development Mode): <span className="font-semibold text-text-primary">{simulatedToken}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Input label="Reset code" error={errors.token?.message} {...register("token")} />
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

          <StatusBanner status={status.status} />

          <Button type="submit" className="mt-2 w-full" isLoading={isSubmitting} disabled={!isValid}>
            Reset password
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          <Link href="/login" className="text-primary hover:text-primary-hover">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
