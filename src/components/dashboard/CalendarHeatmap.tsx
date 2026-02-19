import { useMemo, useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Trade } from "@/types/trading";
import { calculateCalendarData } from "@/lib/analytics";
import { formatPnl } from "@/lib/mock-data";

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const LABEL_W = 28;
const MONTH_HEADER = 14;
const MIN_CELL = 10;
const GAP = 2;

function pnlToClass(pnl: number, maxAbs: number, hasData: boolean): string {
  if (!hasData || maxAbs === 0) return "empty";
  const t = Math.min(Math.abs(pnl) / maxAbs, 1);
  if (pnl > 0) {
    if (t < 0.25) return "profit-1";
    if (t < 0.5) return "profit-2";
    if (t < 0.75) return "profit-3";
    return "profit-4";
  }
  if (pnl < 0) {
    if (t < 0.25) return "loss-1";
    if (t < 0.5) return "loss-2";
    if (t < 0.75) return "loss-3";
    return "loss-4";
  }
  return "empty";
}

const COLOR_MAP: Record<string, string> = {
  empty: "bg-secondary/50",
  "profit-1": "bg-emerald-100 dark:bg-emerald-950/80",
  "profit-2": "bg-emerald-300 dark:bg-emerald-800/90",
  "profit-3": "bg-emerald-400 dark:bg-emerald-600",
  "profit-4": "bg-emerald-500 dark:bg-emerald-500",
  "loss-1": "bg-red-100 dark:bg-red-950/80",
  "loss-2": "bg-red-300 dark:bg-red-800/90",
  "loss-3": "bg-red-400 dark:bg-red-600",
  "loss-4": "bg-red-500 dark:bg-red-500",
};

interface CalendarHeatmapProps {
  trades: Trade[];
}

export function CalendarHeatmap({ trades }: CalendarHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(MIN_CELL);

  const calendarData = useMemo(() => calculateCalendarData(trades), [trades]);

  const { weeks, months, maxAbsPnl } = useMemo(() => {
    if (calendarData.length === 0) return { weeks: [], months: [], maxAbsPnl: 0 };

    const dataMap = new Map(calendarData.map((d) => [d.date, d]));
    const maxAbs = Math.max(...calendarData.map((d) => Math.abs(d.pnl)), 1);

    // Expand range to full months
    const startDate = new Date(calendarData[0].date + "T00:00:00");
    const endDate = new Date(calendarData[calendarData.length - 1].date + "T00:00:00");
    const rangeStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const rangeEnd = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);

    // Align to Monday of first week
    const start = new Date(rangeStart);
    const dow = start.getDay();
    start.setDate(start.getDate() - ((dow + 6) % 7));

    const weeksArr: { date: string; pnl: number; tradeCount: number; inRange: boolean }[][] = [];
    const monthLabels: { label: string; weekIdx: number }[] = [];
    let prevMonth = -1;

    const cur = new Date(start);
    while (cur <= rangeEnd) {
      const week: typeof weeksArr[0] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = cur.toISOString().split("T")[0];
        const data = dataMap.get(dateStr);
        const inRange = cur >= rangeStart && cur <= rangeEnd;

        if (d === 0) {
          const m = cur.getMonth();
          if (m !== prevMonth && cur >= rangeStart) {
            monthLabels.push({
              label: cur.toLocaleDateString("en-US", { month: "short" }),
              weekIdx: weeksArr.length,
            });
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

  // Calculate cell size to fill container
  useEffect(() => {
    if (!containerRef.current || weeks.length === 0) return;
    const measure = () => {
      const w = containerRef.current!.clientWidth;
      const available = w - LABEL_W;
      const size = Math.max(MIN_CELL, Math.floor((available - (weeks.length - 1) * GAP) / weeks.length));
      setCellSize(Math.min(size, 18));
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [weeks.length]);

  const hoveredData = hoveredDay ? calendarData.find((d) => d.date === hoveredDay) : null;
  const step = cellSize + GAP;
  const totalWidth = LABEL_W + weeks.length * step;
  const svgHeight = MONTH_HEADER + 7 * step;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="card-trading"
      ref={containerRef}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Daily PnL Calendar</h3>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Loss</span>
          {["loss-4", "loss-2", "empty", "profit-2", "profit-4"].map((key) => (
            <div key={key} className={`w-[10px] h-[10px] rounded-sm ${COLOR_MAP[key]}`} />
          ))}
          <span>Profit</span>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <svg width={totalWidth} height={svgHeight} className="block">
          {/* Month labels */}
          {months.map((m, i) => (
            <text
              key={i}
              x={LABEL_W + m.weekIdx * step}
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
                y={MONTH_HEADER + i * step + cellSize / 2 + 3}
                textAnchor="end"
                className="fill-muted-foreground"
                fontSize={9}
              >
                {label}
              </text>
            ) : null,
          )}

          {/* Cells — use foreignObject so we can use Tailwind classes for theme-aware colors */}
          {weeks.map((week, wi) =>
            week.map((day, di) =>
              day.inRange ? (
                <foreignObject
                  key={day.date}
                  x={LABEL_W + wi * step}
                  y={MONTH_HEADER + di * step}
                  width={cellSize}
                  height={cellSize}
                >
                  <div
                    className={`w-full h-full rounded-sm transition-colors ${
                      COLOR_MAP[pnlToClass(day.pnl, maxAbsPnl, day.tradeCount > 0)]
                    } ${hoveredDay === day.date ? "ring-1 ring-foreground/50" : ""} cursor-pointer`}
                    onMouseEnter={() => setHoveredDay(day.date)}
                    onMouseLeave={() => setHoveredDay(null)}
                  />
                </foreignObject>
              ) : null,
            ),
          )}
        </svg>
      </div>

      {/* Hover info */}
      <div className="text-xs h-[16px] mt-1.5">
        {hoveredDay && (
          <span>
            <span className="text-muted-foreground">
              {new Date(hoveredDay + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
            {hoveredData ? (
              <>
                <span className="mx-1.5 text-muted-foreground/50">&middot;</span>
                <span className={hoveredData.pnl >= 0 ? "text-profit" : "text-loss"}>{formatPnl(hoveredData.pnl)}</span>
                <span className="mx-1.5 text-muted-foreground/50">&middot;</span>
                <span className="text-muted-foreground">{hoveredData.tradeCount} trade{hoveredData.tradeCount !== 1 ? "s" : ""}</span>
              </>
            ) : (
              <span className="ml-1.5 text-muted-foreground">No trades</span>
            )}
          </span>
        )}
      </div>
    </motion.div>
  );
}
