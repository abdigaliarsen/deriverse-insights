import { describe, it, expect } from "vitest";
import { exportTradesToCSV, exportTradesToJSON } from "../export";
import { Trade } from "@/types/trading";

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: "trade-0001",
    symbol: "SOL-PERP",
    side: "long",
    entryPrice: 150,
    exitPrice: 160,
    size: 5000,
    pnl: 333.33,
    pnlPercent: 6.67,
    fees: 5.0,
    entryTime: new Date("2025-01-15T10:00:00Z"),
    exitTime: new Date("2025-01-15T14:00:00Z"),
    orderType: "market",
    notes: "test note",
    leverage: 3,
    ...overrides,
  };
}

describe("exportTradesToCSV", () => {
  it("produces valid CSV with headers", () => {
    const csv = exportTradesToCSV([makeTrade()]);
    const lines = csv.split("\n");
    expect(lines.length).toBe(2); // header + 1 row
    expect(lines[0]).toContain("ID");
    expect(lines[0]).toContain("Symbol");
    expect(lines[0]).toContain("PnL");
  });

  it("handles empty trades", () => {
    const csv = exportTradesToCSV([]);
    const lines = csv.split("\n");
    expect(lines.length).toBe(1); // header only
  });

  it("escapes quotes in notes", () => {
    const trade = makeTrade({ notes: 'a "quoted" note' });
    const csv = exportTradesToCSV([trade]);
    expect(csv).toContain('""quoted""');
  });

  it("includes all trade data", () => {
    const trade = makeTrade();
    const csv = exportTradesToCSV([trade]);
    expect(csv).toContain("SOL-PERP");
    expect(csv).toContain("long");
    expect(csv).toContain("333.33");
  });
});

describe("exportTradesToJSON", () => {
  it("produces valid JSON", () => {
    const json = exportTradesToJSON([makeTrade()], { totalPnl: 100 });
    const parsed = JSON.parse(json);
    expect(parsed.tradeCount).toBe(1);
    expect(parsed.stats.totalPnl).toBe(100);
    expect(parsed.trades).toHaveLength(1);
  });

  it("serializes dates as ISO strings", () => {
    const json = exportTradesToJSON([makeTrade()], {});
    const parsed = JSON.parse(json);
    expect(parsed.trades[0].entryTime).toContain("2025-01-15");
  });

  it("includes export date", () => {
    const json = exportTradesToJSON([], {});
    const parsed = JSON.parse(json);
    expect(parsed.exportDate).toBeTruthy();
  });
});
