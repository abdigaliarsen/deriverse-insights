import { motion } from "framer-motion";
import { InstrumentInfo, DERIVERSE_PROGRAM_ID } from "@/lib/deriverse-client";
import { formatCurrency } from "@/lib/mock-data";
import { Wifi, WifiOff, ExternalLink } from "lucide-react";

interface LiveMarketDataProps {
  instruments: InstrumentInfo[];
  isLive: boolean;
  isLoading: boolean;
  lastUpdated: Date | null;
}

export function LiveMarketData({ instruments, isLive, isLoading, lastUpdated }: LiveMarketDataProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="card-trading"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Live Market Data</h3>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {isLive ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-profit animate-pulse" />
                <Wifi className="h-3 w-3 text-profit" />
                Connected
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                <WifiOff className="h-3 w-3 text-warning" />
                Fallback
              </>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {lastUpdated && (
            <span>Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border/50">
                <th className="text-left py-1.5 pr-3 font-medium">Symbol</th>
                <th className="text-right py-1.5 px-2 font-medium">Last Price</th>
                <th className="text-right py-1.5 px-2 font-medium">24h %</th>
                <th className="text-right py-1.5 px-2 font-medium">Bid</th>
                <th className="text-right py-1.5 px-2 font-medium">Ask</th>
                <th className="text-right py-1.5 px-2 font-medium">Spread</th>
                <th className="text-right py-1.5 px-2 font-medium">Volume</th>
                <th className="text-right py-1.5 px-2 font-medium">OI</th>
                <th className="text-right py-1.5 pl-2 font-medium">Funding</th>
              </tr>
            </thead>
            <tbody>
              {instruments.map((instr) => {
                const h = instr.header;
                return (
                  <tr key={instr.id} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-foreground">{h.symbol}</span>
                        {instr.type === "perp" && (
                          <span className="px-1 py-0.5 text-[9px] bg-primary/20 text-primary rounded">PERP</span>
                        )}
                      </div>
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-foreground">
                      ${h.lastPx < 0.01 ? h.lastPx.toFixed(7) : h.lastPx < 1 ? h.lastPx.toFixed(4) : formatCurrency(h.lastPx)}
                    </td>
                    <td className={`text-right py-2 px-2 font-mono font-medium ${h.change24h >= 0 ? "text-profit" : "text-loss"}`}>
                      {h.change24h >= 0 ? "+" : ""}{h.change24h.toFixed(2)}%
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-profit/80">
                      ${h.bestBid < 1 ? h.bestBid.toFixed(4) : formatCurrency(h.bestBid)}
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-loss/80">
                      ${h.bestAsk < 1 ? h.bestAsk.toFixed(4) : formatCurrency(h.bestAsk)}
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-muted-foreground">
                      ${h.spread < 0.01 ? h.spread.toFixed(6) : h.spread.toFixed(2)}
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-muted-foreground">
                      ${formatCurrency(h.dayCrncyTokens)}
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-muted-foreground">
                      {h.perpOpenInt > 0 ? `$${formatCurrency(h.perpOpenInt)}` : "—"}
                    </td>
                    <td className={`text-right py-2 pl-2 font-mono ${h.perpFundingRate >= 0 ? "text-profit" : "text-loss"}`}>
                      {h.perpFundingRate !== 0 ? `${(h.perpFundingRate * 100).toFixed(4)}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium">
            Powered by Deriverse Protocol
          </span>
        </div>
        <a
          href={`https://solscan.io/account/${DERIVERSE_PROGRAM_ID}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
        >
          <span className="font-mono">{DERIVERSE_PROGRAM_ID.slice(0, 8)}...</span>
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
      </div>
    </motion.div>
  );
}
