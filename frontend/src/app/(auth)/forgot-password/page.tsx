"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusBanner } from "@/components/status/StatusBanner";
import { useStatus } from "@/hooks/useStatus";
import { forgotPasswordSchema, ForgotPasswordFormInput } from "@/lib/validators/register";
import { forgotPassword } from "@/lib/endpoints";
import { ApiError } from "@/lib/apiClient";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const status = useStatus();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ForgotPasswordFormInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onChange",
  });

  const onSubmit = async (values: ForgotPasswordFormInput) => {
    status.clear();
    try {
      const { resetToken } = await forgotPassword(values.email);
      if (resetToken) {
        sessionStorage.setItem("pending-reset", JSON.stringify({ email: values.email, token: resetToken }));
      }
      status.success("If that email exists, a reset link has been generated.");
      setTimeout(() => router.push("/reset-password"), 1000);
    } catch (err) {
      status.error(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-2xl p-8 shadow-card">
        <div className="mb-8 flex flex-col items-center gap-2">
          <KeyRound className="h-10 w-10 text-gold" />
          <h1 className="text-xl font-semibold text-text-primary">Forgot password</h1>
          <p className="text-center text-sm text-text-secondary">
            Enter your email and we&apos;ll generate a reset code
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />

          <StatusBanner status={status.status} />

          <Button type="submit" className="mt-2 w-full" isLoading={isSubmitting} disabled={!isValid}>
            Send reset code
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
