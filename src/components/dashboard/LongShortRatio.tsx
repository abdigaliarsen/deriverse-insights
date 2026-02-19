import { motion } from "framer-motion";
import { formatPnl } from "@/lib/mock-data";

interface LongShortRatioProps {
  longCount: number;
  shortCount: number;
  longPnl: number;
  shortPnl: number;
}

export function LongShortRatio({ longCount, shortCount, longPnl, shortPnl }: LongShortRatioProps) {
  const total = longCount + shortCount;
  const longPct = total > 0 ? (longCount / total) * 100 : 50;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="card-trading"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">Long / Short Ratio</h3>
      
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 rounded-full flex-1 bg-secondary overflow-hidden flex">
          <div
            className="h-full bg-profit rounded-l-full transition-all duration-500"
            style={{ width: `${longPct}%` }}
          />
          <div
            className="h-full bg-loss rounded-r-full transition-all duration-500"
            style={{ width: `${100 - longPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="stat-label text-profit mb-1">Long</p>
          <p className="font-mono text-lg font-semibold text-foreground">{longCount}</p>
          <p className={`font-mono text-xs ${longPnl >= 0 ? "text-profit" : "text-loss"}`}>
            {formatPnl(longPnl)}
          </p>
        </div>
        <div className="text-right">
          <p className="stat-label text-loss mb-1">Short</p>
          <p className="font-mono text-lg font-semibold text-foreground">{shortCount}</p>
          <p className={`font-mono text-xs ${shortPnl >= 0 ? "text-profit" : "text-loss"}`}>
            {formatPnl(shortPnl)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
