import { Trade, DailyPnl, SessionPerformance, SymbolStats, FeeBreakdown } from "@/types/trading";

const symbols = ["SOL-PERP", "BTC-PERP", "ETH-PERP", "JUP-PERP", "WIF-PERP", "BONK-PERP", "RAY-PERP", "ORCA-PERP"];
const orderTypes: Trade["orderType"][] = ["market", "limit", "stop"];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

export function generateMockTrades(count = 150): Trade[] {
  const trades: Trade[] = [];
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);

  for (let i = 0; i < count; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const side = Math.random() > 0.45 ? "long" : "short";
    const entryTime = randomDate(startDate, endDate);
    const durationMs = randomBetween(5 * 60 * 1000, 48 * 60 * 60 * 1000);
    const exitTime = new Date(entryTime.getTime() + durationMs);
    const entryPrice = symbol.includes("BTC") ? randomBetween(85000, 105000) :
                       symbol.includes("ETH") ? randomBetween(2800, 4200) :
                       symbol.includes("SOL") ? randomBetween(120, 260) :
                       randomBetween(0.5, 15);
    const leverage = [1, 2, 3, 5, 10][Math.floor(Math.random() * 5)];
    const pnlPercent = randomBetween(-15, 20);
    const size = randomBetween(500, 50000);
    const pnl = (size * pnlPercent) / 100;
    const exitPrice = side === "long" 
      ? entryPrice * (1 + pnlPercent / 100 / leverage) 
      : entryPrice * (1 - pnlPercent / 100 / leverage);
    const fees = size * randomBetween(0.0005, 0.002);

    trades.push({
      id: `trade-${i.toString().padStart(4, "0")}`,
      symbol,
      side,
      entryPrice,
      exitPrice: Math.max(0.01, exitPrice),
      size,
      pnl: pnl - fees,
      pnlPercent,
      fees,
      entryTime,
      exitTime,
      orderType: orderTypes[Math.floor(Math.random() * orderTypes.length)],
      notes: "",
      leverage,
    });
  }

  return trades.sort((a, b) => b.exitTime.getTime() - a.exitTime.getTime());
}

export function calculateDailyPnl(trades: Trade[]): DailyPnl[] {
  const dailyMap = new Map<string, { pnl: number; tradeCount: number }>();
  
  trades.forEach((t) => {
    const dateStr = t.exitTime.toISOString().split("T")[0];
    const existing = dailyMap.get(dateStr) || { pnl: 0, tradeCount: 0 };
    existing.pnl += t.pnl;
    existing.tradeCount += 1;
    dailyMap.set(dateStr, existing);
  });

  const sorted = Array.from(dailyMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  let cumPnl = 0;
  let peak = 0;

  return sorted.map(([date, data]) => {
    cumPnl += data.pnl;
    peak = Math.max(peak, cumPnl);
    const drawdown = peak > 0 ? ((cumPnl - peak) / peak) * 100 : 0;
    return { date, pnl: data.pnl, cumPnl, drawdown, tradeCount: data.tradeCount };
  });
}

export function calculateSessionPerformance(trades: Trade[]): SessionPerformance[] {
  const sessions = [
    { name: "Asia (00:00-08:00)", start: 0, end: 8 },
    { name: "Europe (08:00-16:00)", start: 8, end: 16 },
    { name: "Americas (16:00-24:00)", start: 16, end: 24 },
  ];

  return sessions.map((session) => {
    const sessionTrades = trades.filter((t) => {
      const hour = t.entryTime.getUTCHours();
      return hour >= session.start && hour < session.end;
    });
    const wins = sessionTrades.filter((t) => t.pnl > 0).length;
    return {
      session: session.name,
      pnl: sessionTrades.reduce((s, t) => s + t.pnl, 0),
      trades: sessionTrades.length,
      winRate: sessionTrades.length > 0 ? (wins / sessionTrades.length) * 100 : 0,
    };
  });
}

export function calculateSymbolStats(trades: Trade[]): SymbolStats[] {
  const map = new Map<string, Trade[]>();
  trades.forEach((t) => {
    const arr = map.get(t.symbol) || [];
    arr.push(t);
    map.set(t.symbol, arr);
  });

  return Array.from(map.entries()).map(([symbol, symbolTrades]) => ({
    symbol,
    trades: symbolTrades.length,
    pnl: symbolTrades.reduce((s, t) => s + t.pnl, 0),
    winRate: (symbolTrades.filter((t) => t.pnl > 0).length / symbolTrades.length) * 100,
    volume: symbolTrades.reduce((s, t) => s + t.size, 0),
  })).sort((a, b) => b.volume - a.volume);
}

export function calculateFeeBreakdown(trades: Trade[]): FeeBreakdown[] {
  const totalFees = trades.reduce((s, t) => s + t.fees, 0);
  const marketFees = trades.filter((t) => t.orderType === "market").reduce((s, t) => s + t.fees, 0);
  const limitFees = trades.filter((t) => t.orderType === "limit").reduce((s, t) => s + t.fees, 0);
  const stopFees = trades.filter((t) => t.orderType === "stop").reduce((s, t) => s + t.fees, 0);

  return [
    { type: "Taker (Market)", amount: marketFees, percentage: totalFees > 0 ? (marketFees / totalFees) * 100 : 0 },
    { type: "Maker (Limit)", amount: limitFees, percentage: totalFees > 0 ? (limitFees / totalFees) * 100 : 0 },
    { type: "Stop Orders", amount: stopFees, percentage: totalFees > 0 ? (stopFees / totalFees) * 100 : 0 },
  ];
}

export function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (abs >= 1000) return `${(value / 1000).toFixed(2)}K`;
  return value.toFixed(2);
}

export function formatPnl(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${formatCurrency(value)}`;
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}
