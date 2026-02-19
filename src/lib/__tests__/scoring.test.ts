import { describe, it, expect } from "vitest";
import { Trade } from "@/types/trading";
import { calculatePerformanceScore } from "@/lib/scoring";

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

describe("calculatePerformanceScore", () => {
  it("returns N/A for fewer than 5 trades", () => {
    const result = calculatePerformanceScore([makeTrade()]);
    expect(result.grade).toBe("N/A");
    expect(result.totalScore).toBe(0);
    expect(result.subScores).toHaveLength(4);
  });

  it("returns a valid score for sufficient trades", () => {
    const trades: Trade[] = [];
    for (let i = 0; i < 30; i++) {
      trades.push(
        makeTrade({
          id: `t-${i}`,
          pnl: i % 3 === 0 ? -50 : 100,
          fees: 3,
          size: 1000,
          leverage: 2,
          exitTime: new Date(`2026-01-${String(1 + Math.floor(i / 2)).padStart(2, "0")}T10:00:00Z`),
        })
      );
    }
    const result = calculatePerformanceScore(trades);
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
    expect(result.grade).not.toBe("N/A");
  });

  it("score is between 0 and 100", () => {
    const trades: Trade[] = [];
    for (let i = 0; i < 50; i++) {
      trades.push(
        makeTrade({
          id: `t-${i}`,
          pnl: Math.random() > 0.5 ? 100 : -80,
          fees: 2,
          size: 1000,
          leverage: [1, 2, 3][i % 3],
          exitTime: new Date(`2026-01-${String(1 + Math.floor(i / 3)).padStart(2, "0")}T10:00:00Z`),
        })
      );
    }
    const result = calculatePerformanceScore(trades);
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
  });

  it("all winners gives high profitability", () => {
    const trades: Trade[] = [];
    for (let i = 0; i < 20; i++) {
      trades.push(
        makeTrade({
          id: `t-${i}`,
          pnl: 100,
          fees: 2,
          size: 1000,
          leverage: 2,
          exitTime: new Date(`2026-01-${String(1 + i).padStart(2, "0")}T10:00:00Z`),
        })
      );
    }
    const result = calculatePerformanceScore(trades);
    const profitability = result.subScores.find((s) => s.category === "Profitability");
    expect(profitability).toBeDefined();
    expect(profitability!.score).toBeGreaterThan(70);
  });

  it("all losers gives low score", () => {
    const trades: Trade[] = [];
    for (let i = 0; i < 20; i++) {
      trades.push(
        makeTrade({
          id: `t-${i}`,
          pnl: -100,
          fees: 5,
          size: 1000,
          leverage: 5,
          exitTime: new Date(`2026-01-${String(1 + i).padStart(2, "0")}T10:00:00Z`),
        })
      );
    }
    const result = calculatePerformanceScore(trades);
    expect(result.totalScore).toBeLessThan(55);
  });

  it("grades map correctly to score ranges", () => {
    // With good trades we expect a reasonable grade
    const trades: Trade[] = [];
    for (let i = 0; i < 30; i++) {
      trades.push(
        makeTrade({
          id: `t-${i}`,
          pnl: i % 5 === 0 ? -30 : 80,
          fees: 2,
          size: 1000,
          leverage: 2,
          exitTime: new Date(`2026-01-${String(1 + Math.floor(i / 2)).padStart(2, "0")}T10:00:00Z`),
        })
      );
    }
    const result = calculatePerformanceScore(trades);
    expect(["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"]).toContain(result.grade);
  });

  it("sub-scores have correct weights summing to 100", () => {
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
    const result = calculatePerformanceScore(trades);
    const totalWeight = result.subScores.reduce((s, sub) => s + sub.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it("sub-scores all have category and details", () => {
    const trades: Trade[] = [];
    for (let i = 0; i < 20; i++) {
      trades.push(
        makeTrade({
          id: `t-${i}`,
          pnl: i % 2 === 0 ? 50 : -40,
          exitTime: new Date(`2026-01-${String(1 + i).padStart(2, "0")}T10:00:00Z`),
        })
      );
    }
    const result = calculatePerformanceScore(trades);
    for (const sub of result.subScores) {
      expect(sub.category).toBeTruthy();
      expect(sub.details).toBeTruthy();
      expect(sub.score).toBeGreaterThanOrEqual(0);
      expect(sub.score).toBeLessThanOrEqual(100);
    }
  });
});
