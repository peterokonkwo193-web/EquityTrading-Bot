import { LucideIcon } from "lucide-react";
import clsx from "clsx";
import { Card } from "@/components/ui/Card";

interface SummaryCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: "primary" | "danger" | "warning" | "neutral";
}

const ACCENT_CLASSES = {
  primary: "text-primary bg-primary-muted",
  danger: "text-danger bg-danger-muted",
  warning: "text-warning bg-warning-muted",
  neutral: "text-text-secondary bg-background-elevated",
};

export function SummaryCard({ icon: Icon, label, value, accent = "neutral" }: SummaryCardProps) {
  return (
    <Card hoverable className="flex items-center gap-4">
      <div className={clsx("flex h-11 w-11 items-center justify-center rounded-xl", ACCENT_CLASSES[accent])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-text-secondary">{label}</p>
        <p className="text-lg font-semibold text-text-primary">{value}</p>
      </div>
    </Card>
  );
}
