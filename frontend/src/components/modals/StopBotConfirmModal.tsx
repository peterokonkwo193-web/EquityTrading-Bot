"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface StopBotConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function StopBotConfirmModal({ isOpen, onClose, onConfirm, isLoading }: StopBotConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Stop trading bot">
      <p className="mb-6 text-sm text-text-secondary">
        Stop the trading bot? This will halt all active trades on this account.
      </p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>
          Stop bot
        </Button>
      </div>
    </Modal>
  );
}
