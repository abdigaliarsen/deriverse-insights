import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ComposedChart,
  Bar,
} from "recharts";
import { DailyPnl } from "@/types/trading";
import { useState } from "react";

interface PnlChartProps {
  data: DailyPnl[];
}

export function PnlChart({ data }: PnlChartProps) {
  const [view, setView] = useState<"cumulative" | "daily" | "drawdown">("cumulative");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="card-trading"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">PnL Performance</h3>
        <div className="flex gap-1">
          {(["cumulative", "daily", "drawdown"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors font-medium ${
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          {view === "daily" ? (
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 15%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }} tickFormatter={(v) => v.slice(5)} />
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
              <ReferenceLine y={0} stroke="hsl(215 15% 55%)" strokeDasharray="3 3" />
              <Bar
                dataKey="pnl"
                fill="hsl(175 80% 50%)"
                radius={[2, 2, 0, 0]}
              />
            </ComposedChart>
          ) : (
            <AreaChart data={data}>
              <defs>
                <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(175 80% 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(175 80% 50%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0 72% 55%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(0 72% 55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 15%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }} tickFormatter={(v) => v.slice(5)} />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }}
                tickFormatter={(v) => view === "drawdown" ? `${v.toFixed(0)}%` : `$${v}`}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(220 18% 10%)",
                  border: "1px solid hsl(220 14% 18%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [
                  view === "drawdown" ? `${value.toFixed(2)}%` : `$${value.toFixed(2)}`,
                  view === "drawdown" ? "Drawdown" : "Cumulative PnL",
                ]}
              />
              <ReferenceLine y={0} stroke="hsl(215 15% 55%)" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey={view === "drawdown" ? "drawdown" : "cumPnl"}
                stroke={view === "drawdown" ? "hsl(0 72% 55%)" : "hsl(175 80% 50%)"}
                fill={view === "drawdown" ? "url(#ddGrad)" : "url(#pnlGrad)"}
                strokeWidth={2}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
