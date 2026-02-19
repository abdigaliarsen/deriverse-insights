import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trade } from "@/types/trading";
import { runMonteCarloSimulation, MonteCarloResult } from "@/lib/monte-carlo";
import { formatCurrency } from "@/lib/mock-data";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { Dice5, TrendingUp, TrendingDown } from "lucide-react";

interface MonteCarloChartProps {
  trades: Trade[];
}

export function MonteCarloChart({ trades }: MonteCarloChartProps) {
  const result: MonteCarloResult = useMemo(() => runMonteCarloSimulation(trades), [trades]);

  if (result.paths.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-trading">
        <h3 className="text-sm font-semibold text-foreground mb-2">Monte Carlo Simulation</h3>
        <p className="text-xs text-muted-foreground">Not enough data for simulation</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="card-trading"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Dice5 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Monte Carlo Simulation</h3>
        </div>
        <span className="text-[10px] text-muted-foreground">200 simulations × 60 days</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-secondary/30 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground">Median Final</p>
          <p className="text-xs font-mono font-semibold text-foreground">
            ${formatCurrency(result.medianFinal)}
          </p>
        </div>
        <div className="bg-secondary/30 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground">Avg Final</p>
          <p className="text-xs font-mono font-semibold text-foreground">
            ${formatCurrency(result.avgFinal)}
          </p>
        </div>
        <div className="bg-secondary/30 rounded-lg p-2 text-center">
          <TrendingUp className="h-3 w-3 text-profit mx-auto mb-0.5" />
          <p className="text-[10px] text-muted-foreground">P(2x)</p>
          <p className="text-xs font-mono font-semibold text-profit">
            {result.probDouble.toFixed(1)}%
          </p>
        </div>
        <div className="bg-secondary/30 rounded-lg p-2 text-center">
          <TrendingDown className="h-3 w-3 text-loss mx-auto mb-0.5" />
          <p className="text-[10px] text-muted-foreground">P(50% DD)</p>
          <p className="text-xs font-mono font-semibold text-loss">
            {result.probHalfDrawdown.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Fan chart */}
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={result.paths}>
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }}
              label={{ value: "Days", position: "bottom", offset: -5, fontSize: 10, fill: "hsl(215 15% 55%)" }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }}
              tickFormatter={(v: number) => `$${formatCurrency(v)}`}
              width={60}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(220 18% 10%)",
                border: "1px solid hsl(220 14% 18%)",
                borderRadius: "8px",
                fontSize: "11px",
              }}
              formatter={(v: number, name: string) => [`$${formatCurrency(v)}`, name]}
            />
            <Area
              type="monotone"
              dataKey="p95"
              stackId="fan"
              stroke="none"
              fill="hsl(145 65% 48%)"
              fillOpacity={0.08}
              name="P95"
            />
            <Area
              type="monotone"
              dataKey="p75"
              stackId="fan2"
              stroke="none"
              fill="hsl(145 65% 48%)"
              fillOpacity={0.12}
              name="P75"
            />
            <Area
              type="monotone"
              dataKey="p50"
              stroke="hsl(145 65% 48%)"
              strokeWidth={2}
              fill="hsl(145 65% 48%)"
              fillOpacity={0.05}
              name="Median"
            />
            <Area
              type="monotone"
              dataKey="p25"
              stroke="none"
              fill="hsl(0 72% 55%)"
              fillOpacity={0.08}
              name="P25"
            />
            <Area
              type="monotone"
              dataKey="p5"
              stroke="hsl(0 72% 55%)"
              strokeWidth={1}
              strokeDasharray="4 2"
              fill="hsl(0 72% 55%)"
              fillOpacity={0.05}
              name="P5"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-6 h-0.5 bg-profit inline-block" /> Median (P50)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-profit/15 inline-block rounded" /> P25-P75
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-profit/8 inline-block rounded" /> P5-P95
        </span>
      </div>
    </motion.div>
  );
}
