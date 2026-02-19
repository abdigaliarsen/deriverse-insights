import { describe, it, expect } from "vitest";
import { Trade } from "@/types/trading";
import { calculateCorrelationMatrix } from "@/lib/correlation";

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

describe("calculateCorrelationMatrix", () => {
  it("returns empty for no trades", () => {
    const result = calculateCorrelationMatrix([]);
    expect(result.symbols).toEqual([]);
    expect(result.matrix).toEqual([]);
  });

  it("returns empty entries for single symbol", () => {
    const trades = [
      makeTrade({ id: "t1", exitTime: new Date("2026-01-10T10:00:00Z") }),
      makeTrade({ id: "t2", exitTime: new Date("2026-01-11T10:00:00Z") }),
      makeTrade({ id: "t3", exitTime: new Date("2026-01-12T10:00:00Z") }),
      makeTrade({ id: "t4", exitTime: new Date("2026-01-13T10:00:00Z") }),
      makeTrade({ id: "t5", exitTime: new Date("2026-01-14T10:00:00Z") }),
    ];
    const result = calculateCorrelationMatrix(trades);
    expect(result.symbols).toHaveLength(1);
    expect(result.entries).toHaveLength(0);
  });

  it("diagonal is always 1", () => {
    const trades: Trade[] = [];
    for (let i = 0; i < 20; i++) {
      trades.push(
        makeTrade({
          id: `t-${i}`,
          symbol: ["SOL-PERP", "BTC-PERP"][i % 2],
          pnl: i % 3 === 0 ? -50 : 100,
          exitTime: new Date(`2026-01-${String(5 + Math.floor(i / 2)).padStart(2, "0")}T10:00:00Z`),
        })
      );
    }
    const result = calculateCorrelationMatrix(trades);
    for (let i = 0; i < result.symbols.length; i++) {
      expect(result.matrix[i][i]).toBe(1);
    }
  });

  it("matrix is symmetric", () => {
    const trades: Trade[] = [];
    for (let i = 0; i < 30; i++) {
      trades.push(
        makeTrade({
          id: `t-${i}`,
          symbol: ["SOL-PERP", "BTC-PERP", "ETH-PERP"][i % 3],
          pnl: (i % 3 === 0 ? -1 : 1) * (50 + i),
          exitTime: new Date(`2026-01-${String(5 + Math.floor(i / 3)).padStart(2, "0")}T10:00:00Z`),
        })
      );
    }
    const result = calculateCorrelationMatrix(trades);
    for (let i = 0; i < result.symbols.length; i++) {
      for (let j = 0; j < result.symbols.length; j++) {
        expect(result.matrix[i][j]).toBeCloseTo(result.matrix[j][i], 5);
      }
    }
  });

  it("correlation values between -1 and 1", () => {
    const trades: Trade[] = [];
    for (let i = 0; i < 30; i++) {
      trades.push(
        makeTrade({
          id: `t-${i}`,
          symbol: ["SOL-PERP", "BTC-PERP"][i % 2],
          pnl: Math.random() * 200 - 100,
          exitTime: new Date(`2026-01-${String(5 + Math.floor(i / 2)).padStart(2, "0")}T10:00:00Z`),
        })
      );
    }
    const result = calculateCorrelationMatrix(trades);
    for (const entry of result.entries) {
      expect(entry.correlation).toBeGreaterThanOrEqual(-1);
      expect(entry.correlation).toBeLessThanOrEqual(1);
    }
  });
});
