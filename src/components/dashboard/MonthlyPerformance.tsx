import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trade } from "@/types/trading";
import { calculateMonthlyStats, MonthlyData } from "@/lib/monthly-stats";
import { formatPnl, formatCurrency } from "@/lib/mock-data";

function MiniSparkline({ data, width = 80, height = 20 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  const finalValue = data[data.length - 1];
  const color = finalValue >= 0 ? "hsl(145 65% 48%)" : "hsl(0 72% 55%)";

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface MonthlyPerformanceProps {
  trades: Trade[];
}

export function MonthlyPerformance({ trades }: MonthlyPerformanceProps) {
  const months = useMemo(() => calculateMonthlyStats(trades), [trades]);

  if (months.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-trading">
        <h3 className="text-sm font-semibold text-foreground mb-2">Monthly Performance</h3>
        <p className="text-xs text-muted-foreground">No data available</p>
      </motion.div>
    );
  }

  const totals = months.reduce(
    (acc, m) => ({
      pnl: acc.pnl + m.pnl,
      trades: acc.trades + m.tradeCount,
      fees: acc.fees + m.fees,
    }),
    { pnl: 0, trades: 0, fees: 0 }
  );
  const avgWinRate = months.reduce((s, m) => s + m.winRate, 0) / months.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="card-trading"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Performance</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b border-border/50">
              <th className="text-left py-1.5 pr-2 font-medium">Month</th>
              <th className="text-right py-1.5 px-2 font-medium">PnL</th>
              <th className="text-right py-1.5 px-2 font-medium">Trades</th>
              <th className="text-right py-1.5 px-2 font-medium">Win Rate</th>
              <th className="text-right py-1.5 px-2 font-medium">Best Day</th>
              <th className="text-right py-1.5 px-2 font-medium">Worst Day</th>
              <th className="text-right py-1.5 px-2 font-medium">Fees</th>
              <th className="text-center py-1.5 pl-2 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m: MonthlyData) => (
              <tr
                key={m.month}
                className={`border-b border-border/30 ${m.pnl >= 0 ? "bg-profit/[0.02]" : "bg-loss/[0.02]"}`}
              >
                <td className="py-2 pr-2 font-medium text-foreground">{m.label}</td>
                <td className={`text-right py-2 px-2 font-mono font-semibold ${m.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                  {formatPnl(m.pnl)}
                </td>
                <td className="text-right py-2 px-2 text-muted-foreground">{m.tradeCount}</td>
                <td className={`text-right py-2 px-2 font-mono ${m.winRate >= 50 ? "text-profit" : "text-loss"}`}>
                  {m.winRate.toFixed(0)}%
                </td>
                <td className="text-right py-2 px-2 font-mono text-profit">
                  {formatPnl(m.bestDay)}
                </td>
                <td className="text-right py-2 px-2 font-mono text-loss">
                  {formatPnl(m.worstDay)}
                </td>
                <td className="text-right py-2 px-2 font-mono text-muted-foreground">
                  ${formatCurrency(m.fees)}
                </td>
                <td className="text-center py-2 pl-2">
                  <MiniSparkline data={m.dailyPnls} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-semibold">
              <td className="py-2 pr-2 text-foreground">Total / Avg</td>
              <td className={`text-right py-2 px-2 font-mono ${totals.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                {formatPnl(totals.pnl)}
              </td>
              <td className="text-right py-2 px-2 text-muted-foreground">{totals.trades}</td>
              <td className={`text-right py-2 px-2 font-mono ${avgWinRate >= 50 ? "text-profit" : "text-loss"}`}>
                {avgWinRate.toFixed(0)}%
              </td>
              <td colSpan={2} />
              <td className="text-right py-2 px-2 font-mono text-muted-foreground">
                ${formatCurrency(totals.fees)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </motion.div>
  );
}
