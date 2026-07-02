"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Bot as LogoIcon, LogOut, X } from "lucide-react";
import { NAV_ITEMS } from "./navItems";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLogoutClick: () => void;
}

export function MobileDrawer({ isOpen, onClose, onLogoutClick }: MobileDrawerProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onClose}
        >
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-64 flex-col border-r border-card-border bg-background-elevated"
          >
            <div className="flex items-center justify-between px-6 py-6">
              <div className="flex items-center gap-2">
                <LogoIcon className="h-6 w-6 text-primary" />
                <span className="text-lg font-semibold text-text-primary">TradeBot</span>
              </div>
              <button onClick={onClose} aria-label="Close menu" className="text-text-muted hover:text-text-primary">
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 px-3">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={clsx(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium transition-colors",
                      isActive ? "bg-primary-muted/40 text-primary" : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-card-border p-3">
              <button
                onClick={() => {
                  onClose();
                  onLogoutClick();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-base font-medium text-text-secondary hover:text-danger"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
