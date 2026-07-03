import { LucideIcon } from "lucide-react";
import clsx from "clsx";
import { Card } from "@/components/ui/Card";

interface SummaryCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: "blue" | "gold" | "danger" | "neutral";
}

const ACCENT_CLASSES = {
  blue: "text-primary bg-primary-muted",
  gold: "text-gold bg-gold-muted",
  danger: "text-danger bg-danger-muted",
  neutral: "text-text-secondary bg-white/[0.04]",
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
