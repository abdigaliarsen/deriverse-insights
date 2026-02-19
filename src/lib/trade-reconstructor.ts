import { Trade } from "@/types/trading";
import { DecodedTransaction } from "./transaction-fetcher";
import { resolveSymbolForInstrId, getInstrumentType } from "./deriverse-client";

// LogType tags from @deriverse/kit
const LOG_SPOT_PLACE_ORDER = 10;
const LOG_SPOT_FILL_ORDER = 11;
const LOG_SPOT_FEES = 15;
const LOG_PERP_PLACE_ORDER = 18;
const LOG_PERP_FILL_ORDER = 19;
const LOG_PERP_FEES = 23;

// --- Internal Types ---

interface Fill {
  ourSide: "buy" | "sell";
  price: number;
  qty: number;
  fees: number;
  rebates: number;
  timestamp: number;
  txSignature: string;
  instrId: number;
  marketType: "spot" | "perp";
  orderType: "market" | "limit" | "stop";
  leverage: number;
}

interface PositionEntry {
  price: number;
  qty: number;
  fees: number;
  timestamp: number;
  txSignature: string;
  orderType: "market" | "limit" | "stop";
  leverage: number;
}

// --- Extract fills from decoded transactions ---

function mapOrderType(rawOrderType?: number, ioc?: number): "market" | "limit" | "stop" {
  if (ioc === 1) return "market";
  if (rawOrderType === 1) return "market";
  if (rawOrderType === 2) return "stop";
  return "limit";
}

function extractFills(decodedTxs: DecodedTransaction[]): Fill[] {
  const fills: Fill[] = [];

  for (const dtx of decodedTxs) {
    let currentPlaceOrder: {
      side: number;
      orderType: number;
      instrId: number;
      ioc: number;
      leverage: number;
      isPerp: boolean;
    } | null = null;

    for (const log of dtx.logs) {
      // Track placeOrder events for context
      if (log.tag === LOG_SPOT_PLACE_ORDER) {
        currentPlaceOrder = {
          side: log.side,
          orderType: log.orderType ?? 0,
          instrId: log.instrId ?? 0,
          ioc: log.ioc ?? 0,
          leverage: 1,
          isPerp: false,
        };
      } else if (log.tag === LOG_PERP_PLACE_ORDER) {
        currentPlaceOrder = {
          side: log.side,
          orderType: log.orderType ?? 0,
          instrId: log.instrId ?? 0,
          ioc: log.ioc ?? 0,
          leverage: log.leverage ?? 1,
          isPerp: true,
        };
      }
      // Process spot fills
      else if (log.tag === LOG_SPOT_FILL_ORDER) {
        const instrId = currentPlaceOrder?.instrId ?? 0;

        // Determine our side: if we placed a buy order (side=0) and got a fill, we bought.
        // If we placed a sell order (side=1) and got a fill, we sold.
        // If no placeOrder context, infer from the fill's side field:
        // side=0 means a buy was matched (we sold into it), side=1 means a sell was matched (we bought from it)
        let ourSide: "buy" | "sell";
        if (currentPlaceOrder) {
          ourSide = currentPlaceOrder.side === 0 ? "buy" : "sell";
        } else {
          // Passive fill: side in fillOrder = side of the matched order
          // If buy side was matched, someone sold into our buy → we bought
          ourSide = log.side === 0 ? "buy" : "sell";
        }

        fills.push({
          ourSide,
          price: log.price || 0,
          qty: log.qty || 0,
          fees: 0, // Updated from next fee event
          rebates: log.rebates || 0,
          timestamp: dtx.blockTime,
          txSignature: dtx.signature,
          instrId,
          marketType: "spot",
          orderType: mapOrderType(currentPlaceOrder?.orderType, currentPlaceOrder?.ioc),
          leverage: 1,
        });

        // Reset after consuming the fill (placeOrder was consumed)
        currentPlaceOrder = null;
      }
      // Process perp fills
      else if (log.tag === LOG_PERP_FILL_ORDER) {
        const instrId = currentPlaceOrder?.instrId ?? 0;

        let ourSide: "buy" | "sell";
        if (currentPlaceOrder) {
          ourSide = currentPlaceOrder.side === 0 ? "buy" : "sell";
        } else {
          ourSide = log.side === 0 ? "buy" : "sell";
        }

        fills.push({
          ourSide,
          price: log.price || 0,
          qty: log.perps || 0,
          fees: 0,
          rebates: log.rebates || 0,
          timestamp: dtx.blockTime,
          txSignature: dtx.signature,
          instrId,
          marketType: "perp",
          orderType: mapOrderType(currentPlaceOrder?.orderType, currentPlaceOrder?.ioc),
          leverage: currentPlaceOrder?.leverage ?? 1,
        });

        currentPlaceOrder = null;
      }
      // Attach fees to the most recent fill
      else if (log.tag === LOG_SPOT_FEES || log.tag === LOG_PERP_FEES) {
        if (fills.length > 0) {
          fills[fills.length - 1].fees = Math.abs(log.fees || 0);
        }
      }
    }
  }

  return fills;
}

// --- Format symbol ---

function formatSymbol(baseSymbol: string, instrType: "spot" | "perp"): string {
  if (instrType === "perp") {
    const base = baseSymbol.split("/")[0];
    return `${base}-PERP`;
  }
  return baseSymbol;
}

// --- FIFO Position Matching ---

