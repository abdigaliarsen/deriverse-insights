import { motion } from "framer-motion";
import { SessionPerformance as SessionPerfType } from "@/types/trading";
import { formatPnl } from "@/lib/mock-data";

interface SessionPerformanceProps {
  data: SessionPerfType[];
}

export function SessionPerformanceCard({ data }: SessionPerformanceProps) {
  const maxAbsPnl = Math.max(...data.map((d) => Math.abs(d.pnl)), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="card-trading"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">Session Performance</h3>

      <div className="space-y-3">
        {data.map((session) => {
          const barWidth = (Math.abs(session.pnl) / maxAbsPnl) * 100;
          const isPositive = session.pnl >= 0;

          return (
            <div key={session.session}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-foreground font-medium truncate">{session.session}</p>
                <span className={`font-mono text-xs font-semibold ${isPositive ? "text-profit" : "text-loss"}`}>
                  {formatPnl(session.pnl)}
                </span>
              </div>
              <div className="relative h-5 bg-secondary/30 rounded-md overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`absolute inset-y-0 left-0 rounded-md ${isPositive ? "bg-profit/40" : "bg-loss/40"}`}
                />
                <div className="absolute inset-0 flex items-center px-2 justify-between">
                  <span className="text-[10px] text-muted-foreground">{session.trades} trades</span>
                  <span className={`text-[10px] font-medium ${session.winRate >= 50 ? "text-profit" : "text-loss"}`}>
                    WR: {session.winRate.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
