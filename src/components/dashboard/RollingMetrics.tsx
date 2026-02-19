import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trade } from "@/types/trading";
import { calculateRollingMetrics, RollingDataPoint } from "@/lib/rolling-metrics";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from "recharts";

type MetricKey = "sharpe" | "winRate" | "avgPnl" | "profitFactor";

const metricConfig: Record<MetricKey, { label: string; key7d: keyof RollingDataPoint; key30d: keyof RollingDataPoint; format: (v: number) => string }> = {
  sharpe: { label: "Sharpe Ratio", key7d: "sharpe7d", key30d: "sharpe30d", format: (v) => v.toFixed(2) },
  winRate: { label: "Win Rate %", key7d: "winRate7d", key30d: "winRate30d", format: (v) => `${v.toFixed(1)}%` },
  avgPnl: { label: "Avg PnL", key7d: "avgPnl7d", key30d: "avgPnl30d", format: (v) => `$${v.toFixed(0)}` },
  profitFactor: { label: "Profit Factor", key7d: "profitFactor7d", key30d: "profitFactor30d", format: (v) => v.toFixed(2) },
};

interface RollingMetricsProps {
  trades: Trade[];
}

export function RollingMetrics({ trades }: RollingMetricsProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("sharpe");
  const data = useMemo(() => calculateRollingMetrics(trades), [trades]);

  if (data.length < 3) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-trading">
        <h3 className="text-sm font-semibold text-foreground mb-2">Rolling Metrics</h3>
        <p className="text-xs text-muted-foreground">Not enough data for rolling analysis</p>
      </motion.div>
    );
  }

  const config = metricConfig[selectedMetric];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="card-trading"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Rolling Metrics</h3>
        <div className="flex gap-1">
          {(Object.keys(metricConfig) as MetricKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSelectedMetric(key)}
              className={`px-2 py-1 text-[10px] rounded-md transition-colors ${
                selectedMetric === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {metricConfig[key].label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }}
              tickFormatter={(d: string) => d.slice(5)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }}
              tickFormatter={config.format}
              width={55}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(220 18% 10%)",
                border: "1px solid hsl(220 14% 18%)",
                borderRadius: "8px",
                fontSize: "11px",
              }}
              formatter={(v: number, name: string) => [config.format(v), name]}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line
              type="monotone"
              dataKey={config.key7d}
              name="7-Day"
              stroke="hsl(145 65% 48%)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey={config.key30d}
              name="30-Day"
              stroke="hsl(215 70% 60%)"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-muted-foreground mt-2">
        Shows 7-day (solid) vs 30-day (dashed) rolling {config.label.toLowerCase()} — trend shows if you're improving
      </p>
    </motion.div>
  );
}
