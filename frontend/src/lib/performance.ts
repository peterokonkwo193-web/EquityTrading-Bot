import { SimulatedTrade } from "@/types";
import { BarPerformancePoint } from "@/components/charts/BarPerformanceChart";

export type PerformanceGrouping = "daily" | "weekly" | "monthly";

function bucketKey(date: Date, grouping: PerformanceGrouping): string {
  if (grouping === "daily") {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  if (grouping === "weekly") {
    const firstDayOfWeek = new Date(date);
    firstDayOfWeek.setDate(date.getDate() - date.getDay());
    return `Wk of ${firstDayOfWeek.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }
  return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

export function buildPerformanceBuckets(trades: SimulatedTrade[], grouping: PerformanceGrouping): BarPerformancePoint[] {
  const closed = trades.filter((t) => t.status === "CLOSED" && t.closedAt);
  const buckets = new Map<string, number>();

  for (const trade of closed) {
    const key = bucketKey(new Date(trade.closedAt!), grouping);
    buckets.set(key, (buckets.get(key) ?? 0) + Number(trade.profitLoss));
  }

  return Array.from(buckets.entries()).map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }));
}
