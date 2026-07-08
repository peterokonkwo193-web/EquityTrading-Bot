"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TrendingUp, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusBanner } from "@/components/status/StatusBanner";
import { useStatus } from "@/hooks/useStatus";
import { registerSchema, RegisterFormInput } from "@/lib/validators/register";
import { registerUser } from "@/lib/endpoints";
import { ApiError } from "@/lib/apiClient";


export default function RegisterPage() {
  const router = useRouter();
  const status = useStatus();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: { currency: "USD" },
  });

  const onSubmit = async (values: RegisterFormInput) => {
    status.clear();
    try {
      const { user, verificationCode } = await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
        currency: values.currency,
      });
      sessionStorage.setItem(
        "pending-verification",
        JSON.stringify({ email: user.email, code: verificationCode })
      );
      router.push("/verify-email");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Registration failed. Please try again.";
      status.error(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="glass w-full max-w-md rounded-2xl p-8 shadow-card">
        <div className="mb-8 flex flex-col items-center gap-2">
          <TrendingUp className="h-10 w-10 text-gold" />
          <h1 className="text-xl font-semibold text-text-primary">Create your account</h1>
          <p className="text-center text-sm text-text-secondary">
            Join the premium auto-trading console
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Input label="Full name" error={errors.name?.message} {...register("name")} />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            error={errors.password?.message}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-text-muted hover:text-text-primary"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            {...register("password")}
          />
          <Input
            label="Confirm password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Display currency</label>
            <select
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              {...register("currency")}
            >
              <option value="USD" className="bg-background-card">US Dollar ($)</option>
              <option value="GBP" className="bg-background-card">British Pound (£)</option>
              <option value="EUR" className="bg-background-card">Euro (€)</option>
            </select>
          </div>

          <StatusBanner status={status.status} />

          <Button type="submit" className="mt-2 w-full" isLoading={isSubmitting} disabled={!isValid}>
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:text-primary-hover">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
