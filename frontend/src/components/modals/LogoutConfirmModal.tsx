"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

export function LogoutConfirmModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleConfirm = async () => {
    setIsLoggingOut(true);
    await logout();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log out">
      <p className="mb-6 text-sm text-text-secondary">
        Are you sure you want to log out of your account?
      </p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={isLoggingOut}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleConfirm} isLoading={isLoggingOut}>
          Log out
        </Button>
      </div>
    </Modal>
  );
}
