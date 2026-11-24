"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, ChevronDown, Settings as SettingsIcon, LogOut, Wallet, PanelLeft } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { NAV_ITEMS } from "./navItems";

interface TopbarProps {
  onMenuClick: () => void;
  onLogoutClick: () => void;
  onAccountSwitchClick: () => void;
}

function useOutsideClick(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside]);
  return ref;
}

export function Topbar({ onMenuClick, onLogoutClick, onAccountSwitchClick }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { selectedAccount } = useAccount();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const profileRef = useOutsideClick(() => setIsProfileOpen(false));

  const pageTitle = NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.label ?? "Dashboard";

  const firstName = user?.name ? user.name.split(" ")[0] : "Trader";
  const currency = selectedAccount?.currency || "USD";
  const initial = user?.name ? user.name[0].toUpperCase() : "U";

  return (
    <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center justify-between border-b border-white/10 bg-black/80 px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="text-text-primary hover:text-white md:hidden p-1 -ml-1 transition-colors"
          aria-label="Open menu"
        >
          <PanelLeft className="h-6 w-6 stroke-[1.75]" />
        </button>
        <h1 className="hidden md:block text-lg font-semibold text-text-primary">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2.5 md:gap-4">
        {/* Mobile: Currency & User Name Stacked */}
        <button
          onClick={onAccountSwitchClick}
          className="flex flex-col items-end text-right md:hidden cursor-pointer"
        >
          <span className="text-[10px] font-medium text-text-muted uppercase leading-tight tracking-wide">
            {currency}
          </span>
          <span className="text-xs font-semibold text-text-primary leading-tight">
            {firstName}
          </span>
        </button>

        {/* Desktop: Wallet Pill */}
        <button
          onClick={onAccountSwitchClick}
          className="hidden md:flex glass items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary border border-white/10"
        >
          <Wallet className="h-3.5 w-3.5 shrink-0" />
          <span>{selectedAccount ? selectedAccount.name : "Select account"}</span>
        </button>

        {/* Profile Avatar */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="flex items-center gap-2"
            aria-label="Profile menu"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-xs shadow-md">
              {initial}
            </div>
            <ChevronDown className="hidden h-4 w-4 text-text-muted sm:block" />
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="glass absolute right-0 mt-3 w-52 rounded-2xl p-2 shadow-card"
              >
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    router.push("/settings");
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary"
                >
                  <SettingsIcon className="h-4 w-4" />
                  Settings
                </button>
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onLogoutClick();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-text-secondary hover:bg-white/5 hover:text-danger"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
