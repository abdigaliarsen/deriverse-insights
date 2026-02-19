import { motion } from "framer-motion";
import { formatPnl, formatCurrency } from "@/lib/mock-data";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  Target,
  DollarSign,
  Activity,
  Zap,
} from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  delay?: number;
}

function StatCard({ label, value, icon, subtitle, trend, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="card-trading group hover:border-primary/30 transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="stat-label">{label}</span>
        <span className="text-muted-foreground group-hover:text-primary transition-colors">
          {icon}
        </span>
      </div>
      <div className={`stat-value ${trend === "up" ? "text-profit" : trend === "down" ? "text-loss" : ""}`}>
        {value}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </motion.div>
  );
}

interface OverviewStatsProps {
  stats: {
    totalPnl: number;
    totalVolume: number;
    totalFees: number;
    winRate: number;
    tradeCount: number;
    avgDurationHours: number;
    profitFactor: number;
    largestWin: number;
    largestLoss: number;
    avgWin: number;
    avgLoss: number;
  };
}

export function OverviewStats({ stats }: OverviewStatsProps) {
  const cards: StatCardProps[] = [
    {
      label: "Total PnL",
      value: formatPnl(stats.totalPnl),
      icon: <DollarSign className="h-4 w-4" />,
      trend: stats.totalPnl >= 0 ? "up" : "down",
      subtitle: `${stats.tradeCount} trades`,
    },
    {
      label: "Win Rate",
      value: `${stats.winRate.toFixed(1)}%`,
      icon: <Target className="h-4 w-4" />,
      trend: stats.winRate >= 50 ? "up" : "down",
      subtitle: `Profit factor: ${stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}`,
    },
    {
      label: "Total Volume",
      value: `$${formatCurrency(stats.totalVolume)}`,
      icon: <BarChart3 className="h-4 w-4" />,
      trend: "neutral",
      subtitle: `Fees: $${formatCurrency(stats.totalFees)}`,
    },
    {
      label: "Avg Duration",
      value: `${stats.avgDurationHours.toFixed(1)}h`,
      icon: <Clock className="h-4 w-4" />,
      trend: "neutral",
    },
    {
      label: "Largest Win",
      value: formatPnl(stats.largestWin),
      icon: <TrendingUp className="h-4 w-4" />,
      trend: "up",
    },
    {
      label: "Largest Loss",
      value: formatPnl(stats.largestLoss),
      icon: <TrendingDown className="h-4 w-4" />,
      trend: "down",
    },
    {
      label: "Avg Win",
      value: formatPnl(stats.avgWin),
      icon: <Zap className="h-4 w-4" />,
      trend: "up",
    },
    {
      label: "Avg Loss",
      value: formatPnl(stats.avgLoss),
      icon: <Activity className="h-4 w-4" />,
      trend: "down",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card, i) => (
        <StatCard key={card.label} {...card} delay={i * 0.05} />
      ))}
    </div>
  );
}
