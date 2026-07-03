import { useCallback, useState } from "react";
import { StatusKind, StatusMessage } from "@/components/status/StatusBanner";

export function useStatus() {
  const [status, setStatus] = useState<StatusMessage | null>(null);

  const show = useCallback((kind: StatusKind, message: string) => {
    setStatus({ kind, message });
  }, []);

  const clear = useCallback(() => setStatus(null), []);

  return {
    status,
    success: useCallback((message: string) => show("success", message), [show]),
    error: useCallback((message: string) => show("error", message), [show]),
    info: useCallback((message: string) => show("info", message), [show]),
    clear,
  };
}
