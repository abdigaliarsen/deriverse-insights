import { describe, it, expect } from "vitest";
import { Trade } from "@/types/trading";
import { generateInsights } from "@/lib/insights";

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

function makeManyTrades(): Trade[] {
  const trades: Trade[] = [];
  const symbols = ["SOL-PERP", "BTC-PERP", "ETH-PERP"];
  for (let i = 0; i < 50; i++) {
    const day = Math.floor(i / 3);
    const hour = 8 + (i % 12);
    const isWin = i % 3 !== 0;
    trades.push(
      makeTrade({
        id: `trade-${i}`,
        symbol: symbols[i % 3],
        pnl: isWin ? 50 + Math.random() * 200 : -(30 + Math.random() * 150),
        fees: 3 + Math.random() * 5,
        size: 500 + Math.random() * 5000,
        leverage: [1, 2, 3, 5, 10][i % 5],
        entryTime: new Date(`2026-01-${String(5 + day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00Z`),
        exitTime: new Date(`2026-01-${String(5 + day).padStart(2, "0")}T${String(hour + 1).padStart(2, "0")}:30:00Z`),
      })
    );
  }
  return trades;
}

describe("generateInsights", () => {
  it("returns empty for fewer than 5 trades", () => {
    const trades = [makeTrade(), makeTrade({ id: "t2" })];
    expect(generateInsights(trades)).toEqual([]);
  });

  it("generates insights for sufficient trades", () => {
    const trades = makeManyTrades();
    const insights = generateInsights(trades);
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.length).toBeLessThanOrEqual(8);
  });

  it("all insights have required fields", () => {
    const trades = makeManyTrades();
    const insights = generateInsights(trades);
    for (const insight of insights) {
      expect(insight.id).toBeTruthy();
      expect(insight.title).toBeTruthy();
      expect(insight.description).toBeTruthy();
      expect(insight.value).toBeTruthy();
      expect(insight.icon).toBeTruthy();
      expect(["positive", "warning", "info"]).toContain(insight.severity);
    }
  });

  it("includes best day insight when data has distinct days", () => {
    const trades = makeManyTrades();
    const insights = generateInsights(trades);
    const hasDay = insights.some((i) => i.id === "best-day" || i.id === "worst-day");
    expect(hasDay).toBe(true);
  });

  it("includes leverage insight when data has mixed leverage", () => {
    const trades = makeManyTrades();
    const insights = generateInsights(trades);
    const hasLeverage = insights.some((i) => i.id === "leverage-impact");
    expect(hasLeverage).toBe(true);
  });

  it("includes fee impact insight", () => {
    const trades = makeManyTrades();
    const insights = generateInsights(trades);
    const hasFee = insights.some((i) => i.id === "fee-impact");
    expect(hasFee).toBe(true);
  });

  it("includes best symbol insight", () => {
    const trades = makeManyTrades();
    const insights = generateInsights(trades);
    const hasSymbol = insights.some((i) => i.id === "best-symbol");
    expect(hasSymbol).toBe(true);
  });
});
