"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatRupiah, formatShortRupiah } from "@/lib/utils/format";
import type { SalesPoint } from "@/lib/queries/dashboard";

// Matches --chart-1 / --primary in globals.css
const PINK = "#EC4899";

interface SalesChartProps {
  data: SalesPoint[];
}

export function SalesChart({ data }: SalesChartProps) {
  const hasData = data.some((point) => point.value > 0);

  if (!hasData) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
        Belum ada penjualan pada periode ini.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PINK} stopOpacity={0.25} />
              <stop offset="100%" stopColor={PINK} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#F7DCEC" vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#71717A" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={12}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#71717A" }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(value: number) => formatShortRupiah(value)}
          />

          <Tooltip
            cursor={{ stroke: PINK, strokeOpacity: 0.3 }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #F7DCEC",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              fontSize: 12,
            }}
            formatter={(value) => [formatRupiah(Number(value)), "Penjualan"]}
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke={PINK}
            strokeWidth={2}
            fill="url(#salesFill)"
            dot={false}
            activeDot={{ r: 4, fill: PINK, stroke: "#fff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
