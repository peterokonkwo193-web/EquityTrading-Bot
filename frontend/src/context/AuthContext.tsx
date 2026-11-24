"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/types";
import { fetchMe, loginUser, logoutUser } from "@/lib/endpoints";
import { ApiError } from "@/lib/apiClient";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";

function getCachedUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(getCachedUser);
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const hasToken = !!localStorage.getItem(AUTH_TOKEN_KEY);
    // If no token exists, user is definitely logged out, no need to wait
    if (!hasToken) return false;
    // If we have cached user, we can render immediately while revalidating
    const cached = getCachedUser();
    return !cached;
  });
  const router = useRouter();

  const setUser = useCallback((newUser: User | null) => {
    setUserState(newUser);
    if (typeof window !== "undefined") {
      if (newUser) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser));
      } else {
        localStorage.removeItem(AUTH_USER_KEY);
      }
    }
  }, []);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
    if (!token) {
      setUserState(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    fetchMe()
      .then((freshUser) => {
        if (!cancelled) {
          setUser(freshUser);
        }
      })
      .catch(() => {
        // Clear stale token if session is invalid
        if (typeof window !== "undefined") {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem(AUTH_USER_KEY);
        }
        if (!cancelled) {
          setUserState(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [setUser]);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    try {
      const { user: loggedInUser, token } = await loginUser(email, password, rememberMe);
      // Store token in localStorage for cross-origin Bearer auth
      if (typeof window !== "undefined") {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
      }
      setUser(loggedInUser);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to log in. Please try again.", 0);
    }
  }, [setUser]);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      // Clear stored token and user cache
      if (typeof window !== "undefined") {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
      }
      setUserState(null);
      router.replace("/login");
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
