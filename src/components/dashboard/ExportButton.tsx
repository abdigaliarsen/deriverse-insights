import { Download } from "lucide-react";
import { Trade } from "@/types/trading";
import { exportTradesToCSV, exportTradesToJSON, downloadBlob } from "@/lib/export";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportButtonProps {
  trades: Trade[];
  stats: Record<string, unknown>;
}

export function ExportButton({ trades, stats }: ExportButtonProps) {
  const handleCSV = () => {
    const csv = exportTradesToCSV(trades);
    downloadBlob(csv, `deriverse-trades-${new Date().toISOString().split("T")[0]}.csv`, "text/csv");
  };

  const handleJSON = () => {
    const json = exportTradesToJSON(trades, stats);
    downloadBlob(json, `deriverse-trades-${new Date().toISOString().split("T")[0]}.json`, "application/json");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCSV}>
          Export CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleJSON}>
          Export JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
