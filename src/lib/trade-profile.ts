import { Trade } from "@/types/trading";

export interface TradeProfileSide {
  avgSize: number;
  avgDurationHours: number;
  avgLeverage: number;
  avgFees: number;
  count: number;
  totalPnl: number;
  mostCommonSymbol: string;
  mostCommonOrderType: string;
  mostCommonHour: number;
  avgPnl: number;
}

export interface WinLossProfileData {
  winners: TradeProfileSide;
  losers: TradeProfileSide;
}

function mostCommon<T>(arr: T[]): T {
  const freq = new Map<string, number>();
  for (const v of arr) {
    const key = String(v);
    freq.set(key, (freq.get(key) || 0) + 1);
  }
  let best = arr[0];
  let bestCount = 0;
  for (const [key, count] of freq.entries()) {
    if (count > bestCount) {
      bestCount = count;
      best = arr.find((v) => String(v) === key) || arr[0];
    }
  }
  return best;
}

function profileTrades(trades: Trade[]): TradeProfileSide {
  if (trades.length === 0) {
    return {
      avgSize: 0, avgDurationHours: 0, avgLeverage: 0, avgFees: 0,
      count: 0, totalPnl: 0, mostCommonSymbol: "—", mostCommonOrderType: "—",
      mostCommonHour: 0, avgPnl: 0,
    };
  }

  const totalSize = trades.reduce((s, t) => s + t.size, 0);
  const totalDuration = trades.reduce((s, t) => s + (t.exitTime.getTime() - t.entryTime.getTime()), 0);
  const totalLev = trades.reduce((s, t) => s + t.leverage, 0);
  const totalFees = trades.reduce((s, t) => s + t.fees, 0);
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const hours = trades.map((t) => t.entryTime.getHours());

  return {
    avgSize: totalSize / trades.length,
    avgDurationHours: totalDuration / trades.length / (1000 * 60 * 60),
    avgLeverage: totalLev / trades.length,
    avgFees: totalFees / trades.length,
    count: trades.length,
    totalPnl,
    mostCommonSymbol: mostCommon(trades.map((t) => t.symbol)),
    mostCommonOrderType: mostCommon(trades.map((t) => t.orderType)),
    mostCommonHour: mostCommon(hours),
    avgPnl: totalPnl / trades.length,
  };
}

export function calculateWinLossProfile(trades: Trade[]): WinLossProfileData {
  const winners = trades.filter((t) => t.pnl > 0);
  const losers = trades.filter((t) => t.pnl <= 0);

  return {
    winners: profileTrades(winners),
    losers: profileTrades(losers),
  };
}
