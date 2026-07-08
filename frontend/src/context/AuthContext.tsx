"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Currency, User } from "@/types";
import { fetchMe, loginUser, logoutUser, registerUser } from "@/lib/endpoints";
import { ApiError } from "@/lib/apiClient";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  register: (name: string, email: string, password: string, currency: Currency) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => {
        // Clear stale token if session is invalid
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth_token");
        }
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    try {
      const { user, token } = await loginUser(email, password, rememberMe);
      // Store token in localStorage for cross-origin Bearer auth
      if (typeof window !== "undefined") {
        localStorage.setItem("auth_token", token);
      }
      setUser(user);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to log in. Please try again.", 0);
    }
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, currency: Currency) => {
      try {
        const { user, token } = await registerUser({ name, email, password, currency });
        if (typeof window !== "undefined") {
          localStorage.setItem("auth_token", token);
        }
        setUser(user);
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new ApiError("Unable to register. Please try again.", 0);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      // Clear stored token
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
      }
      setUser(null);
      router.replace("/login");
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
