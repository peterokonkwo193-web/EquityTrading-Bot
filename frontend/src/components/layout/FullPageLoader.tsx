import { Bot } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

export function FullPageLoader() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
      <Bot className="h-10 w-10 text-primary" />
      <Spinner className="h-6 w-6 text-text-secondary" />
    </div>
  );
}
