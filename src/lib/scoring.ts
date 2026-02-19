import { Trade } from "@/types/trading";
import { calculateRiskMetrics } from "./risk-metrics";

export interface SubScore {
  category: string;
  score: number;
  weight: number;
  details: string;
}

export interface PerformanceScoreResult {
  totalScore: number;
  grade: string;
  subScores: SubScore[];
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function normalize(val: number, min: number, max: number): number {
  if (max === min) return 50;
  return clamp(((val - min) / (max - min)) * 100, 0, 100);
}

export function calculatePerformanceScore(trades: Trade[]): PerformanceScoreResult {
  if (trades.length < 5) {
    return {
      totalScore: 0,
      grade: "N/A",
      subScores: [
        { category: "Profitability", score: 0, weight: 30, details: "Need more trades" },
        { category: "Risk Management", score: 0, weight: 25, details: "Need more trades" },
        { category: "Consistency", score: 0, weight: 25, details: "Need more trades" },
        { category: "Discipline", score: 0, weight: 20, details: "Need more trades" },
      ],
    };
  }

  const metrics = calculateRiskMetrics(trades);
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const totalVolume = trades.reduce((s, t) => s + t.size, 0);
  const winRate = wins.length / trades.length;

  // 1. Profitability (30%)
  const profitFactorScore = normalize(
    metrics.profitFactor === Infinity ? 5 : metrics.profitFactor,
    0, 3
  );
  const pnlRelative = totalVolume > 0 ? (totalPnl / totalVolume) * 100 : 0;
  const pnlScore = normalize(pnlRelative, -5, 5);
  const winRateScore = normalize(winRate * 100, 30, 70);
  const profitability = (profitFactorScore * 0.4 + pnlScore * 0.3 + winRateScore * 0.3);

  // 2. Risk Management (25%)
  const sharpeScore = normalize(metrics.sharpeRatio, -1, 3);
  const maxDdScore = normalize(100 - metrics.maxDrawdownPercent, 50, 100);
  const calmarScore = normalize(metrics.calmarRatio, -1, 3);
  const riskMgmt = (sharpeScore * 0.4 + maxDdScore * 0.35 + calmarScore * 0.25);

  // 3. Consistency (25%)
  // Daily PnL variance
  const dailyPnlMap = new Map<string, number>();
  for (const t of trades) {
    const d = t.exitTime.toISOString().split("T")[0];
    dailyPnlMap.set(d, (dailyPnlMap.get(d) || 0) + t.pnl);
  }
  const dailyPnls = Array.from(dailyPnlMap.values());
  const meanDaily = dailyPnls.length > 0
    ? dailyPnls.reduce((s, p) => s + p, 0) / dailyPnls.length : 0;
  const dailyVariance = dailyPnls.length > 0
    ? dailyPnls.reduce((s, p) => s + (p - meanDaily) ** 2, 0) / dailyPnls.length : 0;
  const dailyCV = meanDaily !== 0
    ? Math.abs(Math.sqrt(dailyVariance) / meanDaily) : 10;
  const varianceScore = normalize(10 - dailyCV, 0, 10);

  // Win rate consistency across weeks
  const sorted = [...trades].sort((a, b) => a.exitTime.getTime() - b.exitTime.getTime());
  const weekChunks: Trade[][] = [];
  let currentWeek: Trade[] = [];
  let weekStart = sorted.length > 0 ? sorted[0].exitTime.getTime() : 0;
  for (const t of sorted) {
    if (t.exitTime.getTime() - weekStart > 7 * 24 * 3600 * 1000) {
      if (currentWeek.length > 0) weekChunks.push(currentWeek);
      currentWeek = [];
      weekStart = t.exitTime.getTime();
    }
    currentWeek.push(t);
  }
  if (currentWeek.length > 0) weekChunks.push(currentWeek);

  const weeklyWinRates = weekChunks
    .filter((w) => w.length >= 3)
    .map((w) => w.filter((t) => t.pnl > 0).length / w.length);

  const wrStdDev = weeklyWinRates.length >= 2
    ? Math.sqrt(weeklyWinRates.reduce((s, wr) => {
        const mean = weeklyWinRates.reduce((a, b) => a + b, 0) / weeklyWinRates.length;
        return s + (wr - mean) ** 2;
      }, 0) / weeklyWinRates.length)
    : 0.5;
  const consistencyScore = normalize(1 - wrStdDev, 0, 1);

  const consistency = (varianceScore * 0.5 + consistencyScore * 0.5);

  // 4. Discipline (20%)
  // Leverage consistency
  const leverages = trades.map((t) => t.leverage);
  const meanLev = leverages.reduce((s, l) => s + l, 0) / leverages.length;
  const levVariance = leverages.reduce((s, l) => s + (l - meanLev) ** 2, 0) / leverages.length;
  const levCV = meanLev > 0 ? Math.sqrt(levVariance) / meanLev : 1;
  const levScore = normalize(2 - levCV, 0, 2);

  // Position sizing consistency
  const sizes = trades.map((t) => t.size);
  const meanSize = sizes.reduce((s, v) => s + v, 0) / sizes.length;
  const sizeVariance = sizes.reduce((s, v) => s + (v - meanSize) ** 2, 0) / sizes.length;
  const sizeCV = meanSize > 0 ? Math.sqrt(sizeVariance) / meanSize : 1;
  const sizeScore = normalize(2 - sizeCV, 0, 2);

  // Fee efficiency
  const totalFees = trades.reduce((s, t) => s + t.fees, 0);
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const feeRatio = grossProfit > 0 ? totalFees / grossProfit : 1;
  const feeScore = normalize(1 - feeRatio, 0, 1);

  const discipline = (levScore * 0.35 + sizeScore * 0.35 + feeScore * 0.3);

  // Total weighted score
  const totalScore = Math.round(
    profitability * 0.30 +
    riskMgmt * 0.25 +
    consistency * 0.25 +
    discipline * 0.20
  );

  const grade = totalScore >= 90 ? "A+"
    : totalScore >= 85 ? "A"
    : totalScore >= 80 ? "A-"
    : totalScore >= 75 ? "B+"
    : totalScore >= 70 ? "B"
    : totalScore >= 65 ? "B-"
    : totalScore >= 60 ? "C+"
    : totalScore >= 55 ? "C"
    : totalScore >= 50 ? "C-"
    : totalScore >= 45 ? "D+"
    : totalScore >= 40 ? "D"
    : "F";

  return {
    totalScore: clamp(totalScore, 0, 100),
    grade,
    subScores: [
      {
        category: "Profitability",
        score: Math.round(profitability),
        weight: 30,
        details: `PF: ${metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2)}, WR: ${(winRate * 100).toFixed(0)}%`,
      },
      {
        category: "Risk Management",
        score: Math.round(riskMgmt),
        weight: 25,
        details: `Sharpe: ${metrics.sharpeRatio.toFixed(2)}, DD: ${metrics.maxDrawdownPercent.toFixed(1)}%`,
      },
      {
        category: "Consistency",
        score: Math.round(consistency),
        weight: 25,
        details: `${weekChunks.length} weeks analyzed`,
      },
      {
        category: "Discipline",
        score: Math.round(discipline),
        weight: 20,
        details: `Fee ratio: ${(feeRatio * 100).toFixed(0)}%`,
      },
    ],
  };
}
