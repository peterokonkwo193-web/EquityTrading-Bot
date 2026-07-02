import Link from "next/link";
import { Bot, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Card } from "@/components/ui/Card";

const ACTIONS = [
  { href: "/bot", label: "Manage bot", icon: Bot },
  { href: "/deposit", label: "Deposit funds", icon: ArrowDownToLine },
  { href: "/withdraw", label: "Withdraw funds", icon: ArrowUpFromLine },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <Link key={action.href} href={action.href}>
            <Card hoverable className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-muted text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <span className="font-medium text-text-primary">{action.label}</span>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
