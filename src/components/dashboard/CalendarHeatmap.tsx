import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trade } from "@/types/trading";
import { calculateCalendarData } from "@/lib/analytics";
import { formatPnl } from "@/lib/mock-data";

const CELL = 11;
const GAP = 2;
const STEP = CELL + GAP; // 13px per column
const LABEL_W = 30;
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

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

interface CalendarHeatmapProps {
  trades: Trade[];
}

export function CalendarHeatmap({ trades }: CalendarHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const calendarData = useMemo(() => calculateCalendarData(trades), [trades]);

  const { weeks, months, maxAbsPnl } = useMemo(() => {
    if (calendarData.length === 0) return { weeks: [], months: [], maxAbsPnl: 0 };

    const dataMap = new Map(calendarData.map((d) => [d.date, d]));
    const maxAbs = Math.max(...calendarData.map((d) => Math.abs(d.pnl)), 1);

    const startDate = new Date(calendarData[0].date + "T00:00:00");
    const endDate = new Date(calendarData[calendarData.length - 1].date + "T00:00:00");

    // Align to Monday
    const start = new Date(startDate);
    const dow = start.getDay();
    start.setDate(start.getDate() - ((dow + 6) % 7));

    const weeksArr: { date: string; pnl: number; tradeCount: number; inRange: boolean }[][] = [];
    const monthLabels: { label: string; weekIdx: number }[] = [];
    let prevMonth = -1;

    const cur = new Date(start);
    while (cur <= endDate) {
      const week: typeof weeksArr[0] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = cur.toISOString().split("T")[0];
        const data = dataMap.get(dateStr);
        const inRange = cur >= startDate && cur <= endDate;

        if (d === 0) {
          const m = cur.getMonth();
          if (m !== prevMonth) {
            monthLabels.push({ label: cur.toLocaleDateString("en-US", { month: "short" }), weekIdx: weeksArr.length });
            prevMonth = m;
          }
        }

        week.push({ date: dateStr, pnl: data?.pnl || 0, tradeCount: data?.tradeCount || 0, inRange });
        cur.setDate(cur.getDate() + 1);
      }
      weeksArr.push(week);
    }

    return { weeks: weeksArr, months: monthLabels, maxAbsPnl: maxAbs };
  }, [calendarData]);

  const hoveredData = hoveredDay ? calendarData.find((d) => d.date === hoveredDay) : null;
  const totalWidth = LABEL_W + weeks.length * STEP;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="card-trading"
    >
      <h3 className="text-sm font-semibold text-foreground mb-3">Daily PnL Calendar</h3>

      <div className="overflow-x-auto scrollbar-thin">
        <svg width={totalWidth} height={16 + 7 * STEP - GAP} className="block">
          {/* Month labels */}
          {months.map((m, i) => (
            <text
              key={i}
              x={LABEL_W + m.weekIdx * STEP}
              y={10}
              className="fill-muted-foreground"
              fontSize={10}
            >
              {m.label}
            </text>
          ))}

          {/* Day labels */}
          {DAY_LABELS.map((label, i) =>
            label ? (
              <text
                key={i}
                x={LABEL_W - 4}
                y={16 + i * STEP + CELL / 2 + 3}
                textAnchor="end"
                className="fill-muted-foreground"
                fontSize={10}
              >
                {label}
              </text>
            ) : null,
          )}

          {/* Grid cells */}
          {weeks.map((week, wi) =>
            week.map((day, di) =>
              day.inRange ? (
                <rect
                  key={day.date}
                  x={LABEL_W + wi * STEP}
                  y={16 + di * STEP}
                  width={CELL}
                  height={CELL}
                  rx={2}
                  fill={pnlToColor(day.pnl, maxAbsPnl, day.tradeCount > 0)}
                  className="cursor-pointer hover:stroke-foreground/50"
                  strokeWidth={hoveredDay === day.date ? 1 : 0}
                  stroke={hoveredDay === day.date ? "hsl(210 20% 70%)" : "none"}
                  onMouseEnter={() => setHoveredDay(day.date)}
                  onMouseLeave={() => setHoveredDay(null)}
                />
              ) : null,
            ),
          )}
        </svg>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-1.5">
        <div className="text-xs h-[16px]">
          {hoveredDay && (
            <span>
              <span className="text-muted-foreground">
                {new Date(hoveredDay + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
              {hoveredData ? (
                <>
                  <span className="mx-1.5 text-muted-foreground/50">·</span>
                  <span className={hoveredData.pnl >= 0 ? "text-profit" : "text-loss"}>{formatPnl(hoveredData.pnl)}</span>
                  <span className="mx-1.5 text-muted-foreground/50">·</span>
                  <span className="text-muted-foreground">{hoveredData.tradeCount} trade{hoveredData.tradeCount !== 1 ? "s" : ""}</span>
                </>
              ) : (
                <span className="ml-1.5 text-muted-foreground">No trades</span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Loss</span>
          {[
            "hsl(0 72% 50%)",
            "hsl(0 60% 32%)",
            "hsl(220 14% 12%)",
            "hsl(145 60% 32%)",
            "hsl(145 70% 48%)",
          ].map((color, i) => (
            <div key={i} className="rounded-sm" style={{ width: CELL, height: CELL, backgroundColor: color }} />
          ))}
          <span>Profit</span>
        </div>
      </div>
    </motion.div>
  );
}
