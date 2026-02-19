import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trade } from "@/types/trading";
import { analyzeDrawdowns, DrawdownSummary } from "@/lib/drawdown-analysis";
import { formatPnl } from "@/lib/mock-data";
import { AlertTriangle, TrendingDown, Clock, Activity } from "lucide-react";

interface DrawdownAnalysisProps {
  trades: Trade[];
}

export function DrawdownAnalysis({ trades }: DrawdownAnalysisProps) {
  const summary: DrawdownSummary = useMemo(() => analyzeDrawdowns(trades), [trades]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="card-trading"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">Drawdown Analysis</h3>

      {/* Current drawdown indicator */}
      {summary.currentDrawdown.active && (
        <div className="mb-4 p-3 rounded-lg border border-loss/30 bg-loss/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-loss" />
            <span className="text-xs font-semibold text-loss">Active Drawdown</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Depth</span>
              <p className="font-mono font-semibold text-loss">
                -{summary.currentDrawdown.depthPercent.toFixed(1)}%
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Duration</span>
              <p className="font-mono font-semibold text-foreground">
                {summary.currentDrawdown.daysSinceStart}d
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">To recover</span>
              <p className="font-mono font-semibold text-foreground">
                {formatPnl(summary.currentDrawdown.peakValue - summary.currentDrawdown.currentValue)}
              </p>
            </div>
          </div>
          {/* Progress bar to recovery */}
          <div className="mt-2">
            <div className="h-1.5 bg-loss/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-loss/60 rounded-full transition-all"
                style={{ width: `${Math.min(summary.currentDrawdown.depthPercent * 2, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
          <TrendingDown className="h-3.5 w-3.5 text-loss mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">Max Depth</p>
          <p className="text-xs font-mono font-semibold text-loss">
            {summary.maxDepth.toFixed(1)}%
          </p>
        </div>
        <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
          <Activity className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">Avg Depth</p>
          <p className="text-xs font-mono font-semibold text-foreground">
            {summary.avgDepth.toFixed(1)}%
          </p>
        </div>
        <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
          <Clock className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">Avg Recovery</p>
          <p className="text-xs font-mono font-semibold text-foreground">
            {summary.avgRecoveryDays.toFixed(0)}d
          </p>
        </div>
        <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
          <AlertTriangle className="h-3.5 w-3.5 text-warning mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">Frequency</p>
          <p className="text-xs font-mono font-semibold text-foreground">
            {summary.frequency.toFixed(1)}/mo
          </p>
        </div>
      </div>

      {/* Drawdown events table */}
      {summary.events.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border/50">
                <th className="text-left py-1.5 pr-2 font-medium">Start</th>
                <th className="text-left py-1.5 px-2 font-medium">Bottom</th>
                <th className="text-left py-1.5 px-2 font-medium">Recovery</th>
                <th className="text-right py-1.5 px-2 font-medium">Depth %</th>
                <th className="text-right py-1.5 px-2 font-medium">Duration</th>
                <th className="text-right py-1.5 pl-2 font-medium">Recovery</th>
              </tr>
            </thead>
            <tbody>
              {summary.events.slice(0, 8).map((event, i) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="py-1.5 pr-2 font-mono text-muted-foreground">{event.startDate.slice(5)}</td>
                  <td className="py-1.5 px-2 font-mono text-loss">{event.bottomDate.slice(5)}</td>
                  <td className="py-1.5 px-2 font-mono text-profit">
                    {event.recoveryDate ? event.recoveryDate.slice(5) : "—"}
                  </td>
                  <td className="text-right py-1.5 px-2 font-mono text-loss font-medium">
                    -{event.depthPercent.toFixed(1)}%
                  </td>
                  <td className="text-right py-1.5 px-2 font-mono text-muted-foreground">
                    {event.durationDays}d
                  </td>
                  <td className="text-right py-1.5 pl-2 font-mono text-muted-foreground">
                    {event.recoveryDays != null ? `${event.recoveryDays}d` : "ongoing"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4">
          No significant drawdowns detected (&gt;1%)
        </p>
      )}
    </motion.div>
  );
}
