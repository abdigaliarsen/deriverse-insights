import { motion } from "framer-motion";
import { Trade } from "@/types/trading";
import { formatPnl } from "@/lib/mock-data";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

interface OrderTypeAnalysisProps {
  trades: Trade[];
}

export function OrderTypeAnalysis({ trades }: OrderTypeAnalysisProps) {
  const types = ["market", "limit", "stop"] as const;
  
  const data = types.map((type) => {
    const filtered = trades.filter((t) => t.orderType === type);
    const wins = filtered.filter((t) => t.pnl > 0).length;
    const totalPnl = filtered.reduce((s, t) => s + t.pnl, 0);
    return {
      type: type.charAt(0).toUpperCase() + type.slice(1),
      count: filtered.length,
      pnl: totalPnl,
      winRate: filtered.length > 0 ? (wins / filtered.length) * 100 : 0,
      avgPnl: filtered.length > 0 ? totalPnl / filtered.length : 0,
    };
  });

  const best = [...data].filter((d) => d.count > 0).sort((a, b) => {
    const scoreA = a.winRate * 0.5 + (a.avgPnl > 0 ? 50 : 0);
    const scoreB = b.winRate * 0.5 + (b.avgPnl > 0 ? 50 : 0);
    return scoreB - scoreA;
  })[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="card-trading"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">Order Type Analysis</h3>

      <div className="h-[140px] mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="type" tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }} />
            <Tooltip
              contentStyle={{
                background: "hsl(220 18% 10%)",
                border: "1px solid hsl(220 14% 18%)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={`hsl(175 ${60 + i * 10}% ${40 + i * 8}%)`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.type} className="flex items-center justify-between text-xs">
            <span className="text-foreground font-medium">{d.type}</span>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">{d.count} trades</span>
              <span className="text-muted-foreground">WR: {d.winRate.toFixed(0)}%</span>
              <span className={`font-mono ${d.avgPnl >= 0 ? "text-profit/70" : "text-loss/70"}`}>
                avg {formatPnl(d.avgPnl)}
              </span>
              <span className={`font-mono font-semibold ${d.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                {formatPnl(d.pnl)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {best && best.count > 0 && (
        <div className="mt-4 p-2.5 rounded-md border border-primary/30 bg-primary/5">
          <span className="text-xs text-foreground">
            <span className="font-semibold text-primary">Best: {best.type}</span>
            {" — "}
            {best.winRate.toFixed(0)}% win rate, {formatPnl(best.avgPnl)} avg PnL
          </span>
        </div>
      )}
    </motion.div>
  );
}
