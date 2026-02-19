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

function MiniSparkline({ data, color = "currentColor" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const w = 48;
  const h = 16;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} className="inline-block ml-1 opacity-60">
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

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  delay?: number;
  sparklineData?: number[];
}

function StatCard({ label, value, icon, subtitle, trend, delay = 0, sparklineData }: StatCardProps) {
  const sparkColor = trend === "up" ? "hsl(145 65% 48%)" : trend === "down" ? "hsl(0 72% 55%)" : "hsl(215 15% 55%)";

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
      <div className="flex items-end gap-1">
        <div className={`stat-value ${trend === "up" ? "text-profit" : trend === "down" ? "text-loss" : ""}`}>
          {value}
        </div>
        {sparklineData && sparklineData.length >= 3 && (
          <MiniSparkline data={sparklineData} color={sparkColor} />
        )}
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
  dailyPnlValues?: number[];
  weeklyWinRates?: number[];
}

export function OverviewStats({ stats, dailyPnlValues, weeklyWinRates }: OverviewStatsProps) {
  // Generate simple sparkline data from cumulative PnL
  const cumPnlSparkline = dailyPnlValues && dailyPnlValues.length >= 3
    ? dailyPnlValues.reduce<number[]>((acc, v) => {
        acc.push((acc.length > 0 ? acc[acc.length - 1] : 0) + v);
        return acc;
      }, []).slice(-7)
    : undefined;

  const cards: StatCardProps[] = [
    {
      label: "Total PnL",
      value: formatPnl(stats.totalPnl),
      icon: <DollarSign className="h-4 w-4" />,
      trend: stats.totalPnl >= 0 ? "up" : "down",
      subtitle: `${stats.tradeCount} trades`,
      sparklineData: cumPnlSparkline,
    },
    {
      label: "Win Rate",
      value: `${stats.winRate.toFixed(1)}%`,
      icon: <Target className="h-4 w-4" />,
      trend: stats.winRate >= 50 ? "up" : "down",
      subtitle: `Profit factor: ${stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}`,
      sparklineData: weeklyWinRates,
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 h-full">
      {cards.map((card, i) => (
        <StatCard key={card.label} {...card} delay={i * 0.05} />
      ))}
    </div>
  );
}
