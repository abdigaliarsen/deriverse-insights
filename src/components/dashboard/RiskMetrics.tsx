import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trade } from "@/types/trading";
import { calculateRiskMetrics, calculateStreaks, RiskMetrics as RiskMetricsType, StreakData } from "@/lib/risk-metrics";
import { formatPnl } from "@/lib/mock-data";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MetricCardProps {
  label: string;
  value: string;
  color: "green" | "yellow" | "red" | "neutral";
  tooltip: string;
}

function MetricCard({ label, value, color, tooltip }: MetricCardProps) {
  const colorClass =
    color === "green" ? "text-profit" :
    color === "red" ? "text-loss" :
    color === "yellow" ? "text-warning" :
    "text-foreground";

  return (
    <div className="bg-secondary/30 rounded-lg p-2.5 flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <span className="stat-label">{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px] text-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </div>
      <span className={`font-mono text-sm font-semibold ${colorClass}`}>{value}</span>
    </div>
  );
}

function ratingColor(value: number, thresholds: { good: number; bad: number; higherIsBetter?: boolean }): "green" | "yellow" | "red" {
  const { good, bad, higherIsBetter = true } = thresholds;
  if (higherIsBetter) {
    if (value >= good) return "green";
    if (value <= bad) return "red";
    return "yellow";
  }
  if (value <= good) return "green";
  if (value >= bad) return "red";
  return "yellow";
}

interface RiskMetricsPanelProps {
  trades: Trade[];
}

export function RiskMetricsPanel({ trades }: RiskMetricsPanelProps) {
  const metrics: RiskMetricsType = useMemo(() => calculateRiskMetrics(trades), [trades]);
  const streaks: StreakData = useMemo(() => calculateStreaks(trades), [trades]);

  const cards: MetricCardProps[] = [
    {
      label: "Sharpe Ratio",
      value: metrics.sharpeRatio.toFixed(2),
      color: ratingColor(metrics.sharpeRatio, { good: 1, bad: 0 }),
      tooltip: "Risk-adjusted return. >1 is good, >2 is excellent.",
    },
    {
      label: "Sortino Ratio",
      value: metrics.sortinoRatio.toFixed(2),
      color: ratingColor(metrics.sortinoRatio, { good: 1.5, bad: 0 }),
      tooltip: "Like Sharpe but only penalizes downside volatility.",
    },
    {
      label: "Max Drawdown",
      value: `${metrics.maxDrawdownPercent.toFixed(1)}%`,
      color: ratingColor(metrics.maxDrawdownPercent, { good: 10, bad: 30, higherIsBetter: false }),
      tooltip: "Largest peak-to-trough decline as a percentage.",
    },
    {
      label: "DD Duration",
      value: `${metrics.maxDrawdownDuration}d`,
      color: ratingColor(metrics.maxDrawdownDuration, { good: 7, bad: 30, higherIsBetter: false }),
      tooltip: "Longest drawdown period in days.",
    },
    {
      label: "Recovery Factor",
      value: metrics.recoveryFactor.toFixed(2),
      color: ratingColor(metrics.recoveryFactor, { good: 2, bad: 0.5 }),
      tooltip: "Net profit divided by max drawdown. Higher = faster recovery.",
    },
    {
      label: "Calmar Ratio",
      value: metrics.calmarRatio.toFixed(2),
      color: ratingColor(metrics.calmarRatio, { good: 1, bad: 0 }),
      tooltip: "Annualized return divided by max drawdown %.",
    },
    {
      label: "Expectancy",
      value: formatPnl(metrics.expectancy),
      color: ratingColor(metrics.expectancy, { good: 50, bad: 0 }),
      tooltip: "Average expected profit per trade.",
    },
    {
      label: "Kelly Fraction",
      value: `${(metrics.kellyFraction * 100).toFixed(1)}%`,
      color: ratingColor(metrics.kellyFraction, { good: 0.1, bad: 0 }),
      tooltip: "Optimal fraction of capital to risk per trade (Kelly Criterion).",
    },
    {
      label: "Profit Factor",
      value: metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2),
      color: ratingColor(metrics.profitFactor === Infinity ? 10 : metrics.profitFactor, { good: 1.5, bad: 1 }),
      tooltip: "Gross profit / gross loss. >1.5 is good, >2 is excellent.",
    },
    {
      label: "VaR 95%",
      value: formatPnl(-metrics.var95),
      color: ratingColor(metrics.var95, { good: 200, bad: 1000, higherIsBetter: false }),
      tooltip: "Value at Risk (95%): max daily loss with 95% confidence.",
    },
    {
      label: "CVaR 95%",
      value: formatPnl(-metrics.cvar95),
      color: ratingColor(metrics.cvar95, { good: 300, bad: 1500, higherIsBetter: false }),
      tooltip: "Conditional VaR: average loss in the worst 5% of days.",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="card-trading"
    >
      <h3 className="text-sm font-semibold text-foreground mb-3">Risk Metrics</h3>

      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-11 gap-2 mb-4">
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      {/* Streaks */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div>
          <span className="text-muted-foreground">Current: </span>
          <span className={streaks.currentStreak.type === "win" ? "text-profit font-medium" : streaks.currentStreak.type === "loss" ? "text-loss font-medium" : "text-muted-foreground"}>
            {streaks.currentStreak.count > 0
              ? `${streaks.currentStreak.count} ${streaks.currentStreak.type}${streaks.currentStreak.count > 1 ? "s" : ""}`
              : "—"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Best streak: </span>
          <span className="text-profit font-medium">{streaks.longestWinStreak}W</span>
        </div>
        <div>
          <span className="text-muted-foreground">Worst streak: </span>
          <span className="text-loss font-medium">{streaks.longestLossStreak}L</span>
        </div>

        {/* Last 20 trades dots */}
        {streaks.last20.length > 0 && (
          <div className="flex items-center gap-0.5 ml-auto">
            <span className="text-muted-foreground mr-1">Last {streaks.last20.length}:</span>
            {streaks.last20.map((outcome, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full ${outcome === "win" ? "bg-profit" : "bg-loss"}`}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
