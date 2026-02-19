import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trade } from "@/types/trading";
import { calculateWinLossProfile, TradeProfileSide } from "@/lib/trade-profile";
import { formatCurrency } from "@/lib/mock-data";

function ComparisonBar({ label, winValue, lossValue, format }: {
  label: string;
  winValue: number;
  lossValue: number;
  format: (v: number) => string;
}) {
  const max = Math.max(Math.abs(winValue), Math.abs(lossValue), 0.01);
  const winWidth = (Math.abs(winValue) / max) * 100;
  const lossWidth = (Math.abs(lossValue) / max) * 100;
  const diff = Math.abs(winValue) > 0 ? ((lossValue - winValue) / Math.abs(winValue)) * 100 : 0;
  const showWarning = Math.abs(diff) > 20;

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
        <span>{label}</span>
        {showWarning && (
          <span className={`text-[9px] font-medium ${diff > 20 ? "text-warning" : "text-profit"}`}>
            {diff > 0 ? "+" : ""}{diff.toFixed(0)}%
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-3 bg-secondary/30 rounded-full overflow-hidden flex justify-end">
              <div
                className="h-full bg-profit/60 rounded-full"
                style={{ width: `${winWidth}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-profit w-16 text-right">{format(winValue)}</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-loss w-16">{format(lossValue)}</span>
            <div className="flex-1 h-3 bg-secondary/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-loss/60 rounded-full"
                style={{ width: `${lossWidth}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileColumn({ title, data, color }: { title: string; data: TradeProfileSide; color: string }) {
  return (
    <div>
      <h4 className={`text-xs font-semibold ${color} mb-2`}>{title} ({data.count})</h4>
      <div className="space-y-1.5 text-[10px]">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Most common</span>
          <span className="font-mono text-foreground">{data.mostCommonSymbol}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Order type</span>
          <span className="font-mono text-foreground capitalize">{data.mostCommonOrderType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Peak hour</span>
          <span className="font-mono text-foreground">{data.mostCommonHour}:00</span>
        </div>
      </div>
    </div>
  );
}

interface WinLossProfileProps {
  trades: Trade[];
}

export function WinLossProfile({ trades }: WinLossProfileProps) {
  const profile = useMemo(() => calculateWinLossProfile(trades), [trades]);

  if (trades.length < 5) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-trading">
        <h3 className="text-sm font-semibold text-foreground mb-2">Win vs Loss Profile</h3>
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
      <h3 className="text-sm font-semibold text-foreground mb-4">Win vs Loss Profile</h3>

      <div className="mb-1 flex justify-between text-[10px] font-medium">
        <span className="text-profit">Winners</span>
        <span className="text-loss">Losers</span>
      </div>

      <ComparisonBar
        label="Avg Size"
        winValue={profile.winners.avgSize}
        lossValue={profile.losers.avgSize}
        format={(v) => `$${formatCurrency(v)}`}
      />
      <ComparisonBar
        label="Avg Duration"
        winValue={profile.winners.avgDurationHours}
        lossValue={profile.losers.avgDurationHours}
        format={(v) => `${v.toFixed(1)}h`}
      />
      <ComparisonBar
        label="Avg Leverage"
        winValue={profile.winners.avgLeverage}
        lossValue={profile.losers.avgLeverage}
        format={(v) => `${v.toFixed(1)}x`}
      />
      <ComparisonBar
        label="Avg Fees"
        winValue={profile.winners.avgFees}
        lossValue={profile.losers.avgFees}
        format={(v) => `$${v.toFixed(0)}`}
      />

      <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-border/50">
        <ProfileColumn title="Winners" data={profile.winners} color="text-profit" />
        <ProfileColumn title="Losers" data={profile.losers} color="text-loss" />
      </div>
    </motion.div>
  );
}
