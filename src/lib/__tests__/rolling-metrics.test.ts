import { describe, it, expect } from "vitest";
import { Trade } from "@/types/trading";
import { calculateRollingMetrics } from "@/lib/rolling-metrics";

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: "test-1",
    symbol: "SOL-PERP",
    side: "long",
    entryPrice: 100,
    exitPrice: 110,
    size: 1000,
    pnl: 100,
    pnlPercent: 10,
    fees: 2,
    entryTime: new Date("2026-01-15T10:00:00Z"),
    exitTime: new Date("2026-01-15T14:00:00Z"),
    orderType: "market",
    notes: "",
    leverage: 2,
    ...overrides,
  };
}

describe("calculateRollingMetrics", () => {
  it("returns empty for fewer than 5 trades", () => {
    const result = calculateRollingMetrics([makeTrade()]);
    expect(result).toEqual([]);
  });

  it("generates data points for sufficient trades", () => {
    const trades: Trade[] = [];
    for (let i = 0; i < 30; i++) {
      trades.push(
        makeTrade({
          id: `t-${i}`,
          pnl: i % 2 === 0 ? 80 : -40,
          exitTime: new Date(`2026-01-${String(1 + i).padStart(2, "0")}T10:00:00Z`),
        })
      );
    }
    const result = calculateRollingMetrics(trades);
    expect(result.length).toBeGreaterThan(0);
  });

  it("all data points have valid date format", () => {
    const trades: Trade[] = [];
    for (let i = 0; i < 20; i++) {
      trades.push(
        makeTrade({
          id: `t-${i}`,
          pnl: 50,
          exitTime: new Date(`2026-01-${String(1 + i).padStart(2, "0")}T10:00:00Z`),
        })
      );
    }
    const result = calculateRollingMetrics(trades);
    for (const point of result) {
      expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("win rates are between 0 and 100", () => {
    const trades: Trade[] = [];
    for (let i = 0; i < 20; i++) {
      trades.push(
        makeTrade({
          id: `t-${i}`,
          pnl: i % 3 === 0 ? -50 : 80,
          exitTime: new Date(`2026-01-${String(1 + i).padStart(2, "0")}T10:00:00Z`),
        })
      );
    }
    const result = calculateRollingMetrics(trades);
    for (const point of result) {
      expect(point.winRate7d).toBeGreaterThanOrEqual(0);
      expect(point.winRate7d).toBeLessThanOrEqual(100);
      expect(point.winRate30d).toBeGreaterThanOrEqual(0);
      expect(point.winRate30d).toBeLessThanOrEqual(100);
    }
  });

  it("profit factor is capped at 5", () => {
    const trades: Trade[] = [];
    for (let i = 0; i < 20; i++) {
      trades.push(
        makeTrade({
          id: `t-${i}`,
          pnl: 100, // all winners
          exitTime: new Date(`2026-01-${String(1 + i).padStart(2, "0")}T10:00:00Z`),
        })
      );
    }
    const result = calculateRollingMetrics(trades);
    for (const point of result) {
      expect(point.profitFactor7d).toBeLessThanOrEqual(5);
      expect(point.profitFactor30d).toBeLessThanOrEqual(5);
    }
  });
});