function fifoMatch(fills: Fill[], instrId: number, startId: number): Trade[] {
  const trades: Trade[] = [];
  const buyQueue: PositionEntry[] = [];
  const sellQueue: PositionEntry[] = [];

  let tradeId = startId;
  const rawSymbol = resolveSymbolForInstrId(instrId);
  const instrType = getInstrumentType(instrId);
  const symbol = formatSymbol(rawSymbol, instrType);

  for (const fill of fills) {
    let remainingQty = fill.qty;
    if (remainingQty <= 0 || fill.price <= 0) continue;

    if (fill.ourSide === "buy") {
      // Close open shorts first
      while (remainingQty > 0 && sellQueue.length > 0) {
        const entry = sellQueue[0];
        const matchQty = Math.min(remainingQty, entry.qty);
        const notional = matchQty * entry.price;

        const entryFees = entry.fees * (matchQty / (matchQty + entry.qty));
        const exitFees = fill.fees * (matchQty / fill.qty);
        const totalFees = entryFees + exitFees;

        // Short PnL: (entryPrice - exitPrice) * qty
        const rawPnl = (entry.price - fill.price) * matchQty;
        const pnl = rawPnl - totalFees;
        const pnlPercent = notional > 0 ? (pnl / notional) * 100 : 0;

        trades.push({
          id: `tx-${tradeId++}`,
          symbol,
          side: "short",
          entryPrice: entry.price,
          exitPrice: fill.price,
          size: notional,
          pnl,
          pnlPercent,
          fees: Math.max(0, totalFees),
          entryTime: new Date(entry.timestamp * 1000),
          exitTime: new Date(fill.timestamp * 1000),
          orderType: fill.orderType,
          notes: "",
          leverage: entry.leverage,
          txSignature: fill.txSignature,
          entryTxSignature: entry.txSignature,
          instrId,
          marketType: instrType,
        });

        remainingQty -= matchQty;
        entry.qty -= matchQty;
        if (entry.qty <= 1e-12) sellQueue.shift();
      }

      // Remainder opens new long
      if (remainingQty > 1e-12) {
        buyQueue.push({
          price: fill.price,
          qty: remainingQty,
          fees: fill.fees * (remainingQty / fill.qty),
          timestamp: fill.timestamp,
          txSignature: fill.txSignature,
          orderType: fill.orderType,
          leverage: fill.leverage,
        });
      }
    } else {
      // fill.ourSide === "sell"
      // Close open longs first
      while (remainingQty > 0 && buyQueue.length > 0) {
        const entry = buyQueue[0];
        const matchQty = Math.min(remainingQty, entry.qty);
        const notional = matchQty * entry.price;

        const entryFees = entry.fees * (matchQty / (matchQty + entry.qty));
        const exitFees = fill.fees * (matchQty / fill.qty);
        const totalFees = entryFees + exitFees;

        // Long PnL: (exitPrice - entryPrice) * qty
        const rawPnl = (fill.price - entry.price) * matchQty;
        const pnl = rawPnl - totalFees;
        const pnlPercent = notional > 0 ? (pnl / notional) * 100 : 0;

        trades.push({
          id: `tx-${tradeId++}`,
          symbol,
          side: "long",
          entryPrice: entry.price,
          exitPrice: fill.price,
          size: notional,
          pnl,
          pnlPercent,
          fees: Math.max(0, totalFees),
          entryTime: new Date(entry.timestamp * 1000),
          exitTime: new Date(fill.timestamp * 1000),
          orderType: fill.orderType,
          notes: "",
          leverage: entry.leverage,
          txSignature: fill.txSignature,
          entryTxSignature: entry.txSignature,
          instrId,
          marketType: instrType,
        });

        remainingQty -= matchQty;
        entry.qty -= matchQty;
        if (entry.qty <= 1e-12) buyQueue.shift();
      }

      // Remainder opens new short
      if (remainingQty > 1e-12) {
        sellQueue.push({
          price: fill.price,
          qty: remainingQty,
          fees: fill.fees * (remainingQty / fill.qty),
          timestamp: fill.timestamp,
          txSignature: fill.txSignature,
          orderType: fill.orderType,
          leverage: fill.leverage,
        });
      }
    }
  }

  return trades;
}

// --- Public API ---

/**
 * Reconstruct Trade objects from decoded on-chain transaction logs.
 * Uses FIFO position matching to pair entry fills with exit fills.
 */
export function reconstructTrades(decodedTxs: DecodedTransaction[]): Trade[] {
  // Step 1: Extract all fills
  const fills = extractFills(decodedTxs);

  if (fills.length === 0) return [];

  // Step 2: Group fills by instrument
  const fillsByInstr = new Map<number, Fill[]>();
  for (const fill of fills) {
    const arr = fillsByInstr.get(fill.instrId) || [];
    arr.push(fill);
    fillsByInstr.set(fill.instrId, arr);
  }

  // Step 3: FIFO match per instrument
  const allTrades: Trade[] = [];
  let tradeCounter = 0;

  for (const [instrId, instrFills] of fillsByInstr) {
    const trades = fifoMatch(instrFills, instrId, tradeCounter);
    tradeCounter += trades.length;
    allTrades.push(...trades);
  }

  // Sort by exitTime descending (most recent first)
  return allTrades.sort((a, b) => b.exitTime.getTime() - a.exitTime.getTime());
}
