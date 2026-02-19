import { motion } from "framer-motion";
import { SymbolStats as SymbolStatsType } from "@/types/trading";
import { formatPnl, formatCurrency } from "@/lib/mock-data";
import { getMintForSymbol, solscanMintUrl } from "@/lib/deriverse-client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { ExternalLink } from "lucide-react";

interface SymbolPerformanceProps {
  data: SymbolStatsType[];
}

export function SymbolPerformance({ data }: SymbolPerformanceProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="card-trading"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">Symbol Performance</h3>
      
      <div className="h-[200px] mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }} tickFormatter={(v) => `$${formatCurrency(v)}`} />
            <YAxis type="category" dataKey="symbol" tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }} width={80} />
            <Tooltip
              contentStyle={{
                background: "hsl(220 18% 10%)",
                border: "1px solid hsl(220 14% 18%)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, "PnL"]}
            />
            <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.pnl >= 0 ? "hsl(145 65% 48%)" : "hsl(0 72% 55%)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2 max-h-[180px] overflow-y-auto scrollbar-thin">
        {data.map((s) => {
          const mint = getMintForSymbol(s.symbol);
          return (
          <div key={s.symbol} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
            <div className="flex items-center gap-1">
              {mint ? (
                <a
                  href={solscanMintUrl(mint)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-medium text-foreground hover:text-primary transition-colors"
                >
                  {s.symbol}
                </a>
              ) : (
                <span className="font-mono font-medium text-foreground">{s.symbol}</span>
              )}
              {mint && <a href={solscanMintUrl(mint)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground/30 hover:text-primary transition-colors"><ExternalLink className="h-2.5 w-2.5" /></a>}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">{s.trades} trades</span>
              <span className="text-muted-foreground">WR: {s.winRate.toFixed(0)}%</span>
              <span className={`font-mono font-semibold ${s.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                {formatPnl(s.pnl)}
              </span>
            </div>
          </div>
          );
        })}
      </div>
    </motion.div>
  );
}
