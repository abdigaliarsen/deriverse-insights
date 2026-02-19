import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trade } from "@/types/trading";
import { calculatePerformanceScore, PerformanceScoreResult } from "@/lib/scoring";

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "text-profit";
  if (grade.startsWith("B")) return "text-cyan-400";
  if (grade.startsWith("C")) return "text-warning";
  if (grade.startsWith("D")) return "text-orange-400";
  return "text-loss";
}

function scoreStrokeColor(score: number): string {
  if (score >= 80) return "stroke-profit";
  if (score >= 65) return "stroke-cyan-400";
  if (score >= 50) return "stroke-warning";
  if (score >= 35) return "stroke-orange-400";
  return "stroke-loss";
}

function barColor(score: number): string {
  if (score >= 80) return "bg-profit";
  if (score >= 65) return "bg-cyan-400";
  if (score >= 50) return "bg-warning";
  if (score >= 35) return "bg-orange-400";
  return "bg-loss";
}

interface PerformanceScoreProps {
  trades: Trade[];
}

export function PerformanceScore({ trades }: PerformanceScoreProps) {
  const result: PerformanceScoreResult = useMemo(() => calculatePerformanceScore(trades), [trades]);

  const circumference = 2 * Math.PI * 52;
  const strokeDashoffset = circumference - (result.totalScore / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="card-trading flex flex-col items-center"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4 self-start">Trader Grade</h3>

      {/* Score Ring */}
      <div className="relative w-32 h-32 mb-4">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60" cy="60" r="52"
            fill="none"
            stroke="hsl(220 14% 18%)"
            strokeWidth="8"
          />
          <motion.circle
            cx="60" cy="60" r="52"
            fill="none"
            className={scoreStrokeColor(result.totalScore)}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${gradeColor(result.grade)}`}>
            {result.grade}
          </span>
          <span className="text-[10px] text-muted-foreground">{result.totalScore}/100</span>
        </div>
      </div>

      {/* Sub-scores */}
      <div className="w-full space-y-2.5">
        {result.subScores.map((sub) => (
          <div key={sub.category}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">
                {sub.category} <span className="text-[10px]">({sub.weight}%)</span>
              </span>
              <span className="font-mono font-medium text-foreground">{sub.score}</span>
            </div>
            <div className="h-1.5 bg-secondary/50 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${barColor(sub.score)}`}
                initial={{ width: 0 }}
                animate={{ width: `${sub.score}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
              />
            </div>
            <p className="text-[9px] text-muted-foreground mt-0.5">{sub.details}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
