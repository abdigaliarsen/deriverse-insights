import { Calendar, Filter } from "lucide-react";

interface DashboardFiltersProps {
  symbols: string[];
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
  dateRange: { from: Date | null; to: Date | null };
  onDateRangeChange: (range: { from: Date | null; to: Date | null }) => void;
}

const presets = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "All", days: 365 },
];

export function DashboardFilters({
  symbols,
  selectedSymbol,
  onSymbolChange,
  dateRange,
  onDateRangeChange,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <select
          value={selectedSymbol}
          onChange={(e) => onSymbolChange(e.target.value)}
          className="bg-secondary border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All Symbols</option>
          {symbols.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground mr-1" />
        {presets.map((p) => {
          const isActive = dateRange.from &&
            Math.abs(Date.now() - dateRange.from.getTime() - p.days * 86400000) < 86400000;
          return (
            <button
              key={p.label}
              onClick={() =>
                onDateRangeChange({
                  from: new Date(Date.now() - p.days * 86400000),
                  to: new Date(),
                })
              }
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
