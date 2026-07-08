"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import clsx from "clsx";
import { TrendingUp, LogOut, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { NAV_ITEMS } from "./navItems";
import { useAuth } from "@/context/AuthContext";

export function Sidebar({ onLogoutClick }: { onLogoutClick: () => void }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const { user } = useAuth();
  const menuItems = [...NAV_ITEMS];
  if (user?.role === "ADMIN") {
    menuItems.push({ href: "/admin", label: "Admin Panel", icon: Shield });
  }

  return (
    <aside
      className={clsx(
        "relative hidden shrink-0 flex-col border-r border-white/10 bg-black transition-[width] duration-200 md:flex",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-8 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-black text-text-secondary hover:text-primary"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      <div className="flex items-center gap-2 px-6 py-6">
        <TrendingUp className="h-6 w-6 shrink-0 text-gold" />
        {!collapsed && <span className="truncate text-lg font-semibold text-text-primary">Equity Bot</span>}
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {menuItems.map((item) => {
          const isExternal = item.href.startsWith("http");
          const isActive = !isExternal && pathname.startsWith(item.href);
          const Icon = item.icon;

          const content = (
            <>
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
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && item.label}
              </div>
            </>
          );

          if (isExternal) {
            return (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block"
                title={collapsed ? item.label : undefined}
              >
                {content}
              </a>
            );
          }

          return (
            <Link key={item.href} href={item.href} className="relative block" title={collapsed ? item.label : undefined}>
              {content}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          onClick={onLogoutClick}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:text-danger"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && "Logout"}
        </button>
      </div>
    </aside>
  );
}
