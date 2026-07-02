"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Bot, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/toast/ToastProvider";
import { loginSchema, LoginFormInput } from "@/lib/validators/auth";
import { ApiError } from "@/lib/apiClient";
import { FullPageLoader } from "@/components/layout/FullPageLoader";

export default function LoginPage() {
  const { user, isLoading: isAuthLoading, login } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

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
    setServerError(null);
    try {
      await login(values.email, values.password);
      toast.success("Logged in successfully");
      router.replace("/dashboard");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Login failed. Please try again.";
      setServerError(message);
      toast.error(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-card-border bg-card p-8 shadow-card">
        <div className="mb-8 flex flex-col items-center gap-2">
          <Bot className="h-10 w-10 text-primary" />
          <h1 className="text-xl font-semibold text-text-primary">Welcome back</h1>
          <p className="text-sm text-text-secondary">Sign in to manage your trading bot</p>
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

          {serverError && <p className="text-sm text-danger">{serverError}</p>}

          <Button type="submit" className="mt-2 w-full" isLoading={isSubmitting} disabled={!isValid}>
            Log in
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-text-muted">
          Demo login: demo@bottrading.dev / Demo1234!
        </p>
      </div>
    </div>
  );
}
