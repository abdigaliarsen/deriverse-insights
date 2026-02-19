import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trade } from "@/types/trading";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, Cell, Brush } from "recharts";
import { formatPnl } from "@/lib/mock-data";

interface TimelinePoint {
  time: number;
  dateStr: string;
  pnl: number;
  size: number;
  symbol: string;
  side: string;
  dotSize: number;
}

interface TradeTimelineProps {
  trades: Trade[];
}

export function TradeTimeline({ trades }: TradeTimelineProps) {
  const data: TimelinePoint[] = useMemo(() => {
    if (trades.length === 0) return [];

    const sizes = trades.map((t) => t.size);
    const maxSize = Math.max(...sizes);
    const minSize = Math.min(...sizes);
    const sizeRange = maxSize - minSize || 1;

    return [...trades]
      .sort((a, b) => a.exitTime.getTime() - b.exitTime.getTime())
      .map((t) => ({
        time: t.exitTime.getTime(),
        dateStr: t.exitTime.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        pnl: t.pnl,
        size: t.size,
        symbol: t.symbol,
        side: t.side,
        dotSize: 20 + ((t.size - minSize) / sizeRange) * 80,
      }));
  }, [trades]);

  if (data.length < 3) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-trading">
        <h3 className="text-sm font-semibold text-foreground mb-2">Trade Timeline</h3>
        <p className="text-xs text-muted-foreground">Not enough data</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="card-trading"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">Trade Timeline</h3>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
            <XAxis
              dataKey="time"
              type="number"
              domain={["dataMin", "dataMax"]}
              tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }}
              tickFormatter={(v: number) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              name="Date"
            />
            <YAxis
              dataKey="pnl"
              type="number"
              tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }}
              tickFormatter={(v: number) => `$${v.toFixed(0)}`}
              name="PnL"
              width={55}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(220 18% 10%)",
                border: "1px solid hsl(220 14% 18%)",
                borderRadius: "8px",
                fontSize: "11px",
              }}
              content={({ payload }) => {
                if (!payload || !payload.length) return null;
                const d = payload[0].payload as TimelinePoint;
                return (
                  <div className="bg-card border border-border rounded-lg p-2 text-xs">
                    <p className="font-semibold">{d.symbol} ({d.side})</p>
                    <p className={d.pnl >= 0 ? "text-profit" : "text-loss"}>
                      PnL: {formatPnl(d.pnl)}
                    </p>
                    <p className="text-muted-foreground">Size: ${d.size.toFixed(0)}</p>
                    <p className="text-muted-foreground">{d.dateStr}</p>
                  </div>
                );
              }}
            />
            <Scatter data={data} shape="circle">
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.pnl >= 0 ? "hsl(145 65% 48%)" : "hsl(0 72% 55%)"}
                  fillOpacity={0.6}
                  r={Math.max(3, entry.dotSize / 15)}
                />
              ))}
            </Scatter>
            <Brush
              dataKey="time"
              height={20}
              stroke="hsl(215 70% 50%)"
              fill="hsl(220 18% 10%)"
              tickFormatter={(v: number) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-profit/60" /> Win
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-loss/60" /> Loss
        </span>
        <span>Dot size = trade size • Drag brush to zoom</span>
      </div>
    </motion.div>
  );
}
