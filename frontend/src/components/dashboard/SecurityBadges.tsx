import { ShieldCheck, Lock, Wallet, BadgeCheck } from "lucide-react";

const BADGES = [
  { icon: Lock, label: "SSL Secured" },
  { icon: ShieldCheck, label: "Encrypted Transactions" },
  { icon: Wallet, label: "Protected Wallet" },
  { icon: BadgeCheck, label: "Verified Platform" },
];

export function SecurityBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-4">
      {BADGES.map((badge) => {
        const Icon = badge.icon;
        return (
          <div key={badge.label} className="flex items-center gap-2 text-sm text-text-muted">
            <Icon className="h-4 w-4 text-gold" />
            {badge.label}
          </div>
        );
      })}
    </div>
  );
}
