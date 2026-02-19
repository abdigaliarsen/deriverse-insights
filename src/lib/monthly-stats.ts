import { Trade } from "@/types/trading";

export interface MonthlyData {
  month: string; // YYYY-MM
  label: string; // "Jan 2026"
  pnl: number;
  tradeCount: number;
  winRate: number;
  bestDay: number;
  worstDay: number;
  fees: number;
  dailyPnls: number[];
}

export function calculateMonthlyStats(trades: Trade[]): MonthlyData[] {
  if (trades.length === 0) return [];

  const monthMap = new Map<string, Trade[]>();

  for (const t of trades) {
    const d = t.exitTime;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const arr = monthMap.get(key) || [];
    arr.push(t);
    monthMap.set(key, arr);
  }

  const months = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b));

  return months.map(([month, monthTrades]) => {
    const pnl = monthTrades.reduce((s, t) => s + t.pnl, 0);
    const wins = monthTrades.filter((t) => t.pnl > 0).length;
    const fees = monthTrades.reduce((s, t) => s + t.fees, 0);

    // Daily breakdown for sparkline and best/worst day
    const dailyMap = new Map<string, number>();
    for (const t of monthTrades) {
      const d = t.exitTime.toISOString().split("T")[0];
      dailyMap.set(d, (dailyMap.get(d) || 0) + t.pnl);
    }
    const dailyPnls = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    const bestDay = dailyPnls.length > 0 ? Math.max(...dailyPnls) : 0;
    const worstDay = dailyPnls.length > 0 ? Math.min(...dailyPnls) : 0;

    const [year, m] = month.split("-");
    const date = new Date(Number(year), Number(m) - 1);
    const label = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });

    return {
      month,
      label,
      pnl,
      tradeCount: monthTrades.length,
      winRate: monthTrades.length > 0 ? (wins / monthTrades.length) * 100 : 0,
      bestDay,
      worstDay,
      fees,
      dailyPnls,
    };
  });
}
