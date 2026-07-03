"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export interface LineAreaChartPoint {
  label: string;
  value: number;
}

interface LineAreaChartProps {
  data: LineAreaChartPoint[];
  color?: "blue" | "gold";
  height?: number;
  valuePrefix?: string;
}

const COLOR_HEX: Record<"blue" | "gold", string> = {
  blue: "#3b82f6",
  gold: "#d4af37",
};

export function LineAreaChart({ data, color = "blue", height = 240, valuePrefix = "$" }: LineAreaChartProps) {
  const hex = COLOR_HEX[color];
  const gradientId = `line-area-gradient-${color}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={hex} stopOpacity={0.35} />
            <stop offset="100%" stopColor={hex} stopOpacity={0} />
          </linearGradient>
        </defs>
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
          tickFormatter={(v: number) => `${valuePrefix}${v.toLocaleString()}`}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(10,10,10,0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            color: "#f9fafb",
            fontSize: 13,
          }}
          formatter={(value) => [`${valuePrefix}${Number(value).toLocaleString()}`, "Value"]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={hex}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 0, fill: hex }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
