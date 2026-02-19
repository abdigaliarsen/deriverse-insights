import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { FeeBreakdown as FeeBreakdownType, Trade } from "@/types/trading";
import { formatCurrency } from "@/lib/mock-data";
import { calculateCumulativeFees } from "@/lib/analytics";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

interface FeeBreakdownProps {
  data: FeeBreakdownType[];
  totalFees: number;
  trades: Trade[];
}

const COLORS = ["hsl(175 80% 50%)", "hsl(38 92% 55%)", "hsl(270 60% 60%)"];

export function FeeBreakdownChart({ data, totalFees, trades }: FeeBreakdownProps) {
  const [view, setView] = useState<"breakdown" | "cumulative">("breakdown");
  const cumFees = useMemo(() => calculateCumulativeFees(trades), [trades]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="card-trading"
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-foreground">Fee Breakdown</h3>
        <div className="flex gap-1">
          {(["breakdown", "cumulative"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2 py-0.5 text-[10px] rounded-md transition-colors font-medium ${
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <p className="stat-label mb-3">Total: ${formatCurrency(totalFees)}</p>

      {view === "breakdown" ? (
        <>
          <div className="h-[140px] mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={60}
                  dataKey="amount"
                  nameKey="type"
                  strokeWidth={0}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(220 18% 10%)",
                    border: "1px solid hsl(220 14% 18%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {data.map((fee, i) => (
              <div key={fee.type} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-muted-foreground">{fee.type}</span>
                </div>
                <span className="font-mono text-foreground">${formatCurrency(fee.amount)}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cumFees}>
              <defs>
                <linearGradient id="feeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(38 92% 55%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(38 92% 55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 15%)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(220 18% 10%)",
                  border: "1px solid hsl(220 14% 18%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => [
                  `$${value.toFixed(2)}`,
                  name === "cumFees" ? "Cumulative Fees" : "Daily Fees",
                ]}
              />
              <Area
                type="monotone"
                dataKey="cumFees"
                stroke="hsl(38 92% 55%)"
                fill="url(#feeGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
