import { describe, it, expect } from "vitest";
import { Trade } from "@/types/trading";
import { runMonteCarloSimulation } from "@/lib/monte-carlo";

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

describe("runMonteCarloSimulation", () => {
  it("returns empty paths for fewer than 5 trades", () => {
    const result = runMonteCarloSimulation([makeTrade()]);
    expect(result.paths).toEqual([]);
    expect(result.medianFinal).toBe(10000);
  });

  it("generates correct number of path points", () => {
    const trades: Trade[] = [];
    for (let i = 0; i < 20; i++) {
      trades.push(
        makeTrade({
          id: `t-${i}`,
          pnl: i % 2 === 0 ? 50 : -30,
          exitTime: new Date(`2026-01-${String(1 + i).padStart(2, "0")}T10:00:00Z`),
        })
      );
    }
    const result = runMonteCarloSimulation(trades, 50, 30);
    expect(result.paths.length).toBe(31); // 0 to 30 inclusive
    expect(result.paths[0].day).toBe(0);
    expect(result.paths[30].day).toBe(30);
  });

  it("starts from initial balance", () => {
    const trades: Trade[] = [];
    for (let i = 0; i < 20; i++) {
      trades.push(
        makeTrade({
          id: `t-${i}`,
          pnl: 10,
          exitTime: new Date(`2026-01-${String(1 + i).padStart(2, "0")}T10:00:00Z`),
        })
      );
    }
    const result = runMonteCarloSimulation(trades, 50, 30, 5000);
    expect(result.paths[0].p50).toBe(5000);
  });

  it("percentiles are in order", () => {
    const trades: Trade[] = [];
    for (let i = 0; i < 30; i++) {
      trades.push(
        makeTrade({
          id: `t-${i}`,
          pnl: i % 3 === 0 ? -100 : 80,
          exitTime: new Date(`2026-01-${String(1 + Math.floor(i / 2)).padStart(2, "0")}T10:00:00Z`),
        })
      );
    }
    const result = runMonteCarloSimulation(trades, 100, 30);
    for (const point of result.paths) {
      expect(point.p5).toBeLessThanOrEqual(point.p25);
      expect(point.p25).toBeLessThanOrEqual(point.p50);
      expect(point.p50).toBeLessThanOrEqual(point.p75);
      expect(point.p75).toBeLessThanOrEqual(point.p95);
    }
  });

  it("probabilities are between 0 and 100", () => {
    const trades: Trade[] = [];
    for (let i = 0; i < 20; i++) {
      trades.push(
        makeTrade({
          id: `t-${i}`,
          pnl: 30,
          exitTime: new Date(`2026-01-${String(1 + i).padStart(2, "0")}T10:00:00Z`),
        })
      );
    }
    const result = runMonteCarloSimulation(trades, 100, 30);
    expect(result.probDouble).toBeGreaterThanOrEqual(0);
    expect(result.probDouble).toBeLessThanOrEqual(100);
    expect(result.probHalfDrawdown).toBeGreaterThanOrEqual(0);
    expect(result.probHalfDrawdown).toBeLessThanOrEqual(100);
  });
});
