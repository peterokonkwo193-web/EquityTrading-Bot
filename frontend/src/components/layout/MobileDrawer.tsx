"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { TrendingUp as LogoIcon, LogOut, X, Shield } from "lucide-react";
import { NAV_ITEMS } from "./navItems";
import { useAuth } from "@/context/AuthContext";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLogoutClick: () => void;
}

export function MobileDrawer({ isOpen, onClose, onLogoutClick }: MobileDrawerProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  
  const menuItems = [...NAV_ITEMS];
  if (user?.role === "ADMIN") {
    menuItems.push({ href: "/admin", label: "Admin Panel", icon: Shield });
  }

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
            className="flex h-full w-64 flex-col border-r border-white/10 bg-black"
          >
            <div className="flex items-center justify-between px-6 py-6">
              <div className="flex items-center gap-2">
                <LogoIcon className="h-6 w-6 text-gold" />
                <span className="text-lg font-semibold text-text-primary">Equity Bot</span>
              </div>
              <button onClick={onClose} aria-label="Close menu" className="text-text-muted hover:text-text-primary">
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 px-3">
              {menuItems.map((item) => {
                const isExternal = item.href.startsWith("http");
                const isActive = !isExternal && pathname.startsWith(item.href);
                const Icon = item.icon;

                const classes = clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium transition-colors",
                  isActive ? "bg-primary-muted/40 text-primary" : "text-text-secondary hover:text-text-primary"
                );

                if (isExternal) {
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onClose}
                      className={classes}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={classes}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-white/10 p-3">
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
