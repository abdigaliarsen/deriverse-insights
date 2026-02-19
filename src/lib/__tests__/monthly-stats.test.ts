import { describe, it, expect } from "vitest";
import { Trade } from "@/types/trading";
import { calculateMonthlyStats } from "@/lib/monthly-stats";

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

describe("calculateMonthlyStats", () => {
  it("returns empty for no trades", () => {
    expect(calculateMonthlyStats([])).toEqual([]);
  });

  it("groups trades by month", () => {
    const trades = [
      makeTrade({ id: "t1", exitTime: new Date("2026-01-10T10:00:00Z"), pnl: 100 }),
      makeTrade({ id: "t2", exitTime: new Date("2026-01-20T10:00:00Z"), pnl: 50 }),
      makeTrade({ id: "t3", exitTime: new Date("2026-02-05T10:00:00Z"), pnl: -30 }),
    ];
    const result = calculateMonthlyStats(trades);
    expect(result.length).toBe(2);
    expect(result[0].month).toBe("2026-01");
    expect(result[1].month).toBe("2026-02");
  });

  it("aggregates PnL correctly per month", () => {
    const trades = [
      makeTrade({ id: "t1", exitTime: new Date("2026-01-10T10:00:00Z"), pnl: 100 }),
      makeTrade({ id: "t2", exitTime: new Date("2026-01-20T10:00:00Z"), pnl: 50 }),
    ];
    const result = calculateMonthlyStats(trades);
    expect(result[0].pnl).toBeCloseTo(150);
    expect(result[0].tradeCount).toBe(2);
  });

  it("calculates win rate correctly", () => {
    const trades = [
      makeTrade({ id: "t1", exitTime: new Date("2026-01-10T10:00:00Z"), pnl: 100 }),
      makeTrade({ id: "t2", exitTime: new Date("2026-01-20T10:00:00Z"), pnl: -50 }),
      makeTrade({ id: "t3", exitTime: new Date("2026-01-25T10:00:00Z"), pnl: 30 }),
    ];
    const result = calculateMonthlyStats(trades);
    expect(result[0].winRate).toBeCloseTo(66.67, 1);
  });

  it("identifies best and worst day", () => {
    const trades = [
      makeTrade({ id: "t1", exitTime: new Date("2026-01-10T10:00:00Z"), pnl: 200 }),
      makeTrade({ id: "t2", exitTime: new Date("2026-01-15T10:00:00Z"), pnl: -100 }),
      makeTrade({ id: "t3", exitTime: new Date("2026-01-20T10:00:00Z"), pnl: 50 }),
    ];
    const result = calculateMonthlyStats(trades);
    expect(result[0].bestDay).toBe(200);
    expect(result[0].worstDay).toBe(-100);
  });

  it("generates daily sparkline data", () => {
    const trades = [
      makeTrade({ id: "t1", exitTime: new Date("2026-01-10T10:00:00Z"), pnl: 100 }),
      makeTrade({ id: "t2", exitTime: new Date("2026-01-15T10:00:00Z"), pnl: -50 }),
    ];
    const result = calculateMonthlyStats(trades);
    expect(result[0].dailyPnls.length).toBe(2);
  });

  it("sorts months chronologically", () => {
    const trades = [
      makeTrade({ id: "t1", exitTime: new Date("2026-03-10T10:00:00Z") }),
      makeTrade({ id: "t2", exitTime: new Date("2026-01-10T10:00:00Z") }),
    ];
    const result = calculateMonthlyStats(trades);
    expect(result[0].month < result[1].month).toBe(true);
  });
});
