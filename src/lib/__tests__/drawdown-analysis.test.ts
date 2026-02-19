import { describe, it, expect } from "vitest";
import { Trade } from "@/types/trading";
import { analyzeDrawdowns } from "@/lib/drawdown-analysis";

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

describe("analyzeDrawdowns", () => {
  it("returns empty for fewer than 3 trades", () => {
    const result = analyzeDrawdowns([makeTrade()]);
    expect(result.events).toEqual([]);
    expect(result.currentDrawdown.active).toBe(false);
  });

  it("detects drawdown events", () => {
    const trades = [
      makeTrade({ id: "t1", pnl: 500, exitTime: new Date("2026-01-01T10:00:00Z") }),
      makeTrade({ id: "t2", pnl: 500, exitTime: new Date("2026-01-02T10:00:00Z") }),
      makeTrade({ id: "t3", pnl: -800, exitTime: new Date("2026-01-03T10:00:00Z") }),
      makeTrade({ id: "t4", pnl: -500, exitTime: new Date("2026-01-04T10:00:00Z") }),
      makeTrade({ id: "t5", pnl: 600, exitTime: new Date("2026-01-05T10:00:00Z") }),
      makeTrade({ id: "t6", pnl: 600, exitTime: new Date("2026-01-06T10:00:00Z") }),
      makeTrade({ id: "t7", pnl: 600, exitTime: new Date("2026-01-07T10:00:00Z") }),
    ];
    const result = analyzeDrawdowns(trades);
    // Should detect the drawdown from day 3-4
    expect(result.maxDepth).toBeGreaterThan(0);
  });

  it("all winning trades have no significant drawdowns", () => {
    const trades: Trade[] = [];
    for (let i = 0; i < 10; i++) {
      trades.push(
        makeTrade({
          id: `t-${i}`,
          pnl: 100,
          exitTime: new Date(`2026-01-${String(1 + i).padStart(2, "0")}T10:00:00Z`),
        })
      );
    }
    const result = analyzeDrawdowns(trades);
    expect(result.events.length).toBe(0);
    expect(result.maxDepth).toBe(0);
  });

  it("all losing trades show drawdown", () => {
    const trades: Trade[] = [];
    for (let i = 0; i < 10; i++) {
      trades.push(
        makeTrade({
          id: `t-${i}`,
          pnl: -200,
          exitTime: new Date(`2026-01-${String(1 + i).padStart(2, "0")}T10:00:00Z`),
        })
      );
    }
    const result = analyzeDrawdowns(trades);
    expect(result.currentDrawdown.active).toBe(true);
    expect(result.currentDrawdown.depthPercent).toBeGreaterThan(0);
  });

  it("summary stats are non-negative", () => {
    const trades: Trade[] = [];
    for (let i = 0; i < 30; i++) {
      trades.push(
        makeTrade({
          id: `t-${i}`,
          pnl: i % 3 === 0 ? -300 : 150,
          exitTime: new Date(`2026-01-${String(1 + Math.floor(i / 2)).padStart(2, "0")}T10:00:00Z`),
        })
      );
    }
    const result = analyzeDrawdowns(trades);
    expect(result.avgDepth).toBeGreaterThanOrEqual(0);
    expect(result.avgRecoveryDays).toBeGreaterThanOrEqual(0);
    expect(result.maxDepth).toBeGreaterThanOrEqual(0);
    expect(result.frequency).toBeGreaterThanOrEqual(0);
  });
});
