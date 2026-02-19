import { Trade } from "@/types/trading";

export function exportTradesToCSV(trades: Trade[]): string {
  const headers = [
    "ID", "Symbol", "Side", "Order Type", "Leverage", "Size",
    "Entry Price", "Exit Price", "PnL", "PnL %", "Fees",
    "Entry Time", "Exit Time", "Notes",
  ];

  const rows = trades.map((t) => [
    t.id,
    t.symbol,
    t.side,
    t.orderType,
    t.leverage.toString(),
    t.size.toFixed(2),
    t.entryPrice.toFixed(2),
    t.exitPrice.toFixed(2),
    t.pnl.toFixed(2),
    t.pnlPercent.toFixed(2),
    t.fees.toFixed(2),
    t.entryTime.toISOString(),
    t.exitTime.toISOString(),
    `"${(t.notes || "").replace(/"/g, '""')}"`,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function exportTradesToJSON(
  trades: Trade[],
  stats: Record<string, unknown>,
): string {
  const data = {
    exportDate: new Date().toISOString(),
    tradeCount: trades.length,
    stats,
    trades: trades.map((t) => ({
      ...t,
      entryTime: t.entryTime.toISOString(),
      exitTime: t.exitTime.toISOString(),
    })),
  };
  return JSON.stringify(data, null, 2);
}

export function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
