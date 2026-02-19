import { useState, Fragment } from "react";
import { motion } from "framer-motion";
import { Trade } from "@/types/trading";
import { formatPnl } from "@/lib/mock-data";
import { sanitizeInput } from "@/lib/sanitize";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useTradeTags } from "@/hooks/use-trade-tags";
import { TagManager, TagBadges } from "./TagManager";
import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react";

interface TradeHistoryProps {
  trades: Trade[];
}

export function TradeHistory({ trades }: TradeHistoryProps) {
  const [sortField, setSortField] = useState<"exitTime" | "pnl" | "size">("exitTime");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useLocalStorage<Record<string, string>>("deriverse-trade-notes", {});
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { tags, addTag, removeTag, toggleTradeTag, getTradeTagIds } = useTradeTags();

  const sorted = [...trades].sort((a, b) => {
    const mul = sortDir === "asc" ? 1 : -1;
    if (sortField === "exitTime") return mul * (a.exitTime.getTime() - b.exitTime.getTime());
    return mul * ((a[sortField] as number) - (b[sortField] as number));
  });

  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(sorted.length / pageSize);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const handleNoteChange = (tradeId: string, value: string) => {
    const sanitized = sanitizeInput(value, 500);
    setNotes((prev) => ({ ...prev, [tradeId]: sanitized }));
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="card-trading"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">Trade History</h3>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 stat-label">Symbol</th>
              <th className="text-left py-2 px-2 stat-label">Side</th>
              <th className="text-left py-2 px-2 stat-label">Type</th>
              <th className="text-right py-2 px-2 stat-label">Leverage</th>
              <th className="text-right py-2 px-2 stat-label cursor-pointer select-none" onClick={() => toggleSort("size")}>
                <span className="inline-flex items-center gap-1">Size <SortIcon field="size" /></span>
              </th>
              <th className="text-right py-2 px-2 stat-label">Entry</th>
              <th className="text-right py-2 px-2 stat-label">Exit</th>
              <th className="text-right py-2 px-2 stat-label cursor-pointer select-none" onClick={() => toggleSort("pnl")}>
                <span className="inline-flex items-center gap-1">PnL <SortIcon field="pnl" /></span>
              </th>
              <th className="text-right py-2 px-2 stat-label">Fees</th>
              <th className="text-right py-2 px-2 stat-label cursor-pointer select-none" onClick={() => toggleSort("exitTime")}>
                <span className="inline-flex items-center gap-1">Date <SortIcon field="exitTime" /></span>
              </th>
              <th className="text-left py-2 px-2 stat-label">Tags</th>
              <th className="text-center py-2 px-2 stat-label">Notes</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((trade) => {
              const tradeTagIds = getTradeTagIds(trade.id);
              return (
                <Fragment key={trade.id}>
                  <tr
                    className="border-b border-border/30 hover:bg-secondary/30 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === trade.id ? null : trade.id)}
                  >
                    <td className="py-2 px-2 font-mono font-medium text-foreground">{trade.symbol}</td>
                    <td className="py-2 px-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        trade.side === "long" ? "bg-profit/15 text-profit" : "bg-loss/15 text-loss"
                      }`}>
                        {trade.side}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-muted-foreground capitalize">{trade.orderType}</td>
                    <td className="py-2 px-2 text-right font-mono text-muted-foreground">{trade.leverage}x</td>
                    <td className="py-2 px-2 text-right font-mono text-foreground">${trade.size.toFixed(0)}</td>
                    <td className="py-2 px-2 text-right font-mono text-muted-foreground">${trade.entryPrice.toFixed(2)}</td>
                    <td className="py-2 px-2 text-right font-mono text-muted-foreground">${trade.exitPrice.toFixed(2)}</td>
                    <td className={`py-2 px-2 text-right font-mono font-semibold ${trade.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                      {formatPnl(trade.pnl)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-muted-foreground">${trade.fees.toFixed(2)}</td>
                    <td className="py-2 px-2 text-right text-muted-foreground">
                      {trade.exitTime.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td className="py-2 px-2">
                      <TagBadges tags={tags} tagIds={tradeTagIds} />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <MessageSquare className={`h-3 w-3 mx-auto ${notes[trade.id] ? "text-primary" : "text-muted-foreground/40"}`} />
                    </td>
                  </tr>
                  {expandedId === trade.id && (
                    <tr className="border-b border-border/30">
                      <td colSpan={12} className="py-2 px-2 bg-secondary/20">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <TagManager
                              tags={tags}
                              selectedTagIds={tradeTagIds}
                              onToggleTag={(tagId) => toggleTradeTag(trade.id, tagId)}
                              onAddTag={addTag}
                              onRemoveTag={removeTag}
                            />
                          </div>
                          <textarea
                            className="w-full bg-background border border-border rounded p-2 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                            rows={2}
                            maxLength={500}
                            placeholder="Add trade notes..."
                            value={notes[trade.id] || ""}
                            onChange={(e) => handleNoteChange(trade.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages} ({sorted.length} trades)
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground disabled:opacity-30 hover:bg-secondary/80"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground disabled:opacity-30 hover:bg-secondary/80"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
