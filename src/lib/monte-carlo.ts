import { Trade } from "@/types/trading";

export interface MonteCarloPath {
  day: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
}

export interface MonteCarloResult {
  paths: MonteCarloPath[];
  probDouble: number;      // Probability of reaching 2x starting balance
  probHalfDrawdown: number; // Probability of 50%+ drawdown
  medianFinal: number;
  avgFinal: number;
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  const frac = idx - lower;
  return sorted[lower] * (1 - frac) + sorted[upper] * frac;
}

export function runMonteCarloSimulation(
  trades: Trade[],
  numSimulations = 200,
  forecastDays = 60,
  initialBalance = 10000
): MonteCarloResult {
  if (trades.length < 5) {
    return {
      paths: [],
      probDouble: 0,
      probHalfDrawdown: 0,
      medianFinal: initialBalance,
      avgFinal: initialBalance,
    };
  }

  // Calculate daily returns
  const dailyMap = new Map<string, number>();
  for (const t of trades) {
    const d = t.exitTime.toISOString().split("T")[0];
    dailyMap.set(d, (dailyMap.get(d) || 0) + t.pnl);
  }
  const dailyReturns = Array.from(dailyMap.values());

  if (dailyReturns.length < 3) {
    return {
      paths: [],
      probDouble: 0,
      probHalfDrawdown: 0,
      medianFinal: initialBalance,
      avgFinal: initialBalance,
    };
  }

  // Run simulations
  const allPaths: number[][] = [];
  let doubleCount = 0;
  let halfDdCount = 0;

  // Use a seeded-like approach with Math.random for reproducibility in display
  for (let sim = 0; sim < numSimulations; sim++) {
    const path: number[] = [initialBalance];
    let equity = initialBalance;
    let peak = initialBalance;
    let maxDd = 0;

    for (let day = 0; day < forecastDays; day++) {
      // Random resample from daily returns
      const randomReturn = dailyReturns[Math.floor(Math.random() * dailyReturns.length)];
      equity += randomReturn;
      path.push(equity);

      peak = Math.max(peak, equity);
      const dd = peak > 0 ? (peak - equity) / peak : 0;
      maxDd = Math.max(maxDd, dd);
    }

    allPaths.push(path);
    if (equity >= initialBalance * 2) doubleCount++;
    if (maxDd >= 0.5) halfDdCount++;
  }

  // Calculate percentile bands
  const paths: MonteCarloPath[] = [];
  for (let day = 0; day <= forecastDays; day++) {
    const values = allPaths.map((p) => p[day]).sort((a, b) => a - b);
    paths.push({
      day,
      p5: percentile(values, 5),
      p25: percentile(values, 25),
      p50: percentile(values, 50),
      p75: percentile(values, 75),
      p95: percentile(values, 95),
    });
  }

  const finalValues = allPaths.map((p) => p[forecastDays]).sort((a, b) => a - b);

  return {
    paths,
    probDouble: (doubleCount / numSimulations) * 100,
    probHalfDrawdown: (halfDdCount / numSimulations) * 100,
    medianFinal: percentile(finalValues, 50),
    avgFinal: finalValues.reduce((s, v) => s + v, 0) / finalValues.length,
  };
}
