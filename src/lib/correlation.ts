import { Trade } from "@/types/trading";

export interface CorrelationEntry {
  symbolA: string;
  symbolB: string;
  correlation: number;
  overlapDays: number;
}

export interface CorrelationResult {
  symbols: string[];
  matrix: number[][];
  entries: CorrelationEntry[];
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;

  const meanX = x.reduce((s, v) => s + v, 0) / n;
  const meanY = y.reduce((s, v) => s + v, 0) / n;

  let num = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  return denom > 0 ? num / denom : 0;
}

export function calculateCorrelationMatrix(trades: Trade[]): CorrelationResult {
  if (trades.length < 5) {
    return { symbols: [], matrix: [], entries: [] };
  }

  // Build daily PnL per symbol
  const symbolDailyPnl = new Map<string, Map<string, number>>();
  const allDates = new Set<string>();

  for (const t of trades) {
    const d = t.exitTime.toISOString().split("T")[0];
    allDates.add(d);
    if (!symbolDailyPnl.has(t.symbol)) {
      symbolDailyPnl.set(t.symbol, new Map());
    }
    const dayMap = symbolDailyPnl.get(t.symbol)!;
    dayMap.set(d, (dayMap.get(d) || 0) + t.pnl);
  }

  const symbols = Array.from(symbolDailyPnl.keys()).sort();
  if (symbols.length < 2) {
    return { symbols, matrix: [[1]], entries: [] };
  }

  const dates = Array.from(allDates).sort();
  const matrix: number[][] = [];
  const entries: CorrelationEntry[] = [];

  for (let i = 0; i < symbols.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < symbols.length; j++) {
      if (i === j) {
        matrix[i][j] = 1;
        continue;
      }

      const mapA = symbolDailyPnl.get(symbols[i])!;
      const mapB = symbolDailyPnl.get(symbols[j])!;

      // Find overlapping dates
      const overlapDates = dates.filter((d) => mapA.has(d) && mapB.has(d));
      if (overlapDates.length < 3) {
        matrix[i][j] = 0;
        if (i < j) {
          entries.push({
            symbolA: symbols[i],
            symbolB: symbols[j],
            correlation: 0,
            overlapDays: overlapDates.length,
          });
        }
        continue;
      }

      const xVals = overlapDates.map((d) => mapA.get(d) || 0);
      const yVals = overlapDates.map((d) => mapB.get(d) || 0);
      const corr = pearsonCorrelation(xVals, yVals);

      matrix[i][j] = corr;
      if (i < j) {
        entries.push({
          symbolA: symbols[i],
          symbolB: symbols[j],
          correlation: corr,
          overlapDays: overlapDates.length,
        });
      }
    }
  }

  return { symbols, matrix, entries };
}
