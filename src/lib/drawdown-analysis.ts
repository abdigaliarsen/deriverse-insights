import { Trade } from "@/types/trading";

export interface DrawdownEvent {
  startDate: string;
  bottomDate: string;
  recoveryDate: string | null;
  depthPercent: number;
  depthAbsolute: number;
  durationDays: number;
  recoveryDays: number | null;
}

export interface DrawdownSummary {
  events: DrawdownEvent[];
  avgDepth: number;
  avgRecoveryDays: number;
  maxDepth: number;
  frequency: number; // events per month
  currentDrawdown: {
    active: boolean;
    depthPercent: number;
    daysSinceStart: number;
    peakValue: number;
    currentValue: number;
  };
}

export function analyzeDrawdowns(trades: Trade[]): DrawdownSummary {
  const empty: DrawdownSummary = {
    events: [],
    avgDepth: 0,
    avgRecoveryDays: 0,
    maxDepth: 0,
    frequency: 0,
    currentDrawdown: {
      active: false,
      depthPercent: 0,
      daysSinceStart: 0,
      peakValue: 0,
      currentValue: 0,
    },
  };

  if (trades.length < 3) return empty;

  const sorted = [...trades].sort((a, b) => a.exitTime.getTime() - b.exitTime.getTime());

  // Build daily equity curve
  const dailyMap = new Map<string, number>();
  for (const t of sorted) {
    const d = t.exitTime.toISOString().split("T")[0];
    dailyMap.set(d, (dailyMap.get(d) || 0) + t.pnl);
  }

  const dates = Array.from(dailyMap.keys()).sort();
  const equityCurve: { date: string; equity: number }[] = [];
  let equity = 10000; // starting balance

  for (const date of dates) {
    equity += dailyMap.get(date) || 0;
    equityCurve.push({ date, equity });
  }

  if (equityCurve.length < 2) return empty;

  // Find drawdown events
  const events: DrawdownEvent[] = [];
  let peak = equityCurve[0].equity;
  let peakDate = equityCurve[0].date;
  let inDrawdown = false;
  let ddStart = "";
  let ddBottom = "";
  let ddBottomEquity = Infinity;
  let ddPeakEquity = peak;

  for (let i = 0; i < equityCurve.length; i++) {
    const { date, equity: eq } = equityCurve[i];

    if (eq > peak) {
      // New peak - close any active drawdown
      if (inDrawdown) {
        const startTime = new Date(ddStart).getTime();
        const bottomTime = new Date(ddBottom).getTime();
        const recoveryTime = new Date(date).getTime();
        const depthPercent = ddPeakEquity > 0
          ? ((ddPeakEquity - ddBottomEquity) / ddPeakEquity) * 100 : 0;

        if (depthPercent >= 1) { // Only record meaningful drawdowns (>1%)
          events.push({
            startDate: ddStart,
            bottomDate: ddBottom,
            recoveryDate: date,
            depthPercent,
            depthAbsolute: ddPeakEquity - ddBottomEquity,
            durationDays: Math.ceil((recoveryTime - startTime) / (24 * 3600 * 1000)),
            recoveryDays: Math.ceil((recoveryTime - bottomTime) / (24 * 3600 * 1000)),
          });
        }

        inDrawdown = false;
      }

      peak = eq;
      peakDate = date;
    } else if (eq < peak) {
      if (!inDrawdown) {
        inDrawdown = true;
        ddStart = peakDate;
        ddPeakEquity = peak;
        ddBottomEquity = eq;
        ddBottom = date;
      }
      if (eq < ddBottomEquity) {
        ddBottomEquity = eq;
        ddBottom = date;
      }
    }
  }

  // Current drawdown state
  const lastEquity = equityCurve[equityCurve.length - 1].equity;
  const currentDdPercent = peak > 0 ? ((peak - lastEquity) / peak) * 100 : 0;
  const isInDrawdown = currentDdPercent > 0.5;
  const daysSinceStart = isInDrawdown && ddStart
    ? Math.ceil(
        (new Date(equityCurve[equityCurve.length - 1].date).getTime() - new Date(ddStart).getTime()) /
        (24 * 3600 * 1000)
      )
    : 0;

  // Summary stats
  const recoveredEvents = events.filter((e) => e.recoveryDays !== null);
  const avgDepth = events.length > 0
    ? events.reduce((s, e) => s + e.depthPercent, 0) / events.length : 0;
  const avgRecovery = recoveredEvents.length > 0
    ? recoveredEvents.reduce((s, e) => s + (e.recoveryDays || 0), 0) / recoveredEvents.length : 0;
  const maxDepth = events.length > 0
    ? Math.max(...events.map((e) => e.depthPercent)) : 0;

  const totalDays = dates.length > 1
    ? (new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) / (24 * 3600 * 1000) : 1;
  const months = totalDays / 30;
  const frequency = months > 0 ? events.length / months : 0;

  return {
    events,
    avgDepth,
    avgRecoveryDays: avgRecovery,
    maxDepth,
    frequency,
    currentDrawdown: {
      active: isInDrawdown,
      depthPercent: Math.max(0, currentDdPercent),
      daysSinceStart,
      peakValue: peak,
      currentValue: lastEquity,
    },
  };
}
