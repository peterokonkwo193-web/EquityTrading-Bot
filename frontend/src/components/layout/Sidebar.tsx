"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import clsx from "clsx";
import { Bot as LogoIcon, LogOut } from "lucide-react";
import { NAV_ITEMS } from "./navItems";

export function Sidebar({ onLogoutClick }: { onLogoutClick: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-card-border bg-background-elevated md:flex">
      <div className="flex items-center gap-2 px-6 py-6">
        <LogoIcon className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold text-text-primary">TradeBot</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="relative">
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-primary-muted/40"
                  transition={{ duration: 0.2 }}
                />
              )}
              <div
                className={clsx(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "text-primary" : "text-text-secondary hover:text-text-primary"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-card-border p-3">
        <button
          onClick={onLogoutClick}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:text-danger"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
