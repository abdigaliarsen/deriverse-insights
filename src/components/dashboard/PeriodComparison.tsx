import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trade } from "@/types/trading";
import { calculatePeriodComparison, PeriodStats } from "@/lib/analytics";
import { formatPnl } from "@/lib/mock-data";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface PeriodComparisonProps {
  trades: Trade[];
}

function ChangeIndicator({ current, previous, higherIsBetter = true }: { current: number; previous: number; higherIsBetter?: boolean }) {
  if (current === previous) return <Minus className="h-3 w-3 text-muted-foreground" />;
  const improved = higherIsBetter ? current > previous : current < previous;
  return improved
    ? <ArrowUp className="h-3 w-3 text-profit" />
    : <ArrowDown className="h-3 w-3 text-loss" />;
}

function MetricRow({ label, first, second, format, higherIsBetter = true }: {
  label: string;
  first: number;
  second: number;
  format: (v: number) => string;
  higherIsBetter?: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_80px_80px_24px] items-center gap-2 text-xs py-1.5 border-b border-border/20">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-mono text-foreground">{format(first)}</span>
      <span className="text-right font-mono text-foreground">{format(second)}</span>
      <div className="flex justify-center">
        <ChangeIndicator current={second} previous={first} higherIsBetter={higherIsBetter} />
      </div>
    </div>
  );
}

export function PeriodComparison({ trades }: PeriodComparisonProps) {
  const comparison = useMemo(() => calculatePeriodComparison(trades), [trades]);

  if (!comparison) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="card-trading"
      >
        <h3 className="text-sm font-semibold text-foreground mb-1">Period Comparison</h3>
        <p className="text-xs text-muted-foreground">Not enough trades to compare.</p>
      </motion.div>
    );
  }

  const { first, second } = comparison;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="card-trading"
    >
      <h3 className="text-sm font-semibold text-foreground mb-1">Period Comparison</h3>
      <p className="stat-label mb-3">First half vs second half</p>

      <div className="grid grid-cols-[1fr_80px_80px_24px] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground mb-1 px-0">
        <span>Metric</span>
        <span className="text-right">{first.label.split("–")[0].trim()}</span>
        <span className="text-right">{second.label.split("–")[0].trim()}</span>
        <span className="text-center">Δ</span>
      </div>

      <MetricRow label="Total PnL" first={first.totalPnl} second={second.totalPnl} format={(v) => formatPnl(v)} />
      <MetricRow label="Win Rate" first={first.winRate} second={second.winRate} format={(v) => `${v.toFixed(1)}%`} />
      <MetricRow label="Trades" first={first.tradeCount} second={second.tradeCount} format={(v) => v.toString()} />
      <MetricRow label="Avg PnL" first={first.avgPnl} second={second.avgPnl} format={(v) => formatPnl(v)} />
      <MetricRow label="Fees" first={first.totalFees} second={second.totalFees} format={(v) => `$${v.toFixed(0)}`} higherIsBetter={false} />
      <MetricRow label="Profit Factor" first={first.profitFactor} second={second.profitFactor} format={(v) => v === Infinity ? "∞" : v.toFixed(2)} />
      <MetricRow label="Max Drawdown" first={first.maxDrawdownPct} second={second.maxDrawdownPct} format={(v) => `${v.toFixed(1)}%`} higherIsBetter={false} />
      <MetricRow label="Best Trade" first={first.bestTrade} second={second.bestTrade} format={(v) => formatPnl(v)} />
      <MetricRow label="Worst Trade" first={first.worstTrade} second={second.worstTrade} format={(v) => formatPnl(v)} />
    </motion.div>
  );
}
