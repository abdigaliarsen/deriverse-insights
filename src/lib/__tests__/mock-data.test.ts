import { describe, it, expect } from "vitest";
import {
  generateMockTrades,
  calculateDailyPnl,
  calculateSessionPerformance,
  calculateSymbolStats,
  calculateFeeBreakdown,
  formatCurrency,
  formatPnl,
  formatPercent,
} from "../mock-data";

describe("generateMockTrades", () => {
  it("generates the correct number of trades", () => {
    const trades = generateMockTrades(50);
    expect(trades).toHaveLength(50);
  });

  it("generates trades with valid fields", () => {
    const trades = generateMockTrades(10);
    for (const trade of trades) {
      expect(trade.id).toBeTruthy();
      expect(trade.symbol).toBeTruthy();
      expect(["long", "short"]).toContain(trade.side);
      expect(["market", "limit", "stop"]).toContain(trade.orderType);
      expect(trade.entryPrice).toBeGreaterThan(0);
      expect(trade.exitPrice).toBeGreaterThan(0);
      expect(trade.size).toBeGreaterThan(0);
      expect(trade.fees).toBeGreaterThanOrEqual(0);
      expect(trade.entryTime).toBeInstanceOf(Date);
      expect(trade.exitTime).toBeInstanceOf(Date);
      expect(trade.exitTime.getTime()).toBeGreaterThanOrEqual(trade.entryTime.getTime());
      expect([1, 2, 3, 5, 10]).toContain(trade.leverage);
    }
  });

  it("returns trades sorted by exitTime descending", () => {
    const trades = generateMockTrades(100);
    for (let i = 1; i < trades.length; i++) {
      expect(trades[i - 1].exitTime.getTime()).toBeGreaterThanOrEqual(trades[i].exitTime.getTime());
    }
  });

  it("generates unique trade IDs", () => {
    const trades = generateMockTrades(50);
    const ids = new Set(trades.map((t) => t.id));
    expect(ids.size).toBe(50);
  });
});

describe("calculateDailyPnl", () => {
  it("returns empty array for no trades", () => {
    expect(calculateDailyPnl([])).toEqual([]);
  });

  it("computes cumulative PnL correctly", () => {
    const trades = generateMockTrades(20);
    const daily = calculateDailyPnl(trades);
    expect(daily.length).toBeGreaterThan(0);
    // cumPnl should be running sum
    let sum = 0;
    for (const d of daily) {
      sum += d.pnl;
      expect(Math.abs(d.cumPnl - sum)).toBeLessThan(0.01);
    }
  });

  it("dates are sorted ascending", () => {
    const trades = generateMockTrades(30);
    const daily = calculateDailyPnl(trades);
    for (let i = 1; i < daily.length; i++) {
      expect(daily[i].date >= daily[i - 1].date).toBe(true);
    }
  });
});

describe("calculateSessionPerformance", () => {
  it("returns 3 sessions", () => {
    const trades = generateMockTrades(50);
    const sessions = calculateSessionPerformance(trades);
    expect(sessions).toHaveLength(3);
  });

  it("handles no trades", () => {
    const sessions = calculateSessionPerformance([]);
    expect(sessions).toHaveLength(3);
    sessions.forEach((s) => {
      expect(s.trades).toBe(0);
      expect(s.winRate).toBe(0);
    });
  });
});

describe("calculateSymbolStats", () => {
  it("returns stats for each unique symbol", () => {
    const trades = generateMockTrades(100);
    const stats = calculateSymbolStats(trades);
    const symbols = new Set(trades.map((t) => t.symbol));
    expect(stats.length).toBe(symbols.size);
  });

  it("returns empty for no trades", () => {
    expect(calculateSymbolStats([])).toEqual([]);
  });
});

describe("calculateFeeBreakdown", () => {
  it("returns 3 fee categories", () => {
    const trades = generateMockTrades(20);
    const fees = calculateFeeBreakdown(trades);
    expect(fees).toHaveLength(3);
  });

  it("handles no trades", () => {
    const fees = calculateFeeBreakdown([]);
    expect(fees).toHaveLength(3);
    fees.forEach((f) => {
      expect(f.amount).toBe(0);
      expect(f.percentage).toBe(0);
    });
  });
});

describe("format utilities", () => {
  it("formatCurrency handles K and M", () => {
    expect(formatCurrency(1500)).toBe("1.50K");
    expect(formatCurrency(2500000)).toBe("2.50M");
    expect(formatCurrency(50)).toBe("50.00");
  });

  it("formatPnl adds sign", () => {
    expect(formatPnl(100)).toContain("+");
    expect(formatPnl(-100)).toContain("-");
  });

  it("formatPercent adds sign", () => {
    expect(formatPercent(5.5)).toBe("+5.50%");
    expect(formatPercent(-3.2)).toBe("-3.20%");
  });
});
