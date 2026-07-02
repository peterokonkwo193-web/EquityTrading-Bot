"use client";

import { useState } from "react";
import { Wallet, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AccountSelectionModal } from "@/components/modals/AccountSelectionModal";
import { useAccount } from "@/context/AccountContext";

export function AccountOverview() {
  const { selectedAccount, accounts } = useAccount();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!selectedAccount) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">No trading accounts found.</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-muted text-primary">
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium text-text-primary">{selectedAccount.name}</p>
          <p className="text-sm text-text-muted">{selectedAccount.accountNumber}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm text-text-secondary">Balance</p>
          <p className="text-lg font-semibold text-text-primary">
            ${Number(selectedAccount.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <Badge>{selectedAccount.status}</Badge>
        {accounts.length > 1 && (
          <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
            Switch <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      <AccountSelectionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </Card>
  );
}
