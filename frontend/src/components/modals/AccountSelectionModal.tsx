"use client";

import clsx from "clsx";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { useAccount } from "@/context/AccountContext";

export function AccountSelectionModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { accounts, selectedAccount, selectAccount } = useAccount();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select trading account">
      <div className="flex flex-col gap-3">
        {accounts.map((account) => {
          const isSelected = account.id === selectedAccount?.id;
          return (
            <button
              key={account.id}
              onClick={() => {
                selectAccount(account.id);
                onClose();
              }}
              className={clsx(
                "flex items-center justify-between rounded-xl border p-4 text-left transition-colors",
                isSelected ? "border-primary bg-primary-muted/30" : "border-card-border bg-background-elevated hover:border-text-muted"
              )}
            >
              <div>
                <p className="font-medium text-text-primary">{account.name}</p>
                <p className="text-sm text-text-muted">{account.accountNumber}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge>{account.status}</Badge>
                <p className="text-sm text-text-secondary">
                  ${Number(account.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
