import { useState } from "react";
import { Calendar as CalendarIcon, Filter } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

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
  const [calendarOpen, setCalendarOpen] = useState(false);

  const isPresetActive = (days: number) =>
    dateRange.from &&
    Math.abs(Date.now() - dateRange.from.getTime() - days * 86400000) < 86400000;

  const isCustom = dateRange.from && !presets.some((p) => isPresetActive(p.days));

  const handleRangeSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      onDateRangeChange({ from: range.from, to: range.to || range.from });
      if (range.to) setCalendarOpen(false);
    }
  };

  const formatRange = () => {
    if (!dateRange.from) return "Pick dates";
    const from = format(dateRange.from, "MMM d");
    const to = dateRange.to ? format(dateRange.to, "MMM d") : "...";
    return `${from} – ${to}`;
  };

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
        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground mr-1" />
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() =>
              onDateRangeChange({
                from: new Date(Date.now() - p.days * 86400000),
                to: new Date(),
              })
            }
            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
              isPresetActive(p.days)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {p.label}
          </button>
        ))}

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                isCustom
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {isCustom ? formatRange() : "Custom"}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={
                dateRange.from
                  ? { from: dateRange.from, to: dateRange.to || undefined }
                  : undefined
              }
              onSelect={handleRangeSelect}
              disabled={{ after: new Date() }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
