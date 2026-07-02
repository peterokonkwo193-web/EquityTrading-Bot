"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Account } from "@/types";
import { fetchAccounts } from "@/lib/endpoints";
import { useAuth } from "./AuthContext";

const STORAGE_KEY = "bot-trading:selected-account";

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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAccounts = useCallback(async () => {
    const data = await fetchAccounts();
    setAccounts(data);
    setSelectedAccountId((current) => {
      if (current && data.some((a) => a.id === current)) return current;
      const stored = typeof window !== "undefined" ? sessionStorage.getItem(STORAGE_KEY) : null;
      if (stored && data.some((a) => a.id === stored)) return stored;
      return data[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setAccounts([]);
      setSelectedAccountId(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    refreshAccounts().finally(() => setIsLoading(false));
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
