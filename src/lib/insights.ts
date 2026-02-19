import { Trade } from "@/types/trading";

export type InsightSeverity = "positive" | "warning" | "info";

export interface Insight {
  id: string;
  title: string;
  description: string;
  severity: InsightSeverity;
  value: string;
  icon: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SESSIONS = ["Asia (00-08)", "Europe (08-16)", "Americas (16-24)"];

function getSession(hour: number): string {
  if (hour < 8) return SESSIONS[0];
  if (hour < 16) return SESSIONS[1];
  return SESSIONS[2];
}

export function generateInsights(trades: Trade[]): Insight[] {
  if (trades.length < 5) return [];

  const insights: Insight[] = [];
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const totalFees = trades.reduce((s, t) => s + t.fees, 0);
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);

  // Best/worst day of week
  const dayPnl = new Map<number, number>();
  const dayCount = new Map<number, number>();
  for (const t of trades) {
    const d = t.entryTime.getDay();
    dayPnl.set(d, (dayPnl.get(d) || 0) + t.pnl);
    dayCount.set(d, (dayCount.get(d) || 0) + 1);
  }
  const dayEntries = Array.from(dayPnl.entries());
  if (dayEntries.length > 0) {
    const bestDay = dayEntries.reduce((a, b) => (b[1] > a[1] ? b : a));
    const worstDay = dayEntries.reduce((a, b) => (b[1] < a[1] ? b : a));
    if (bestDay[1] > 0) {
      insights.push({
        id: "best-day",
        title: "Best Trading Day",
        description: `${DAYS[bestDay[0]]} is your most profitable day with ${dayCount.get(bestDay[0])} trades`,
        severity: "positive",
        value: `+$${bestDay[1].toFixed(0)}`,
        icon: "calendar",
      });
    }
    if (worstDay[1] < 0) {
      insights.push({
        id: "worst-day",
        title: "Worst Trading Day",
        description: `${DAYS[worstDay[0]]} tends to be unprofitable — consider reducing activity`,
        severity: "warning",
        value: `-$${Math.abs(worstDay[1]).toFixed(0)}`,
        icon: "calendar-x",
      });
    }
  }

  // Best/worst session
  const sessionPnl = new Map<string, { pnl: number; count: number }>();
  for (const t of trades) {
    const sess = getSession(t.entryTime.getUTCHours());
    const entry = sessionPnl.get(sess) || { pnl: 0, count: 0 };
    entry.pnl += t.pnl;
    entry.count++;
    sessionPnl.set(sess, entry);
  }
  const sessEntries = Array.from(sessionPnl.entries());
  if (sessEntries.length > 0) {
    const bestSess = sessEntries.reduce((a, b) => (b[1].pnl > a[1].pnl ? b : a));
    if (bestSess[1].pnl > 0) {
      insights.push({
        id: "best-session",
        title: "Best Session",
        description: `${bestSess[0]} session delivers your highest returns`,
        severity: "positive",
        value: `+$${bestSess[1].pnl.toFixed(0)}`,
        icon: "clock",
      });
    }
  }

  // Leverage impact
  const lowLev = trades.filter((t) => t.leverage <= 3);
  const highLev = trades.filter((t) => t.leverage > 3);
  if (lowLev.length >= 3 && highLev.length >= 3) {
    const lowWinRate = (lowLev.filter((t) => t.pnl > 0).length / lowLev.length) * 100;
    const highWinRate = (highLev.filter((t) => t.pnl > 0).length / highLev.length) * 100;
    if (lowWinRate > highWinRate) {
      insights.push({
        id: "leverage-impact",
        title: "Leverage Impact",
        description: `Trades at ≤3x leverage have ${(lowWinRate - highWinRate).toFixed(0)}% higher win rate than >3x`,
        severity: "info",
        value: `${lowWinRate.toFixed(0)}% vs ${highWinRate.toFixed(0)}%`,
        icon: "gauge",
      });
    } else {
      insights.push({
        id: "leverage-impact",
        title: "High Leverage Works",
        description: `Your >3x leverage trades actually perform better — you manage risk well`,
        severity: "positive",
        value: `${highWinRate.toFixed(0)}% WR`,
        icon: "gauge",
      });
    }
  }

