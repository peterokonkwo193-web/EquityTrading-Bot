"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TrendingUp, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusBanner } from "@/components/status/StatusBanner";
import { useAuth } from "@/context/AuthContext";
import { useStatus } from "@/hooks/useStatus";
import { loginSchema, LoginFormInput } from "@/lib/validators/auth";
import { ApiError } from "@/lib/apiClient";
import { FullPageLoader } from "@/components/layout/FullPageLoader";

export default function LoginPage() {
  const { user, isLoading: isAuthLoading, login } = useAuth();
  const router = useRouter();
  const status = useStatus();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<LoginFormInput>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (!isAuthLoading && user) {
      router.replace("/dashboard");
    }
  }, [isAuthLoading, user, router]);

  if (isAuthLoading || user) {
    return <FullPageLoader />;
  }

  const onSubmit = async (values: LoginFormInput) => {
    status.clear();
    try {
      await login(values.email, values.password, rememberMe);
      router.replace("/dashboard");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Login failed. Please try again.";
      status.error(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-2xl p-8 shadow-card">
        <div className="mb-8 flex flex-col items-center gap-2">
          <TrendingUp className="h-10 w-10 text-gold" />
          <h1 className="text-xl font-semibold text-text-primary">Equity Trading Platform</h1>
          <p className="text-center text-sm text-text-secondary">
            Sign in to your trading account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
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

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-text-secondary">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 accent-primary"
              />
              Remember me
            </label>
            <Link href="/forgot-password" className="text-primary hover:text-primary-hover">
              Forgot password?
            </Link>
          </div>

          <StatusBanner status={status.status} />

          <Button type="submit" className="mt-2 w-full" isLoading={isSubmitting} disabled={!isValid}>
            Log in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary hover:text-primary-hover">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
