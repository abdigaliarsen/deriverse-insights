import { describe, it, expect } from "vitest";
import { calculateRiskMetrics, calculateStreaks } from "../risk-metrics";
import { Trade } from "@/types/trading";

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: `t-${Math.random()}`,
    symbol: "SOL-PERP",
    side: "long",
    entryPrice: 100,
    exitPrice: 110,
    size: 1000,
    pnl: 100,
    pnlPercent: 10,
    fees: 1,
    entryTime: new Date("2025-01-01"),
    exitTime: new Date("2025-01-02"),
    orderType: "market",
    notes: "",
    leverage: 1,
    ...overrides,
  };
}

describe("calculateRiskMetrics", () => {
  it("returns zeros for no trades", () => {
    const m = calculateRiskMetrics([]);
    expect(m.sharpeRatio).toBe(0);
    expect(m.sortinoRatio).toBe(0);
    expect(m.maxDrawdownPercent).toBe(0);
    expect(m.expectancy).toBe(0);
    expect(m.kellyFraction).toBe(0);
    expect(m.profitFactor).toBe(0);
  });

  it("handles all winning trades", () => {
    const trades = [
      makeTrade({ pnl: 100, exitTime: new Date("2025-01-01") }),
      makeTrade({ pnl: 200, exitTime: new Date("2025-01-02") }),
      makeTrade({ pnl: 50, exitTime: new Date("2025-01-03") }),
    ];
    const m = calculateRiskMetrics(trades);
    expect(m.profitFactor).toBe(Infinity);
    expect(m.maxDrawdownPercent).toBe(0);
    expect(m.expectancy).toBeGreaterThan(0);
  });

  it("handles all losing trades", () => {
    const trades = [
      makeTrade({ pnl: -100, exitTime: new Date("2025-01-01") }),
      makeTrade({ pnl: -200, exitTime: new Date("2025-01-02") }),
      makeTrade({ pnl: -50, exitTime: new Date("2025-01-03") }),
    ];
    const m = calculateRiskMetrics(trades);
    expect(m.profitFactor).toBe(0);
    expect(m.expectancy).toBeLessThan(0);
  });

  it("computes positive sharpe for winning portfolio", () => {
    const trades = Array.from({ length: 20 }, (_, i) =>
      makeTrade({
        pnl: i % 3 === 0 ? -50 : 200,
        exitTime: new Date(2025, 0, i + 1),
      }),
    );
    const m = calculateRiskMetrics(trades);
    expect(m.sharpeRatio).toBeGreaterThan(0);
  });

  it("computes max drawdown correctly", () => {
    const trades = [
      makeTrade({ pnl: 100, exitTime: new Date("2025-01-01") }),
      makeTrade({ pnl: -200, exitTime: new Date("2025-01-02") }),
      makeTrade({ pnl: 50, exitTime: new Date("2025-01-03") }),
    ];
    const m = calculateRiskMetrics(trades);
    expect(m.maxDrawdownPercent).toBeGreaterThan(0);
  });
});

describe("calculateStreaks", () => {
  it("returns zeros for no trades", () => {
    const s = calculateStreaks([]);
    expect(s.currentStreak.type).toBe("none");
    expect(s.longestWinStreak).toBe(0);
    expect(s.longestLossStreak).toBe(0);
    expect(s.last20).toEqual([]);
  });

  it("computes correct win streak", () => {
    const trades = [
      makeTrade({ pnl: 100, exitTime: new Date("2025-01-01") }),
      makeTrade({ pnl: 100, exitTime: new Date("2025-01-02") }),
      makeTrade({ pnl: 100, exitTime: new Date("2025-01-03") }),
      makeTrade({ pnl: -50, exitTime: new Date("2025-01-04") }),
    ];
    const s = calculateStreaks(trades);
    expect(s.longestWinStreak).toBe(3);
    expect(s.currentStreak.type).toBe("loss");
    expect(s.currentStreak.count).toBe(1);
  });

  it("computes correct loss streak", () => {
    const trades = [
      makeTrade({ pnl: -100, exitTime: new Date("2025-01-01") }),
      makeTrade({ pnl: -100, exitTime: new Date("2025-01-02") }),
      makeTrade({ pnl: -100, exitTime: new Date("2025-01-03") }),
      makeTrade({ pnl: -100, exitTime: new Date("2025-01-04") }),
      makeTrade({ pnl: 100, exitTime: new Date("2025-01-05") }),
    ];
    const s = calculateStreaks(trades);
    expect(s.longestLossStreak).toBe(4);
    expect(s.currentStreak.type).toBe("win");
    expect(s.currentStreak.count).toBe(1);
  });

  it("returns last 20 outcomes", () => {
    const trades = Array.from({ length: 30 }, (_, i) =>
      makeTrade({
        pnl: i % 2 === 0 ? 100 : -50,
        exitTime: new Date(2025, 0, i + 1),
      }),
    );
    const s = calculateStreaks(trades);
    expect(s.last20).toHaveLength(20);
    s.last20.forEach((outcome) => {
      expect(["win", "loss"]).toContain(outcome);
    });
  });
});
