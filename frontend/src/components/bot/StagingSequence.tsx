"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

const STAGES = ["Initializing...", "Scanning Market...", "Finding Opportunity...", "Executing Simulated Trade..."];
const STAGE_DURATION_MS = 700;

export function StagingSequence({ onComplete }: { onComplete: () => void }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= STAGES.length - 1) {
      const timeout = setTimeout(onComplete, STAGE_DURATION_MS);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(() => setIndex((i) => i + 1), STAGE_DURATION_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return (
    <div className="flex flex-col items-center gap-4 py-10">
      <Loader2 className="h-8 w-8 animate-spin text-gold" />
      <AnimatePresence mode="wait">
        <motion.p
          key={STAGES[index]}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="text-sm font-medium text-text-secondary"
        >
          {STAGES[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
