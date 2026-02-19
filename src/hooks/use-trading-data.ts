import { useMemo, useState } from "react";
import { Trade } from "@/types/trading";
import {
  generateMockTrades,
  calculateDailyPnl,
  calculateSessionPerformance,
  calculateSymbolStats,
  calculateFeeBreakdown,
} from "@/lib/mock-data";

export function useTradingData() {
  const allTrades = useMemo(() => generateMockTrades(200), []);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
    from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  const filteredTrades = useMemo(() => {
    return allTrades.filter((t) => {
      if (selectedSymbol !== "all" && t.symbol !== selectedSymbol) return false;
      if (dateRange.from && t.exitTime < dateRange.from) return false;
      if (dateRange.to && t.exitTime > dateRange.to) return false;
      return true;
    });
  }, [allTrades, selectedSymbol, dateRange]);

  const symbols = useMemo(() => [...new Set(allTrades.map((t) => t.symbol))].sort(), [allTrades]);

  const stats = useMemo(() => {
    const wins = filteredTrades.filter((t) => t.pnl > 0);
    const losses = filteredTrades.filter((t) => t.pnl <= 0);
    const totalPnl = filteredTrades.reduce((s, t) => s + t.pnl, 0);
    const totalVolume = filteredTrades.reduce((s, t) => s + t.size, 0);
    const totalFees = filteredTrades.reduce((s, t) => s + t.fees, 0);
    const winRate = filteredTrades.length > 0 ? (wins.length / filteredTrades.length) * 100 : 0;
    const longs = filteredTrades.filter((t) => t.side === "long");
    const shorts = filteredTrades.filter((t) => t.side === "short");
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
    const largestWin = wins.length > 0 ? Math.max(...wins.map((t) => t.pnl)) : 0;
    const largestLoss = losses.length > 0 ? Math.min(...losses.map((t) => t.pnl)) : 0;
    const avgDurationMs = filteredTrades.length > 0
      ? filteredTrades.reduce((s, t) => s + (t.exitTime.getTime() - t.entryTime.getTime()), 0) / filteredTrades.length
      : 0;
    const avgDurationHours = avgDurationMs / (1000 * 60 * 60);
    const profitFactor = Math.abs(losses.reduce((s, t) => s + t.pnl, 0)) > 0
      ? wins.reduce((s, t) => s + t.pnl, 0) / Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
      : wins.length > 0 ? Infinity : 0;

    return {
      totalPnl,
      totalVolume,
      totalFees,
      winRate,
      tradeCount: filteredTrades.length,
      winCount: wins.length,
      lossCount: losses.length,
      longCount: longs.length,
      shortCount: shorts.length,
      longPnl: longs.reduce((s, t) => s + t.pnl, 0),
      shortPnl: shorts.reduce((s, t) => s + t.pnl, 0),
      avgWin,
      avgLoss,
      largestWin,
      largestLoss,
      avgDurationHours,
      profitFactor,
    };
  }, [filteredTrades]);

  const dailyPnl = useMemo(() => calculateDailyPnl(filteredTrades), [filteredTrades]);
  const sessionPerf = useMemo(() => calculateSessionPerformance(filteredTrades), [filteredTrades]);
  const symbolStats = useMemo(() => calculateSymbolStats(filteredTrades), [filteredTrades]);
  const feeBreakdown = useMemo(() => calculateFeeBreakdown(filteredTrades), [filteredTrades]);

  return {
    trades: filteredTrades,
    allTrades,
    stats,
    dailyPnl,
    sessionPerf,
    symbolStats,
    feeBreakdown,
    symbols,
    selectedSymbol,
    setSelectedSymbol,
    dateRange,
    setDateRange,
  };
}
