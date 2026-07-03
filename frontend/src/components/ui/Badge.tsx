import clsx from "clsx";
import { TradeStatus } from "@/types";

const TRADE_STATUS_STYLES: Record<TradeStatus, string> = {
  OPEN: "bg-primary-muted text-primary border-primary/30",
  CLOSED: "bg-white/[0.04] text-text-secondary border-white/10",
};

const TRADE_STATUS_LABELS: Record<TradeStatus, string> = {
  OPEN: "Open",
  CLOSED: "Closed",
};

export function TradeStatusBadge({ status }: { status: TradeStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        TRADE_STATUS_STYLES[status]
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", status === "OPEN" ? "bg-primary animate-pulse" : "bg-current")} />
      {TRADE_STATUS_LABELS[status]}
    </span>
  );
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium text-text-secondary",
        className
      )}
    >
      {children}
    </span>
  );
}

export function GoldBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border border-gold/30 bg-gold-muted/40 px-2.5 py-0.5 text-xs font-medium text-gold",
        className
      )}
    >
      {children}
    </span>
  );
}
