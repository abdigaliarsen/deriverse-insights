import { describe, it, expect } from "vitest";
import { Trade } from "@/types/trading";
import {
  calculateCalendarData,
  calculateTimeOfDay,
  calculateEquityCurve,
  calculateLeverageAnalysis,
  calculatePnlDistribution,
  calculatePeriodComparison,
  calculateCumulativeFees,
} from "@/lib/analytics";

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

function makeTrades(count: number): Trade[] {
  const trades: Trade[] = [];
  for (let i = 0; i < count; i++) {
    const day = Math.floor(i / 3);
    trades.push(
      makeTrade({
        id: `trade-${i}`,
        pnl: i % 3 === 0 ? -50 : 100,
        fees: 2 + i * 0.5,
        entryTime: new Date(`2026-01-${String(10 + day).padStart(2, "0")}T${String(8 + (i % 12)).padStart(2, "0")}:00:00Z`),
        exitTime: new Date(`2026-01-${String(10 + day).padStart(2, "0")}T${String(10 + (i % 12)).padStart(2, "0")}:00:00Z`),
        leverage: [1, 2, 3, 5, 10][i % 5],
        symbol: ["SOL-PERP", "BTC-PERP", "ETH-PERP"][i % 3],
      })
    );
  }
  return trades;
}

describe("calculateCalendarData", () => {
  it("returns empty array for no trades", () => {
    expect(calculateCalendarData([])).toEqual([]);
  });

  it("aggregates PnL by day", () => {
    const trades = [
      makeTrade({ exitTime: new Date("2026-01-15T10:00:00Z"), pnl: 50 }),
      makeTrade({ id: "t2", exitTime: new Date("2026-01-15T14:00:00Z"), pnl: 30 }),
      makeTrade({ id: "t3", exitTime: new Date("2026-01-16T10:00:00Z"), pnl: -20 }),
    ];
    const result = calculateCalendarData(trades);
    expect(result.length).toBe(2);
    expect(result[0].pnl).toBeCloseTo(80);
    expect(result[0].tradeCount).toBe(2);
    expect(result[1].pnl).toBeCloseTo(-20);
  });

  it("sorts results chronologically", () => {
    const trades = [
      makeTrade({ id: "t1", exitTime: new Date("2026-01-20T10:00:00Z"), pnl: 10 }),
      makeTrade({ id: "t2", exitTime: new Date("2026-01-10T10:00:00Z"), pnl: 20 }),
    ];
    const result = calculateCalendarData(trades);
    expect(result[0].date < result[1].date).toBe(true);
  });
});

describe("calculateTimeOfDay", () => {
  it("returns 168 cells (7×24)", () => {
    const result = calculateTimeOfDay([]);
    expect(result.cells.length).toBe(168);
  });

  it("identifies best and worst hour", () => {
    const trades = makeTrades(20);
    const result = calculateTimeOfDay(trades);
    expect(result.bestHour).not.toBeNull();
    expect(result.worstHour).not.toBeNull();
    if (result.bestHour && result.worstHour) {
      expect(result.bestHour.pnl).toBeGreaterThanOrEqual(result.worstHour.pnl);
    }
  });

  it("returns null for best/worst with no trades", () => {
    const result = calculateTimeOfDay([]);
    expect(result.bestHour).toBeNull();
    expect(result.worstHour).toBeNull();
  });
});

describe("calculateEquityCurve", () => {
  it("starts at initial balance", () => {
    const trades = [makeTrade({ pnl: 100 })];
    const result = calculateEquityCurve(trades, 5000);
    expect(result[0].equity).toBe(5100);
    expect(result[0].highWaterMark).toBe(5100);
  });

  it("tracks high water mark", () => {
    const trades = [
      makeTrade({ id: "t1", exitTime: new Date("2026-01-10T10:00:00Z"), pnl: 500 }),
      makeTrade({ id: "t2", exitTime: new Date("2026-01-11T10:00:00Z"), pnl: -200 }),
    ];
    const result = calculateEquityCurve(trades, 10000);
    expect(result[0].highWaterMark).toBe(10500);
    expect(result[1].equity).toBe(10300);
    expect(result[1].highWaterMark).toBe(10500);
  });

  it("returns empty for no trades", () => {
    expect(calculateEquityCurve([])).toEqual([]);
  });
});

describe("calculateLeverageAnalysis", () => {
  it("groups by leverage level", () => {
    const trades = makeTrades(15);
    const result = calculateLeverageAnalysis(trades);
    expect(result.length).toBeGreaterThan(0);
    for (const bracket of result) {
      expect(bracket.trades).toBeGreaterThan(0);
      expect(bracket.winRate).toBeGreaterThanOrEqual(0);
      expect(bracket.winRate).toBeLessThanOrEqual(100);
    }
  });

  it("returns sorted by leverage", () => {
    const trades = makeTrades(15);
    const result = calculateLeverageAnalysis(trades);
    for (let i = 1; i < result.length; i++) {
      expect(parseInt(result[i].leverage) >= parseInt(result[i - 1].leverage)).toBe(true);
    }
  });
});

describe("calculatePnlDistribution", () => {
  it("returns empty for no trades", () => {
    expect(calculatePnlDistribution([])).toEqual([]);
  });

  it("creates correct number of buckets", () => {
    const trades = makeTrades(20);
    const result = calculatePnlDistribution(trades, 10);
    expect(result.length).toBe(10);
  });

  it("total count matches trade count", () => {
    const trades = makeTrades(20);
    const result = calculatePnlDistribution(trades);
    const totalCount = result.reduce((s, b) => s + b.count, 0);
    expect(totalCount).toBe(20);
  });
});

describe("calculatePeriodComparison", () => {
  it("returns null for fewer than 2 trades", () => {
    expect(calculatePeriodComparison([makeTrade()])).toBeNull();
    expect(calculatePeriodComparison([])).toBeNull();
  });

  it("splits trades into equal halves", () => {
    const trades = makeTrades(20);
    const result = calculatePeriodComparison(trades);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.first.tradeCount + result.second.tradeCount).toBe(20);
    }
  });
});

describe("calculateCumulativeFees", () => {
  it("returns empty for no trades", () => {
    expect(calculateCumulativeFees([])).toEqual([]);
  });

  it("accumulates fees correctly", () => {
    const trades = [
      makeTrade({ id: "t1", exitTime: new Date("2026-01-10T10:00:00Z"), fees: 10 }),
      makeTrade({ id: "t2", exitTime: new Date("2026-01-11T10:00:00Z"), fees: 20 }),
    ];
    const result = calculateCumulativeFees(trades);
    expect(result.length).toBe(2);
    expect(result[0].cumFees).toBeCloseTo(10);
    expect(result[1].cumFees).toBeCloseTo(30);
  });
});