  // Size impact
  if (wins.length >= 3 && losses.length >= 3) {
    const avgWinSize = wins.reduce((s, t) => s + t.size, 0) / wins.length;
    const avgLossSize = losses.reduce((s, t) => s + t.size, 0) / losses.length;
    const ratio = avgLossSize / avgWinSize;
    if (ratio > 1.2) {
      insights.push({
        id: "size-impact",
        title: "Position Sizing Alert",
        description: `Your avg losing trade is ${ratio.toFixed(1)}x bigger than winners — tighten sizing on losers`,
        severity: "warning",
        value: `$${avgLossSize.toFixed(0)} vs $${avgWinSize.toFixed(0)}`,
        icon: "scale",
      });
    } else if (ratio < 0.9) {
      insights.push({
        id: "size-impact",
        title: "Good Position Sizing",
        description: `You size winners bigger than losers — strong risk management`,
        severity: "positive",
        value: `${((1 - ratio) * 100).toFixed(0)}% smaller losses`,
        icon: "scale",
      });
    }
  }

  // Duration impact
  const shortTrades = trades.filter((t) => (t.exitTime.getTime() - t.entryTime.getTime()) < 2 * 3600 * 1000);
  const longTrades = trades.filter((t) => (t.exitTime.getTime() - t.entryTime.getTime()) >= 2 * 3600 * 1000);
  if (shortTrades.length >= 5 && longTrades.length >= 5) {
    const shortAvg = shortTrades.reduce((s, t) => s + t.pnl, 0) / shortTrades.length;
    const longAvg = longTrades.reduce((s, t) => s + t.pnl, 0) / longTrades.length;
    if (shortAvg > longAvg && shortAvg > 0) {
      insights.push({
        id: "duration-impact",
        title: "Quick Trades Win",
        description: `Trades held <2hrs have better avg PnL ($${shortAvg.toFixed(0)} vs $${longAvg.toFixed(0)})`,
        severity: "info",
        value: `$${shortAvg.toFixed(0)} avg`,
        icon: "timer",
      });
    } else if (longAvg > shortAvg && longAvg > 0) {
      insights.push({
        id: "duration-impact",
        title: "Patience Pays",
        description: `Trades held ≥2hrs outperform short trades ($${longAvg.toFixed(0)} vs $${shortAvg.toFixed(0)})`,
        severity: "positive",
        value: `$${longAvg.toFixed(0)} avg`,
        icon: "timer",
      });
    }
  }

  // Symbol-specific insight
  const symbolPnl = new Map<string, number>();
  for (const t of trades) {
    symbolPnl.set(t.symbol, (symbolPnl.get(t.symbol) || 0) + t.pnl);
  }
  const symbolEntries = Array.from(symbolPnl.entries());
  if (symbolEntries.length > 0) {
    const best = symbolEntries.reduce((a, b) => (b[1] > a[1] ? b : a));
    if (best[1] > 0) {
      insights.push({
        id: "best-symbol",
        title: "Top Symbol",
        description: `${best[0]} is your most profitable instrument`,
        severity: "positive",
        value: `+$${best[1].toFixed(0)}`,
        icon: "trending-up",
      });
    }
  }

  // Fee impact
  if (grossProfit > 0 && totalFees > 0) {
    const feePercent = (totalFees / grossProfit) * 100;
    insights.push({
      id: "fee-impact",
      title: feePercent > 30 ? "High Fee Drag" : "Fee Efficiency",
      description: feePercent > 30
        ? `Fees consumed ${feePercent.toFixed(0)}% of gross profit — consider more limit orders`
        : `Fees are ${feePercent.toFixed(0)}% of gross profit — well managed`,
      severity: feePercent > 30 ? "warning" : "positive",
      value: `$${totalFees.toFixed(0)}`,
      icon: "receipt",
    });
  }

  // Streak/overtrading warning
  const sorted = [...trades].sort((a, b) => a.exitTime.getTime() - b.exitTime.getTime());
  let maxConsecLosses = 0;
  let consecLosses = 0;
  let tradesAfterStreak = 0;
  let pnlAfterStreak = 0;
  let inPostStreak = false;

  for (const t of sorted) {
    if (t.pnl <= 0) {
      consecLosses++;
      maxConsecLosses = Math.max(maxConsecLosses, consecLosses);
      if (consecLosses >= 3) inPostStreak = true;
    } else {
      if (inPostStreak) {
        tradesAfterStreak++;
        pnlAfterStreak += t.pnl;
        if (tradesAfterStreak >= 3) inPostStreak = false;
      }
      consecLosses = 0;
    }
  }

  if (maxConsecLosses >= 3) {
    insights.push({
      id: "streak-warning",
      title: "Loss Streak Pattern",
      description: `You've had ${maxConsecLosses}-trade losing streaks — consider stepping back after 3 consecutive losses`,
      severity: "warning",
      value: `${maxConsecLosses} max`,
      icon: "alert-triangle",
    });
  }

  return insights.slice(0, 8);
}
