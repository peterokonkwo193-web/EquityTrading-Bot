"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import clsx from "clsx";

export type StatusKind = "success" | "error" | "info";

export interface StatusMessage {
  kind: StatusKind;
  message: string;
}

const KIND_STYLES: Record<StatusKind, { icon: typeof CheckCircle2; classes: string }> = {
  success: { icon: CheckCircle2, classes: "border-gold/30 bg-gold-muted/30 text-gold" },
  error: { icon: XCircle, classes: "border-danger/30 bg-danger-muted/40 text-danger" },
  info: { icon: Info, classes: "border-primary/30 bg-primary-muted/30 text-primary" },
};

interface StatusBannerProps {
  status: StatusMessage | null;
  className?: string;
}

export function StatusBanner({ status, className }: StatusBannerProps) {
  return (
    <AnimatePresence>
      {status && (
        <motion.div
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div
            className={clsx(
              "flex items-center gap-2 rounded-xl border p-3 text-sm",
              KIND_STYLES[status.kind].classes,
              className
            )}
          >
            {(() => {
              const Icon = KIND_STYLES[status.kind].icon;
              return <Icon className="h-4 w-4 shrink-0" />;
            })()}
            {status.message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
