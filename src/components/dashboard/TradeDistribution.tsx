import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trade } from "@/types/trading";
import { calculatePnlDistribution } from "@/lib/analytics";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

interface TradeDistributionProps {
  trades: Trade[];
}

export function TradeDistribution({ trades }: TradeDistributionProps) {
  const buckets = useMemo(() => calculatePnlDistribution(trades, 20), [trades]);

  const distStats = useMemo(() => {
    if (trades.length === 0) return null;
    const pnls = trades.map((t) => t.pnl).sort((a, b) => a - b);
    const n = pnls.length;

    // Median
    const median = n % 2 === 0 ? (pnls[n / 2 - 1] + pnls[n / 2]) / 2 : pnls[Math.floor(n / 2)];

    // Std Dev
    const mean = pnls.reduce((s, v) => s + v, 0) / n;
    const variance = pnls.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);

    // Skewness
    const skewness = n >= 3
      ? (pnls.reduce((s, v) => s + ((v - mean) / stdDev) ** 3, 0) * n) / ((n - 1) * (n - 2))
      : 0;

    // Percentiles
    const p10 = pnls[Math.floor(n * 0.1)];
    const p90 = pnls[Math.floor(n * 0.9)];

    return { median, stdDev, skewness: isFinite(skewness) ? skewness : 0, p10, p90 };
  }, [trades]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="card-trading"
    >
      <h3 className="text-sm font-semibold text-foreground mb-1">PnL Distribution</h3>
      <p className="stat-label mb-3">Histogram of trade returns</p>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={buckets}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 15%)" />
            <XAxis
              dataKey="range"
              tick={{ fontSize: 9, fill: "hsl(215 15% 55%)" }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }} />
            <Tooltip
              contentStyle={{
                background: "hsl(220 18% 10%)",
                border: "1px solid hsl(220 14% 18%)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [value, "Trades"]}
              labelFormatter={(label: string) => `PnL: ${label}`}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {buckets.map((bucket, i) => (
                <Cell
                  key={i}
                  fill={bucket.from >= 0 ? "hsl(145 65% 48%)" : "hsl(0 72% 55%)"}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {distStats && (
        <div className="mt-4 pt-3 border-t border-border/50">
          <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Distribution Stats</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/20 rounded-md p-2">
              <span className="text-[10px] text-muted-foreground block">Median PnL</span>
              <span className={`text-sm font-mono font-semibold ${distStats.median >= 0 ? "text-profit" : "text-loss"}`}>
                ${distStats.median.toFixed(2)}
              </span>
            </div>
            <div className="bg-secondary/20 rounded-md p-2">
              <span className="text-[10px] text-muted-foreground block">Std Dev</span>
              <span className="text-sm font-mono font-semibold text-foreground">${distStats.stdDev.toFixed(2)}</span>
            </div>
            <div className="bg-secondary/20 rounded-md p-2">
              <span className="text-[10px] text-muted-foreground block">Skewness</span>
              <span className={`text-sm font-mono font-semibold ${distStats.skewness > 0 ? "text-profit" : distStats.skewness < 0 ? "text-loss" : "text-foreground"}`}>
                {distStats.skewness > 0 ? "+" : ""}{distStats.skewness.toFixed(3)}
              </span>
            </div>
            <div className="bg-secondary/20 rounded-md p-2">
              <span className="text-[10px] text-muted-foreground block">P10 / P90</span>
              <span className="text-sm font-mono font-semibold text-foreground">
                ${distStats.p10.toFixed(0)} / ${distStats.p90.toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
