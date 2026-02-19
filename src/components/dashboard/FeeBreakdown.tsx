import { motion } from "framer-motion";
import { FeeBreakdown as FeeBreakdownType } from "@/types/trading";
import { formatCurrency } from "@/lib/mock-data";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface FeeBreakdownProps {
  data: FeeBreakdownType[];
  totalFees: number;
}

const COLORS = ["hsl(175 80% 50%)", "hsl(38 92% 55%)", "hsl(270 60% 60%)"];

export function FeeBreakdownChart({ data, totalFees }: FeeBreakdownProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="card-trading"
    >
      <h3 className="text-sm font-semibold text-foreground mb-1">Fee Breakdown</h3>
      <p className="stat-label mb-3">Total: ${formatCurrency(totalFees)}</p>

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
    </motion.div>
  );
}
