"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Bell, ChevronDown, User as UserIcon, LogOut, Wallet } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { fetchNotifications, markAllNotificationsRead } from "@/lib/endpoints";
import { Notification } from "@/types";
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const notifRef = useOutsideClick(() => setIsNotifOpen(false));
  const profileRef = useOutsideClick(() => setIsProfileOpen(false));

  const pageTitle = NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.label ?? "Dashboard";
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    fetchNotifications()
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, []);

  const handleOpenNotifications = () => {
    setIsNotifOpen((prev) => !prev);
    if (!isNotifOpen && unreadCount > 0) {
      markAllNotificationsRead()
        .then(() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))))
        .catch(() => {});
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-card-border bg-background/80 px-4 backdrop-blur-md md:px-6">
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
          className="hidden items-center gap-2 rounded-xl border border-card-border bg-card px-3 py-2 text-sm text-text-secondary hover:border-text-muted sm:flex"
        >
          <Wallet className="h-4 w-4" />
          {selectedAccount ? selectedAccount.name : "Select account"}
        </button>

        <div ref={notifRef} className="relative">
          <button
            onClick={handleOpenNotifications}
            className="relative text-text-secondary hover:text-text-primary"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {isNotifOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-3 w-80 rounded-2xl border border-card-border bg-card p-2 shadow-card"
              >
                <p className="px-3 py-2 text-sm font-semibold text-text-primary">Notifications</p>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-text-muted">No notifications yet.</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="rounded-xl px-3 py-2 hover:bg-background-elevated">
                        <p className="text-sm font-medium text-text-primary">{n.title}</p>
                        <p className="text-xs text-text-muted">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
                className="absolute right-0 mt-3 w-52 rounded-2xl border border-card-border bg-card p-2 shadow-card"
              >
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    router.push("/profile");
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-text-secondary hover:bg-background-elevated hover:text-text-primary"
                >
                  <UserIcon className="h-4 w-4" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onLogoutClick();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-text-secondary hover:bg-background-elevated hover:text-danger"
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
