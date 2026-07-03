"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export interface BarPerformancePoint {
  label: string;
  value: number;
}

export function BarPerformanceChart({ data, height = 240 }: { data: BarPerformancePoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="label"
          stroke="rgba(255,255,255,0.3)"
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="rgba(255,255,255,0.3)"
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(v: number) => `$${v.toLocaleString()}`}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          contentStyle={{
            background: "rgba(10,10,10,0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            color: "#f9fafb",
            fontSize: 13,
          }}
          formatter={(value) => [`$${Number(value).toLocaleString()}`, "P&L"]}
        />
        <Bar dataKey="value" radius={[4, 4, 4, 4]} maxBarSize={36}>
          {data.map((point, i) => (
            <Cell key={i} fill={point.value >= 0 ? "#d4af37" : "#ef4444"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
