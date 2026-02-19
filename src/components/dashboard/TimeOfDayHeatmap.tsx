import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trade } from "@/types/trading";
import { calculateTimeOfDay } from "@/lib/analytics";
import { formatPnl } from "@/lib/mock-data";

const CELL = 18;
const GAP = 2;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function pnlToColor(pnl: number, maxAbs: number, hasData: boolean): string {
  if (!hasData) return "hsl(220 14% 12%)";
  if (maxAbs === 0) return "hsl(220 14% 12%)";
  const t = Math.min(Math.abs(pnl) / maxAbs, 1);
  if (pnl > 0) {
    if (t < 0.25) return "hsl(145 55% 22%)";
    if (t < 0.5) return "hsl(145 60% 32%)";
    if (t < 0.75) return "hsl(145 65% 40%)";
    return "hsl(145 70% 48%)";
  }
  if (pnl < 0) {
    if (t < 0.25) return "hsl(0 50% 22%)";
    if (t < 0.5) return "hsl(0 60% 32%)";
    if (t < 0.75) return "hsl(0 68% 40%)";
    return "hsl(0 72% 50%)";
  }
  return "hsl(220 14% 12%)";
}

interface TimeOfDayHeatmapProps {
  trades: Trade[];
}

export function TimeOfDayHeatmap({ trades }: TimeOfDayHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number } | null>(null);

  const { cells, bestHour, worstHour } = useMemo(() => calculateTimeOfDay(trades), [trades]);

  const maxAbsPnl = useMemo(() => {
    const max = Math.max(...cells.map((c) => Math.abs(c.pnl)));
    return max || 1;
  }, [cells]);

  const hoveredData = hoveredCell
    ? cells.find((c) => c.day === hoveredCell.day && c.hour === hoveredCell.hour)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="card-trading"
    >
      <h3 className="text-sm font-semibold text-foreground mb-1">Time of Day Performance</h3>
      <p className="stat-label mb-3">PnL by day of week &amp; hour</p>

      <div className="overflow-x-auto scrollbar-thin pb-1">
        <div style={{ minWidth: 24 * (CELL + GAP) + 36 }}>
          {/* Hour labels */}
          <div className="flex items-end" style={{ paddingLeft: 36, marginBottom: 2 }}>
            {HOURS.map((h) => (
              <div key={h} className="text-center" style={{ width: CELL, marginRight: GAP }}>
                {h % 3 === 0 && (
                  <span className="text-[9px] text-muted-foreground">{h.toString().padStart(2, "0")}</span>
                )}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {DAYS.map((dayName, dayIdx) => (
            <div key={dayIdx} className="flex items-center" style={{ marginBottom: GAP }}>
              <span
                className="text-[10px] text-muted-foreground text-right shrink-0 pr-1.5"
                style={{ width: 34 }}
              >
                {dayName}
              </span>
              <div className="flex" style={{ gap: GAP }}>
                {HOURS.map((hour) => {
                  const cell = cells.find((c) => c.day === dayIdx && c.hour === hour);
                  return (
                    <div
                      key={hour}
                      className="rounded-sm cursor-pointer hover:ring-1 hover:ring-foreground/50"
                      style={{
                        width: CELL,
                        height: CELL,
                        backgroundColor: pnlToColor(cell?.pnl || 0, maxAbsPnl, (cell?.tradeCount || 0) > 0),
                      }}
                      onMouseEnter={() => setHoveredCell({ day: dayIdx, hour })}
                      onMouseLeave={() => setHoveredCell(null)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row: hover info + best/worst */}
      <div className="flex items-center justify-between mt-2 min-h-[20px]">
        <div className="text-xs">
          {hoveredData && hoveredCell ? (
            <span>
              <span className="text-foreground font-medium">
                {DAYS[hoveredCell.day]} {hoveredCell.hour.toString().padStart(2, "0")}:00–{((hoveredCell.hour + 1) % 24).toString().padStart(2, "0")}:00
              </span>
              <span className="mx-1.5 text-muted-foreground/50">·</span>
              <span className={hoveredData.pnl >= 0 ? "text-profit" : "text-loss"}>{formatPnl(hoveredData.pnl)}</span>
              <span className="mx-1.5 text-muted-foreground/50">·</span>
              <span className="text-muted-foreground">{hoveredData.tradeCount} trades, {hoveredData.winRate.toFixed(0)}% win</span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              {bestHour && <>Best: <span className="text-profit">{DAYS[bestHour.day]} {bestHour.hour.toString().padStart(2, "0")}:00 ({formatPnl(bestHour.pnl)})</span></>}
              {bestHour && worstHour && <span className="mx-2">·</span>}
              {worstHour && <>Worst: <span className="text-loss">{DAYS[worstHour.day]} {worstHour.hour.toString().padStart(2, "0")}:00 ({formatPnl(worstHour.pnl)})</span></>}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
