import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { BotActivity } from "@/types";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function ActivityFeed({ activity, isLoading }: { activity: BotActivity[]; isLoading: boolean }) {
  return (
    <Card>
      <h3 className="mb-4 text-sm font-semibold text-text-secondary">Recent activity</h3>
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : activity.length === 0 ? (
        <p className="text-sm text-text-muted">No activity yet. Start the bot to see live trades here.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-card-border">
          {activity.map((item) => {
            const delta = Number(item.pnlDelta);
            return (
              <li key={item.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="text-text-primary">{item.message}</p>
                  <p className="text-xs text-text-muted">{formatTime(item.createdAt)}</p>
                </div>
                <span className={delta >= 0 ? "text-primary" : "text-danger"}>
                  {delta >= 0 ? "+" : ""}
                  {delta.toFixed(2)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
