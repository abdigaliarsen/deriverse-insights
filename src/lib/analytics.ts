import { Trade } from "@/types/trading";

export interface CumulativeFeeEntry {
  date: string;
  dailyFees: number;
  cumFees: number;
}

export interface TimeOfDayCell {
  day: number; // 0=Sun..6=Sat
  hour: number; // 0-23
  pnl: number;
  tradeCount: number;
  winRate: number;
}

export function calculateCumulativeFees(trades: Trade[]): CumulativeFeeEntry[] {
  const dailyMap = new Map<string, number>();

  for (const t of trades) {
    const dateStr = t.exitTime.toISOString().split("T")[0];
    dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + t.fees);
  }

  const sorted = Array.from(dailyMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  let cumFees = 0;

  return sorted.map(([date, dailyFees]) => {
    cumFees += dailyFees;
    return { date, dailyFees, cumFees };
  });
}

export function calculateTimeOfDay(trades: Trade[]): {
  cells: TimeOfDayCell[];
  bestHour: { day: number; hour: number; pnl: number } | null;
  worstHour: { day: number; hour: number; pnl: number } | null;
} {
  const grid = new Map<string, { pnl: number; count: number; wins: number }>();

  for (const t of trades) {
    const day = t.entryTime.getDay();
    const hour = t.entryTime.getHours();
    const key = `${day}-${hour}`;
    const cell = grid.get(key) || { pnl: 0, count: 0, wins: 0 };
    cell.pnl += t.pnl;
    cell.count += 1;
    if (t.pnl > 0) cell.wins += 1;
    grid.set(key, cell);
  }

  const cells: TimeOfDayCell[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const cell = grid.get(`${day}-${hour}`);
      cells.push({
        day,
        hour,
        pnl: cell?.pnl || 0,
        tradeCount: cell?.count || 0,
        winRate: cell && cell.count > 0 ? (cell.wins / cell.count) * 100 : 0,
      });
    }
  }

  const withTrades = cells.filter((c) => c.tradeCount > 0);
  const bestHour = withTrades.length > 0
    ? withTrades.reduce((best, c) => (c.pnl > best.pnl ? c : best))
    : null;
  const worstHour = withTrades.length > 0
    ? withTrades.reduce((worst, c) => (c.pnl < worst.pnl ? c : worst))
    : null;

  return {
    cells,
    bestHour: bestHour ? { day: bestHour.day, hour: bestHour.hour, pnl: bestHour.pnl } : null,
    worstHour: worstHour ? { day: worstHour.day, hour: worstHour.hour, pnl: worstHour.pnl } : null,
  };
}

export interface CalendarDay {
  date: string;
  pnl: number;
  tradeCount: number;
}

export function calculateCalendarData(trades: Trade[]): CalendarDay[] {
  const map = new Map<string, { pnl: number; count: number }>();

  for (const t of trades) {
    const dateStr = t.exitTime.toISOString().split("T")[0];
    const entry = map.get(dateStr) || { pnl: 0, count: 0 };
    entry.pnl += t.pnl;
    entry.count += 1;
    map.set(dateStr, entry);
  }

  return Array.from(map.entries())
    .map(([date, d]) => ({ date, pnl: d.pnl, tradeCount: d.count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface EquityCurveEntry {
  date: string;
  equity: number;
  highWaterMark: number;
}

export function calculateEquityCurve(trades: Trade[], initialBalance = 10000): EquityCurveEntry[] {
  const dailyMap = new Map<string, number>();

  for (const t of trades) {
    const dateStr = t.exitTime.toISOString().split("T")[0];
    dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + t.pnl);
  }

  const sorted = Array.from(dailyMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  let equity = initialBalance;
  let hwm = initialBalance;

  return sorted.map(([date, dailyPnl]) => {
    equity += dailyPnl;
    hwm = Math.max(hwm, equity);
    return { date, equity, highWaterMark: hwm };
  });
}

export interface LeverageBracket {
  leverage: string;
  trades: number;
  pnl: number;
  winRate: number;
  avgPnl: number;
}

export function calculateLeverageAnalysis(trades: Trade[]): LeverageBracket[] {
  const brackets = new Map<number, Trade[]>();

  for (const t of trades) {
    const arr = brackets.get(t.leverage) || [];
    arr.push(t);
    brackets.set(t.leverage, arr);
  }

  return Array.from(brackets.entries())
    .sort(([a], [b]) => a - b)
    .map(([lev, levTrades]) => {
      const wins = levTrades.filter((t) => t.pnl > 0).length;
      const totalPnl = levTrades.reduce((s, t) => s + t.pnl, 0);
      return {
        leverage: `${lev}x`,
        trades: levTrades.length,
        pnl: totalPnl,
        winRate: levTrades.length > 0 ? (wins / levTrades.length) * 100 : 0,
        avgPnl: levTrades.length > 0 ? totalPnl / levTrades.length : 0,
      };
    });
}

export interface PnlBucket {
  range: string;
  count: number;
  from: number;
  to: number;
}

export function calculatePnlDistribution(trades: Trade[], bucketCount = 20): PnlBucket[] {
  if (trades.length === 0) return [];

  const pnls = trades.map((t) => t.pnl);
  const min = Math.min(...pnls);
  const max = Math.max(...pnls);
  const range = max - min;
  if (range === 0) return [{ range: `$${min.toFixed(0)}`, count: trades.length, from: min, to: max }];

  const step = range / bucketCount;
  const buckets: PnlBucket[] = [];

  for (let i = 0; i < bucketCount; i++) {
    const from = min + i * step;
    const to = from + step;
    const count = pnls.filter((p) => p >= from && (i === bucketCount - 1 ? p <= to : p < to)).length;
    buckets.push({
      range: `$${from.toFixed(0)}`,
      count,
      from,
      to,
    });
  }

  return buckets;
}

export interface PeriodStats {
  label: string;
  totalPnl: number;
  winRate: number;
  tradeCount: number;
  avgPnl: number;
  totalFees: number;
  profitFactor: number;
}

export function calculatePeriodComparison(trades: Trade[]): { first: PeriodStats; second: PeriodStats } | null {
  if (trades.length < 2) return null;

  const sorted = [...trades].sort((a, b) => a.exitTime.getTime() - b.exitTime.getTime());
  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint);
  const secondHalf = sorted.slice(midpoint);

  function computeStats(group: Trade[], label: string): PeriodStats {
    const wins = group.filter((t) => t.pnl > 0);
    const losses = group.filter((t) => t.pnl <= 0);
    const totalPnl = group.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);

    return {
      label,
      totalPnl,
      winRate: group.length > 0 ? (wins.length / group.length) * 100 : 0,
      tradeCount: group.length,
      avgPnl: group.length > 0 ? totalPnl / group.length : 0,
      totalFees: group.reduce((s, t) => s + t.fees, 0),
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    };
  }

  const firstStart = firstHalf[0].exitTime.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const firstEnd = firstHalf[firstHalf.length - 1].exitTime.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const secondStart = secondHalf[0].exitTime.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const secondEnd = secondHalf[secondHalf.length - 1].exitTime.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return {
    first: computeStats(firstHalf, `${firstStart} – ${firstEnd}`),
    second: computeStats(secondHalf, `${secondStart} – ${secondEnd}`),
  };
}
