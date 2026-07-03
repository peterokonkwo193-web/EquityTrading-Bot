"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

export function WinLossPieChart({ wins, losses, height = 220 }: { wins: number; losses: number; height?: number }) {
  const data = [
    { name: "Wins", value: wins, color: "#d4af37" },
    { name: "Losses", value: losses, color: "#ef4444" },
  ];
  const total = wins + losses;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="60%"
          outerRadius="85%"
          paddingAngle={total > 0 ? 3 : 0}
          strokeWidth={2}
          stroke="#000000"
          label={({ value }: { value: number }) =>
            total > 0 ? `${Math.round((value / total) * 100)}%` : ""
          }
          labelLine={false}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "rgba(10,10,10,0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            color: "#f9fafb",
            fontSize: 13,
          }}
        />
        <Legend
          verticalAlign="bottom"
          formatter={(value) => <span style={{ color: "#9ca3af", fontSize: 13 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
