import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Trade } from "@/types/trading";
import { generateInsights, Insight } from "@/lib/insights";
import {
  Calendar, CalendarX, Clock, Gauge, Scale, Timer,
  TrendingUp, Receipt, AlertTriangle, Lightbulb,
  ChevronLeft, ChevronRight,
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  "calendar": <Calendar className="h-4 w-4" />,
  "calendar-x": <CalendarX className="h-4 w-4" />,
  "clock": <Clock className="h-4 w-4" />,
  "gauge": <Gauge className="h-4 w-4" />,
  "scale": <Scale className="h-4 w-4" />,
  "timer": <Timer className="h-4 w-4" />,
  "trending-up": <TrendingUp className="h-4 w-4" />,
  "receipt": <Receipt className="h-4 w-4" />,
  "alert-triangle": <AlertTriangle className="h-4 w-4" />,
};

function InsightCard({ insight }: { insight: Insight }) {
  const severityColors = {
    positive: "border-profit/30 bg-profit/5",
    warning: "border-warning/30 bg-warning/5",
    info: "border-primary/30 bg-primary/5",
  };

  const badgeColors = {
    positive: "bg-profit/20 text-profit",
    warning: "bg-warning/20 text-warning",
    info: "bg-primary/20 text-primary",
  };

  const iconColors = {
    positive: "text-profit",
    warning: "text-warning",
    info: "text-primary",
  };

  return (
    <div className={`h-full rounded-lg border p-3 ${severityColors[insight.severity]}`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`${iconColors[insight.severity]}`}>
          {iconMap[insight.icon] || <Lightbulb className="h-4 w-4" />}
        </div>
        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${badgeColors[insight.severity]}`}>
          {insight.severity === "positive" ? "Strength" : insight.severity === "warning" ? "Watch" : "Insight"}
        </span>
      </div>
      <h4 className="text-xs font-semibold text-foreground mb-1">{insight.title}</h4>
      <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">{insight.description}</p>
      <div className="font-mono text-sm font-bold text-foreground">{insight.value}</div>
    </div>
  );
}

interface InsightsPanelProps {
  trades: Trade[];
}

export function InsightsPanel({ trades }: InsightsPanelProps) {
  const insights = useMemo(() => generateInsights(trades), [trades]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const visibleCount = 4;
  const maxIndex = Math.max(0, insights.length - visibleCount);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  const goTo = useCallback((idx: number) => {
    setCurrentIndex(Math.max(0, Math.min(idx, maxIndex)));
  }, [maxIndex]);

  // Auto-slide every 4 seconds
  useEffect(() => {
    if (isPaused || insights.length <= visibleCount) return;
    timerRef.current = setInterval(goNext, 4000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, goNext, insights.length]);

  if (insights.length === 0) return null;

  const cardWidthPercent = 100 / visibleCount;
  const gapPx = 12; // gap-3 = 0.75rem = 12px

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Trading Insights</h3>
          <span className="text-[10px] text-muted-foreground">({insights.length})</span>
        </div>
        {insights.length > visibleCount && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={goPrev}
              className="p-1 rounded-md hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <div className="flex gap-1">
              {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === currentIndex ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={goNext}
              className="p-1 rounded-md hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div
        className="overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            gap: `${gapPx}px`,
            transform: `translateX(calc(-${currentIndex} * (${cardWidthPercent}% - ${gapPx * (visibleCount - 1) / visibleCount}px + ${gapPx}px)))`,
          }}
        >
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="flex-shrink-0"
              style={{ width: `calc(${cardWidthPercent}% - ${gapPx * (visibleCount - 1) / visibleCount}px)` }}
            >
              <InsightCard insight={insight} />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
