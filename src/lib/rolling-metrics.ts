import { Trade } from "@/types/trading";

export interface RollingDataPoint {
  date: string;
  sharpe7d: number;
  sharpe30d: number;
  winRate7d: number;
  winRate30d: number;
  avgPnl7d: number;
  avgPnl30d: number;
  profitFactor7d: number;
  profitFactor30d: number;
}

function calcMetrics(trades: Trade[]) {
  if (trades.length === 0) return { sharpe: 0, winRate: 0, avgPnl: 0, profitFactor: 0 };

  const pnls = trades.map((t) => t.pnl);
  const mean = pnls.reduce((s, p) => s + p, 0) / pnls.length;
  const variance = pnls.reduce((s, p) => s + (p - mean) ** 2, 0) / pnls.length;
  const stdDev = Math.sqrt(variance);
  const sharpe = stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0;

  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const winRate = (wins.length / trades.length) * 100;
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 5 : 0;

  return { sharpe, winRate, avgPnl: mean, profitFactor: Math.min(profitFactor, 5) };
}

export function calculateRollingMetrics(trades: Trade[]): RollingDataPoint[] {
  if (trades.length < 5) return [];

  const sorted = [...trades].sort((a, b) => a.exitTime.getTime() - b.exitTime.getTime());

  // Group trades by date
  const tradesByDate = new Map<string, Trade[]>();
  for (const t of sorted) {
    const d = t.exitTime.toISOString().split("T")[0];
    const arr = tradesByDate.get(d) || [];
    arr.push(t);
    tradesByDate.set(d, arr);
  }

  const dates = Array.from(tradesByDate.keys()).sort();
  if (dates.length < 3) return [];

  const results: RollingDataPoint[] = [];

  for (let i = 0; i < dates.length; i++) {
    const currentDate = dates[i];
    const currentTime = new Date(currentDate).getTime();

    // Collect trades within 7d and 30d windows
    const trades7d: Trade[] = [];
    const trades30d: Trade[] = [];

    for (let j = i; j >= 0; j--) {
      const dateTime = new Date(dates[j]).getTime();
      const daysDiff = (currentTime - dateTime) / (24 * 3600 * 1000);
      const dateTrades = tradesByDate.get(dates[j]) || [];

      if (daysDiff <= 7) {
        trades7d.push(...dateTrades);
      }
      if (daysDiff <= 30) {
        trades30d.push(...dateTrades);
      }
      if (daysDiff > 30) break;
    }

    if (trades7d.length < 2 && trades30d.length < 2) continue;

    const m7 = calcMetrics(trades7d);
    const m30 = calcMetrics(trades30d);

    results.push({
      date: currentDate,
      sharpe7d: m7.sharpe,
      sharpe30d: m30.sharpe,
      winRate7d: m7.winRate,
      winRate30d: m30.winRate,
      avgPnl7d: m7.avgPnl,
      avgPnl30d: m30.avgPnl,
      profitFactor7d: m7.profitFactor,
      profitFactor30d: m30.profitFactor,
    });
  }

  return results;
}
