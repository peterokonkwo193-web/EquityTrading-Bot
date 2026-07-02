"use client";

import { HTMLAttributes } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function Card({ hoverable = false, className, children, ...props }: CardProps) {
  return (
    <motion.div
      whileHover={hoverable ? { y: -2 } : undefined}
      transition={{ duration: 0.15 }}
      className={clsx(
        "rounded-2xl border border-card-border bg-card p-6 shadow-card",
        hoverable && "hover:shadow-glow",
        className
      )}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  );
}
