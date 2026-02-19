import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTradingData } from "../use-trading-data";

describe("useTradingData", () => {
  it("initializes with default values", () => {
    const { result } = renderHook(() => useTradingData());
    expect(result.current.selectedSymbol).toBe("all");
    expect(result.current.dateRange.from).toBeInstanceOf(Date);
    expect(result.current.dateRange.to).toBeInstanceOf(Date);
    expect(result.current.allTrades.length).toBe(200);
  });

  it("filters trades by symbol", () => {
    const { result } = renderHook(() => useTradingData());
    const firstSymbol = result.current.symbols[0];

    act(() => {
      result.current.setSelectedSymbol(firstSymbol);
    });

    result.current.trades.forEach((t) => {
      expect(t.symbol).toBe(firstSymbol);
    });
  });

  it("filters trades by date range", () => {
    const { result } = renderHook(() => useTradingData());

    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const to = new Date();

    act(() => {
      result.current.setDateRange({ from, to });
    });

    result.current.trades.forEach((t) => {
      expect(t.exitTime.getTime()).toBeGreaterThanOrEqual(from.getTime());
      expect(t.exitTime.getTime()).toBeLessThanOrEqual(to.getTime());
    });
  });

  it("computes correct stats", () => {
    const { result } = renderHook(() => useTradingData());
    const { stats, trades } = result.current;

    expect(stats.tradeCount).toBe(trades.length);
    expect(stats.winCount + stats.lossCount).toBe(trades.length);
    expect(stats.longCount + stats.shortCount).toBe(trades.length);
    expect(stats.winRate).toBeGreaterThanOrEqual(0);
    expect(stats.winRate).toBeLessThanOrEqual(100);
  });

  it("provides computed data arrays", () => {
    const { result } = renderHook(() => useTradingData());

    expect(Array.isArray(result.current.dailyPnl)).toBe(true);
    expect(Array.isArray(result.current.sessionPerf)).toBe(true);
    expect(Array.isArray(result.current.symbolStats)).toBe(true);
    expect(Array.isArray(result.current.feeBreakdown)).toBe(true);
    expect(Array.isArray(result.current.equityCurve)).toBe(true);
  });

  it("updates symbols list from all trades", () => {
    const { result } = renderHook(() => useTradingData());
    const { symbols, allTrades } = result.current;

    const expectedSymbols = [...new Set(allTrades.map((t) => t.symbol))].sort();
    expect(symbols).toEqual(expectedSymbols);
  });
});
