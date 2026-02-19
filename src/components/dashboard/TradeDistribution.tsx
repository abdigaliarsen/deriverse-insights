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
    </motion.div>
  );
}
