import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trade } from "@/types/trading";
import { calculateCorrelationMatrix, CorrelationResult } from "@/lib/correlation";

function corrColor(corr: number): string {
  if (corr >= 0.6) return "bg-loss/60";
  if (corr >= 0.3) return "bg-loss/30";
  if (corr >= 0.1) return "bg-loss/15";
  if (corr > -0.1) return "bg-secondary/30";
  if (corr > -0.3) return "bg-primary/15";
  if (corr > -0.6) return "bg-primary/30";
  return "bg-primary/60";
}

function corrTextColor(corr: number): string {
  if (Math.abs(corr) >= 0.3) return "text-foreground";
  return "text-muted-foreground";
}

interface CorrelationMatrixProps {
  trades: Trade[];
}

export function CorrelationMatrix({ trades }: CorrelationMatrixProps) {
  const result: CorrelationResult = useMemo(() => calculateCorrelationMatrix(trades), [trades]);
  const [hoveredCell, setHoveredCell] = useState<{ i: number; j: number } | null>(null);

  if (result.symbols.length < 2) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-trading">
        <h3 className="text-sm font-semibold text-foreground mb-2">Symbol Correlation</h3>
        <p className="text-xs text-muted-foreground">Need at least 2 symbols with overlapping trades</p>
      </motion.div>
    );
  }

  const hoveredEntry = hoveredCell
    ? result.entries.find(
        (e) =>
          (e.symbolA === result.symbols[hoveredCell.i] && e.symbolB === result.symbols[hoveredCell.j]) ||
          (e.symbolA === result.symbols[hoveredCell.j] && e.symbolB === result.symbols[hoveredCell.i])
      )
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="card-trading"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">Symbol Correlation</h3>

      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Header row */}
          <div className="flex">
            <div className="w-16" />
            {result.symbols.map((s) => (
              <div key={s} className="w-12 text-center">
                <span className="text-[8px] font-mono text-muted-foreground" style={{ writingMode: "vertical-rl" }}>
                  {s.replace("-PERP", "")}
                </span>
              </div>
            ))}
          </div>

          {/* Matrix rows */}
          {result.symbols.map((sym, i) => (
            <div key={sym} className="flex items-center">
              <div className="w-16 pr-1">
                <span className="text-[9px] font-mono text-muted-foreground truncate block text-right">
                  {sym.replace("-PERP", "")}
                </span>
              </div>
              {result.symbols.map((_, j) => {
                const corr = result.matrix[i][j];
                const isHovered = hoveredCell?.i === i && hoveredCell?.j === j;
                return (
                  <div
                    key={j}
                    className={`w-12 h-8 flex items-center justify-center cursor-default transition-all ${corrColor(corr)} ${isHovered ? "ring-1 ring-primary" : ""} ${i === j ? "opacity-50" : ""}`}
                    onMouseEnter={() => setHoveredCell({ i, j })}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    <span className={`text-[9px] font-mono font-medium ${corrTextColor(corr)}`}>
                      {i === j ? "1.00" : corr.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Hover details */}
      <div className="mt-3 h-6 text-[10px] text-muted-foreground">
        {hoveredCell && hoveredCell.i !== hoveredCell.j && hoveredEntry ? (
          <span>
            {hoveredEntry.symbolA} ↔ {hoveredEntry.symbolB}: r = {hoveredEntry.correlation.toFixed(3)} ({hoveredEntry.overlapDays} overlap days)
          </span>
        ) : (
          <span>Hover over a cell to see details</span>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-1 mt-2">
        <span className="text-[9px] text-primary">−1 (diversify)</span>
        <div className="flex gap-0.5">
          {[-0.8, -0.4, 0, 0.4, 0.8].map((v) => (
            <div key={v} className={`w-4 h-2.5 rounded-sm ${corrColor(v)}`} />
          ))}
        </div>
        <span className="text-[9px] text-loss">+1 (correlated)</span>
      </div>
    </motion.div>
  );
}
