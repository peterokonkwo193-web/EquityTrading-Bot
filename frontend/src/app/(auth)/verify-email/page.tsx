"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusBanner } from "@/components/status/StatusBanner";
import { useStatus } from "@/hooks/useStatus";
import { verifyEmailSchema, VerifyEmailFormInput } from "@/lib/validators/register";
import { verifyEmail } from "@/lib/endpoints";
import { ApiError } from "@/lib/apiClient";

export default function VerifyEmailPage() {
  const router = useRouter();
  const status = useStatus();
  const [email, setEmail] = useState<string | null>(null);
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<VerifyEmailFormInput>({
    resolver: zodResolver(verifyEmailSchema),
    mode: "onChange",
  });

  useEffect(() => {
    const raw = sessionStorage.getItem("pending-verification");
    if (raw) {
      const { email, code } = JSON.parse(raw) as { email: string; code: string };
      setEmail(email);
      setSimulatedCode(code);
      setValue("code", code, { shouldValidate: true });
    }
  }, [setValue]);

  const onSubmit = async (values: VerifyEmailFormInput) => {
    status.clear();
    if (!email) {
      status.error("No pending registration found. Please register again.");
      return;
    }
    try {
      await verifyEmail(email, values.code);
      sessionStorage.removeItem("pending-verification");
      status.success("Email verified. You can now log in.");
      setTimeout(() => router.replace("/login"), 1200);
    } catch (err) {
      status.error(err instanceof ApiError ? err.message : "Verification failed. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-2xl p-8 shadow-card">
        <div className="mb-8 flex flex-col items-center gap-2">
          <MailCheck className="h-10 w-10 text-gold" />
          <h1 className="text-xl font-semibold text-text-primary">Verify your email</h1>
          <p className="text-center text-sm text-text-secondary">
            {email ? `We sent a verification code to ${email}` : "Enter the verification code sent to your email"}
          </p>
        </div>

        {simulatedCode && (
          <div className="mb-4 rounded-xl border border-gold/30 bg-gold-muted/30 p-3 text-center text-sm text-gold">
            Simulated email — your code is <span className="font-semibold">{simulatedCode}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Input label="Verification code" error={errors.code?.message} {...register("code")} />

          <StatusBanner status={status.status} />

          <Button type="submit" className="mt-2 w-full" isLoading={isSubmitting} disabled={!isValid}>
            Verify email
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
