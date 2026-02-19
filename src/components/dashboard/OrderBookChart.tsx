import { useMemo } from "react";
import { motion } from "framer-motion";
import { OrderBookData, InstrumentInfo, DERIVERSE_PROGRAM_ID, solscanAccountUrl, solscanMintUrl } from "@/lib/deriverse-client";
import { formatCurrency } from "@/lib/mock-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink } from "lucide-react";

interface OrderBookChartProps {
  orderBook: OrderBookData;
  instruments: InstrumentInfo[];
  selectedInstrument: string;
  onInstrumentChange: (id: string) => void;
}

export function OrderBookChart({ orderBook, instruments, selectedInstrument, onInstrumentChange }: OrderBookChartProps) {
  const { bids, asks, midPrice, spread } = orderBook;
  const currentInstr = instruments.find((i) => i.id === selectedInstrument);

  const maxCumSize = useMemo(() => {
    const maxBid = bids.length > 0 ? bids[bids.length - 1].cumSize : 0;
    const maxAsk = asks.length > 0 ? asks[asks.length - 1].cumSize : 0;
    return Math.max(maxBid, maxAsk, 1);
  }, [bids, asks]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="card-trading"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Order Book Depth</h3>
        <div className="flex items-center gap-2">
          {currentInstr?.marketAddress && (
            <a
              href={solscanAccountUrl(currentInstr.marketAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground/50 hover:text-primary transition-colors"
              title="View on-chain market account"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <Select value={selectedInstrument} onValueChange={onInstrumentChange}>
            <SelectTrigger className="w-[140px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {instruments.map((instr) => (
                <SelectItem key={instr.id} value={instr.id} className="text-xs">
                  {instr.header.symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mid price and spread */}
      <div className="flex items-center justify-center gap-4 mb-4 text-xs">
        <div>
          <span className="text-muted-foreground">Mid Price: </span>
          <span className="font-mono font-semibold text-foreground">
            ${midPrice < 1 ? midPrice.toFixed(4) : formatCurrency(midPrice)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Spread: </span>
          <span className="font-mono font-semibold text-foreground">
            ${spread < 0.01 ? spread.toFixed(6) : spread.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Depth visualization */}
      <div className="space-y-0.5">
        {/* Asks (reversed so lowest ask is at bottom) */}
        {[...asks].reverse().map((ask, i) => (
          <div key={`ask-${i}`} className="flex items-center gap-2 h-5">
            <div className="w-20 text-right">
              <span className="font-mono text-[10px] text-loss">
                ${ask.price < 1 ? ask.price.toFixed(4) : ask.price.toFixed(2)}
              </span>
            </div>
            <div className="flex-1 flex justify-end">
              <div
                className="h-4 bg-loss/20 border-r-2 border-loss/60 rounded-l-sm"
                style={{ width: `${(ask.cumSize / maxCumSize) * 100}%` }}
              />
            </div>
            <div className="w-16 text-right">
              <span className="font-mono text-[10px] text-muted-foreground">
                {formatCurrency(ask.size)}
              </span>
            </div>
          </div>
        ))}

        {/* Spread indicator */}
        <div className="flex items-center gap-2 h-6 border-y border-dashed border-border/50 my-1">
          <div className="w-20" />
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[10px] text-primary font-medium">
              ← Spread: ${spread < 0.01 ? spread.toFixed(6) : spread.toFixed(2)} →
            </span>
          </div>
          <div className="w-16" />
        </div>

        {/* Bids */}
        {bids.map((bid, i) => (
          <div key={`bid-${i}`} className="flex items-center gap-2 h-5">
            <div className="w-20 text-right">
              <span className="font-mono text-[10px] text-profit">
                ${bid.price < 1 ? bid.price.toFixed(4) : bid.price.toFixed(2)}
              </span>
            </div>
            <div className="flex-1">
              <div
                className="h-4 bg-profit/20 border-l-2 border-profit/60 rounded-r-sm"
                style={{ width: `${(bid.cumSize / maxCumSize) * 100}%` }}
              />
            </div>
            <div className="w-16 text-right">
              <span className="font-mono text-[10px] text-muted-foreground">
                {formatCurrency(bid.size)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>On-chain depth</span>
          {currentInstr?.assetMint && (
            <a
              href={solscanMintUrl(currentInstr.assetMint)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-1 py-0.5 bg-secondary/40 rounded hover:text-primary transition-colors"
            >
              {currentInstr.symbol.split("/")[0]}
            </a>
          )}
          {currentInstr?.crncyMint && (
            <a
              href={solscanMintUrl(currentInstr.crncyMint)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-1 py-0.5 bg-secondary/40 rounded hover:text-primary transition-colors"
            >
              {currentInstr.symbol.split("/")[1]}
            </a>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-profit/40" /> Bids
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-loss/40" /> Asks
          </span>
        </div>
      </div>
    </motion.div>
  );
}
