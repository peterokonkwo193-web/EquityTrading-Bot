"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, ChevronDown, Settings as SettingsIcon, LogOut, Wallet } from "lucide-react";
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

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-black/70 px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="text-text-secondary hover:text-text-primary md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-text-primary">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={onAccountSwitchClick}
          className="glass flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary border border-white/10"
        >
          <Wallet className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">
            {selectedAccount ? selectedAccount.name : "Select account"}
          </span>
          <span className="sm:hidden text-[10px]">
            {selectedAccount ? selectedAccount.name.split(" ")[0] : "Select"}
          </span>
        </button>

        <div ref={profileRef} className="relative">
          <button
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="flex items-center gap-2"
            aria-label="Profile menu"
          >
            <Avatar name={user?.name ?? "?"} size="sm" />
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
