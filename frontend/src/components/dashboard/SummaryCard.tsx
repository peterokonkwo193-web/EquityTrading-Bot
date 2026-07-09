import { LucideIcon } from "lucide-react";
import clsx from "clsx";
import { Card } from "@/components/ui/Card";

interface SummaryCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: "blue" | "gold" | "success" | "danger" | "neutral";
}

const ACCENT_CLASSES = {
  blue: "text-primary bg-primary-muted",
  gold: "text-gold bg-gold-muted",
  success: "text-green-400 bg-green-500/10",
  danger: "text-danger bg-danger-muted",
  neutral: "text-text-secondary bg-white/[0.04]",
};

const VALUE_CLASSES = {
  blue: "text-primary",
  gold: "text-gold",
  success: "text-green-400",
  danger: "text-rose-400",
  neutral: "text-text-primary",
};

export function SummaryCard({ icon: Icon, label, value, accent = "neutral" }: SummaryCardProps) {
  return (
    <Card hoverable className="flex items-center gap-4">
      <div className={clsx("flex h-11 w-11 items-center justify-center rounded-xl", ACCENT_CLASSES[accent])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-text-secondary">{label}</p>
        <p className={clsx("text-lg font-semibold", VALUE_CLASSES[accent])}>{value}</p>
      </div>
    </Card>
  );
}
