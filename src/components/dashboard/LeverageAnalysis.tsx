import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trade } from "@/types/trading";
import { calculateLeverageAnalysis } from "@/lib/analytics";
import { formatPnl } from "@/lib/mock-data";
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

interface LeverageAnalysisProps {
  trades: Trade[];
}

export function LeverageAnalysis({ trades }: LeverageAnalysisProps) {
  const data = useMemo(() => calculateLeverageAnalysis(trades), [trades]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="card-trading"
    >
      <h3 className="text-sm font-semibold text-foreground mb-1">Leverage Analysis</h3>
      <p className="stat-label mb-3">Performance by leverage level</p>

      <div className="h-[160px] mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 15%)" />
            <XAxis dataKey="leverage" tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{
                background: "hsl(220 18% 10%)",
                border: "1px solid hsl(220 14% 18%)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, "PnL"]}
            />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.pnl >= 0 ? "hsl(145 65% 48%)" : "hsl(0 72% 55%)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-1.5">
        {data.map((b) => (
          <div key={b.leverage} className="flex items-center justify-between text-xs">
            <span className="font-mono text-foreground font-medium w-8">{b.leverage}</span>
            <span className="text-muted-foreground">{b.trades} trades</span>
            <span className="text-muted-foreground">{b.winRate.toFixed(0)}% win</span>
            <span className={`font-mono font-medium ${b.pnl >= 0 ? "text-profit" : "text-loss"}`}>
              {formatPnl(b.pnl)}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
