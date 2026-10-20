"use client";

import { HTMLAttributes } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function Card({ hoverable = false, className, children, ...props }: CardProps) {
  const hasCustomPadding = className && /\bp(-[xytrbl])?-(?:\[.+?\]|\d+(?:\.\d+)?)/.test(className);

  return (
    <motion.div
      whileHover={hoverable ? { y: -2 } : undefined}
      transition={{ duration: 0.15 }}
      className={clsx(
        "glass rounded-2xl shadow-card",
        !hasCustomPadding && "p-6",
        hoverable && "hover:shadow-glow-blue transition-shadow",
        className
      )}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  );
}
