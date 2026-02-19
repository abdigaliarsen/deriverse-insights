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
    return {
      type: type.charAt(0).toUpperCase() + type.slice(1),
      count: filtered.length,
      pnl: filtered.reduce((s, t) => s + t.pnl, 0),
      winRate: filtered.length > 0 ? (wins / filtered.length) * 100 : 0,
    };
  });

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
              <span className={`font-mono font-semibold ${d.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                {formatPnl(d.pnl)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
