"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AccountProvider } from "@/context/AccountContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { PageTransition } from "@/components/layout/PageTransition";
import { FullPageLoader } from "@/components/layout/FullPageLoader";
import { LogoutConfirmModal } from "@/components/modals/LogoutConfirmModal";
import { AccountSelectionModal } from "@/components/modals/AccountSelectionModal";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <FullPageLoader />;
  }

  return (
    <AccountProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar onLogoutClick={() => setIsLogoutModalOpen(true)} />
        <MobileDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onLogoutClick={() => setIsLogoutModalOpen(true)}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar
            onMenuClick={() => setIsDrawerOpen(true)}
            onLogoutClick={() => setIsLogoutModalOpen(true)}
            onAccountSwitchClick={() => setIsAccountModalOpen(true)}
          />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>

      <LogoutConfirmModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} />
      <AccountSelectionModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} />
    </AccountProvider>
  );
}
