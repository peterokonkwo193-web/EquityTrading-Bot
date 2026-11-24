"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Account } from "@/types";
import { fetchAccounts } from "@/lib/endpoints";
import { useAuth } from "./AuthContext";

const STORAGE_KEY = "bot-trading:selected-account";
const ACCOUNTS_CACHE_KEY = "bot-trading:accounts-cache";

function getCachedAccounts(): Account[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(ACCOUNTS_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Account[]) : [];
  } catch {
    return [];
  }
}

interface AccountContextValue {
  accounts: Account[];
  selectedAccount: Account | null;
  isLoading: boolean;
  selectAccount: (accountId: string) => void;
  refreshAccounts: () => Promise<void>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>(getCachedAccounts);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = sessionStorage.getItem(STORAGE_KEY);
    const cached = getCachedAccounts();
    if (stored && cached.some((a) => a.id === stored)) return stored;
    return cached[0]?.id ?? null;
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    return getCachedAccounts().length === 0;
  });

  const refreshAccounts = useCallback(async () => {
    try {
      const data = await fetchAccounts();
      setAccounts(data);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(ACCOUNTS_CACHE_KEY, JSON.stringify(data));
      }
      setSelectedAccountId((current) => {
        if (current && data.some((a) => a.id === current)) return current;
        const stored = typeof window !== "undefined" ? sessionStorage.getItem(STORAGE_KEY) : null;
        if (stored && data.some((a) => a.id === stored)) return stored;
        return data[0]?.id ?? null;
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setAccounts([]);
      setSelectedAccountId(null);
      setIsLoading(false);
      return;
    }
    refreshAccounts();

    // Poll in the background so balance changes an admin approves (deposits,
    // withdrawals) show up on the user's dashboard without a manual refresh.
    const interval = setInterval(() => {
      refreshAccounts().catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [user, refreshAccounts]);

  const selectAccount = useCallback((accountId: string) => {
    setSelectedAccountId(accountId);
    sessionStorage.setItem(STORAGE_KEY, accountId);
  }, []);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null;

  return (
    <AccountContext.Provider value={{ accounts, selectedAccount, isLoading, selectAccount, refreshAccounts }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used within an AccountProvider");
  return ctx;
}
