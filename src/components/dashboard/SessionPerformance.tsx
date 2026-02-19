import { motion } from "framer-motion";
import { SessionPerformance as SessionPerfType } from "@/types/trading";
import { formatPnl } from "@/lib/mock-data";

interface SessionPerformanceProps {
  data: SessionPerfType[];
}

export function SessionPerformanceCard({ data }: SessionPerformanceProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="card-trading"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">Session Performance</h3>

      <div className="space-y-3">
        {data.map((session) => (
          <div key={session.session} className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground font-medium truncate">{session.session}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-muted-foreground">{session.trades} trades</span>
                <span className="text-xs text-muted-foreground">WR: {session.winRate.toFixed(0)}%</span>
              </div>
            </div>
            <span className={`font-mono text-sm font-semibold ${session.pnl >= 0 ? "text-profit" : "text-loss"}`}>
              {formatPnl(session.pnl)}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
