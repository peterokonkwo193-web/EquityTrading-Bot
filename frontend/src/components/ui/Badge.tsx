import clsx from "clsx";
import { BotStatus } from "@/types";

const STATUS_STYLES: Record<BotStatus, string> = {
  RUNNING: "bg-primary-muted text-primary border-primary/30",
  PAUSED: "bg-warning-muted text-warning border-warning/30",
  STOPPED: "bg-background-elevated text-text-secondary border-card-border",
  ERROR: "bg-danger-muted text-danger border-danger/30",
};

const STATUS_LABELS: Record<BotStatus, string> = {
  RUNNING: "Running",
  PAUSED: "Paused",
  STOPPED: "Stopped",
  ERROR: "Error",
};

export function StatusBadge({ status }: { status: BotStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        STATUS_STYLES[status]
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", status === "RUNNING" ? "bg-primary animate-pulse" : "bg-current")} />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border border-card-border bg-background-elevated px-2.5 py-0.5 text-xs font-medium text-text-secondary",
        className
      )}
    >
      {children}
    </span>
  );
}
