import { describe, it, expect } from "vitest";
import { Trade } from "@/types/trading";
import { calculateWinLossProfile } from "@/lib/trade-profile";

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
    fees: 5,
    entryTime: new Date("2026-01-15T10:00:00Z"),
    exitTime: new Date("2026-01-15T14:00:00Z"),
    orderType: "market",
    notes: "",
    leverage: 2,
    ...overrides,
  };
}

describe("calculateWinLossProfile", () => {
  it("separates winners from losers", () => {
    const trades = [
      makeTrade({ id: "t1", pnl: 100 }),
      makeTrade({ id: "t2", pnl: 200 }),
      makeTrade({ id: "t3", pnl: -50 }),
    ];
    const result = calculateWinLossProfile(trades);
    expect(result.winners.count).toBe(2);
    expect(result.losers.count).toBe(1);
  });

  it("handles all winners", () => {
    const trades = [
      makeTrade({ id: "t1", pnl: 100 }),
      makeTrade({ id: "t2", pnl: 200 }),
    ];
    const result = calculateWinLossProfile(trades);
    expect(result.winners.count).toBe(2);
    expect(result.losers.count).toBe(0);
    expect(result.losers.avgSize).toBe(0);
  });

  it("handles all losers", () => {
    const trades = [
      makeTrade({ id: "t1", pnl: -50 }),
      makeTrade({ id: "t2", pnl: -100 }),
    ];
    const result = calculateWinLossProfile(trades);
    expect(result.winners.count).toBe(0);
    expect(result.losers.count).toBe(2);
  });

  it("calculates average size correctly", () => {
    const trades = [
      makeTrade({ id: "t1", pnl: 100, size: 1000 }),
      makeTrade({ id: "t2", pnl: 200, size: 2000 }),
      makeTrade({ id: "t3", pnl: -50, size: 3000 }),
    ];
    const result = calculateWinLossProfile(trades);
    expect(result.winners.avgSize).toBeCloseTo(1500);
    expect(result.losers.avgSize).toBeCloseTo(3000);
  });

  it("identifies most common symbol", () => {
    const trades = [
      makeTrade({ id: "t1", pnl: 100, symbol: "SOL-PERP" }),
      makeTrade({ id: "t2", pnl: 200, symbol: "SOL-PERP" }),
      makeTrade({ id: "t3", pnl: 50, symbol: "BTC-PERP" }),
    ];
    const result = calculateWinLossProfile(trades);
    expect(result.winners.mostCommonSymbol).toBe("SOL-PERP");
  });

  it("handles empty trades", () => {
    const result = calculateWinLossProfile([]);
    expect(result.winners.count).toBe(0);
    expect(result.losers.count).toBe(0);
  });
});
