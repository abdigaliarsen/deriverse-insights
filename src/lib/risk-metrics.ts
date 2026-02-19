import { Trade } from "@/types/trading";

export interface RiskMetrics {
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdownPercent: number;
  maxDrawdownDuration: number; // days
  recoveryFactor: number;
  calmarRatio: number;
  expectancy: number;
  kellyFraction: number;
  profitFactor: number;
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;
}

export interface StreakData {
  currentStreak: { type: "win" | "loss" | "none"; count: number };
  longestWinStreak: number;
  longestLossStreak: number;
  last20: ("win" | "loss")[];
}

export function calculateRiskMetrics(trades: Trade[]): RiskMetrics {
  if (trades.length === 0) {
    return {
      sharpeRatio: 0, sortinoRatio: 0, maxDrawdownPercent: 0,
      maxDrawdownDuration: 0, recoveryFactor: 0, calmarRatio: 0,
      expectancy: 0, kellyFraction: 0, profitFactor: 0,
      var95: 0, var99: 0, cvar95: 0, cvar99: 0,
    };
  }

  const pnls = trades.map((t) => t.pnl);
  const meanPnl = pnls.reduce((s, p) => s + p, 0) / pnls.length;

  // Standard deviation
  const variance = pnls.reduce((s, p) => s + (p - meanPnl) ** 2, 0) / pnls.length;
  const stdDev = Math.sqrt(variance);

  // Downside deviation (only negative returns)
  const downsideVariance = pnls.reduce((s, p) => s + (p < 0 ? p ** 2 : 0), 0) / pnls.length;
  const downsideDev = Math.sqrt(downsideVariance);

  // Sharpe Ratio (assuming risk-free rate ~ 0 for simplicity)
  const sharpeRatio = stdDev > 0 ? (meanPnl / stdDev) * Math.sqrt(252) : 0;

  // Sortino Ratio
  const sortinoRatio = downsideDev > 0 ? (meanPnl / downsideDev) * Math.sqrt(252) : 0;

  // Max Drawdown
  const sorted = [...trades].sort((a, b) => a.exitTime.getTime() - b.exitTime.getTime());
  let cumPnl = 0;
  let peak = 0;
  let maxDd = 0;
  let maxDdDuration = 0;
  let currentDdStart: Date | null = null;

  for (const t of sorted) {
    cumPnl += t.pnl;
    if (cumPnl > peak) {
      peak = cumPnl;
      currentDdStart = null;
    } else {
      if (!currentDdStart) currentDdStart = t.exitTime;
      const dd = peak > 0 ? ((peak - cumPnl) / peak) * 100 : 0;
      if (dd > maxDd) maxDd = dd;
      const duration = Math.ceil((t.exitTime.getTime() - currentDdStart.getTime()) / (1000 * 60 * 60 * 24));
      if (duration > maxDdDuration) maxDdDuration = duration;
    }
  }

  const totalPnl = pnls.reduce((s, p) => s + p, 0);

  // Recovery Factor = Total PnL / Max Drawdown (absolute)
  const maxDdAbsolute = peak > 0 ? (maxDd / 100) * peak : 0;
  const recoveryFactor = maxDdAbsolute > 0 ? totalPnl / maxDdAbsolute : 0;

  // Calmar Ratio = Annualized return / Max Drawdown %
  const daySpan = sorted.length > 1
    ? (sorted[sorted.length - 1].exitTime.getTime() - sorted[0].exitTime.getTime()) / (1000 * 60 * 60 * 24)
    : 1;
  const annualizedReturn = daySpan > 0 ? (totalPnl / daySpan) * 365 : 0;
  const calmarRatio = maxDd > 0 ? annualizedReturn / maxDd : 0;

  // Win/loss stats
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const winRate = wins.length / trades.length;
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;

  // Expectancy = (Win% × AvgWin) - (Loss% × AvgLoss)
  const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);

  // Kelly Fraction = W - (L / R) where W=win rate, L=loss rate, R=win/loss ratio
  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
  const kellyFraction = winLossRatio > 0 ? winRate - ((1 - winRate) / winLossRatio) : 0;

  // Profit Factor
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // VaR and CVaR from daily PnL
  const dailyPnlMap = new Map<string, number>();
  for (const t of sorted) {
    const d = t.exitTime.toISOString().split("T")[0];
    dailyPnlMap.set(d, (dailyPnlMap.get(d) || 0) + t.pnl);
  }
  const dailyPnls = Array.from(dailyPnlMap.values()).sort((a, b) => a - b);

  function calcVaR(sortedPnls: number[], confidence: number): number {
    if (sortedPnls.length === 0) return 0;
    const idx = Math.floor(sortedPnls.length * (1 - confidence));
    return -sortedPnls[Math.max(0, idx)];
  }

  function calcCVaR(sortedPnls: number[], confidence: number): number {
    if (sortedPnls.length === 0) return 0;
    const idx = Math.floor(sortedPnls.length * (1 - confidence));
    const tail = sortedPnls.slice(0, Math.max(1, idx));
    return -(tail.reduce((s, v) => s + v, 0) / tail.length);
  }

  const var95 = calcVaR(dailyPnls, 0.95);
  const var99 = calcVaR(dailyPnls, 0.99);
  const cvar95 = calcCVaR(dailyPnls, 0.95);
  const cvar99 = calcCVaR(dailyPnls, 0.99);

  return {
    sharpeRatio,
    sortinoRatio,
    maxDrawdownPercent: maxDd,
    maxDrawdownDuration: maxDdDuration,
    recoveryFactor,
    calmarRatio,
    expectancy,
    kellyFraction,
    profitFactor,
    var95,
    var99,
    cvar95,
    cvar99,
  };
}

export function calculateStreaks(trades: Trade[]): StreakData {
  if (trades.length === 0) {
    return { currentStreak: { type: "none", count: 0 }, longestWinStreak: 0, longestLossStreak: 0, last20: [] };
  }

  const sorted = [...trades].sort((a, b) => a.exitTime.getTime() - b.exitTime.getTime());
  const outcomes = sorted.map((t): "win" | "loss" => (t.pnl > 0 ? "win" : "loss"));

  let longestWin = 0;
  let longestLoss = 0;
  let currentType = outcomes[0];
  let currentCount = 1;

  for (let i = 1; i < outcomes.length; i++) {
    if (outcomes[i] === currentType) {
      currentCount++;
    } else {
      if (currentType === "win") longestWin = Math.max(longestWin, currentCount);
      else longestLoss = Math.max(longestLoss, currentCount);
      currentType = outcomes[i];
      currentCount = 1;
    }
  }
  if (currentType === "win") longestWin = Math.max(longestWin, currentCount);
  else longestLoss = Math.max(longestLoss, currentCount);

  return {
    currentStreak: { type: currentType, count: currentCount },
    longestWinStreak: longestWin,
    longestLossStreak: longestLoss,
    last20: outcomes.slice(-20),
  };
}
