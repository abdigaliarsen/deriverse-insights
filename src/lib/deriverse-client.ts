import { Engine } from "@deriverse/kit";

const DEVNET_RPC = "https://api.devnet.solana.com";

let engineInstance: Engine | null = null;

export function getEngine(): Engine {
  if (!engineInstance) {
    engineInstance = new Engine(DEVNET_RPC);
  }
  return engineInstance;
}

export interface MarketData {
  instrId: string;
  symbol: string;
  lastPx: number;
  bestBid: number;
  bestAsk: number;
  spread: number;
  dayHigh: number;
  dayLow: number;
  dayAssetTokens: number;
  dayCrncyTokens: number;
  perpFundingRate: number;
  perpOpenInt: number;
  dayVolatility: number;
  change24h: number;
}

export interface OrderBookEntry {
  price: number;
  size: number;
  cumSize: number;
}

export interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  midPrice: number;
  spread: number;
}

export interface InstrumentInfo {
  id: string;
  symbol: string;
  type: "spot" | "perp";
  header: MarketData;
}

function parseInstrumentSymbol(instr: unknown): string {
  const obj = instr as Record<string, unknown>;
  const header = obj?.header as Record<string, unknown> | undefined;
  const name = (header?.name as string) || (obj?.name as string) || "UNKNOWN";
  return name;
}

function safeNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "bigint") return Number(val);
  if (val && typeof val === "object" && "toNumber" in val) {
    return (val as { toNumber: () => number }).toNumber();
  }
  return Number(val) || 0;
}

export async function fetchAllInstruments(): Promise<InstrumentInfo[]> {
  const engine = getEngine();
  await engine.load();

  const instruments: InstrumentInfo[] = [];

  for (const instr of engine.instruments) {
    const obj = instr as unknown as Record<string, unknown>;
    const header = obj?.header as Record<string, unknown> | undefined;
    if (!header) continue;

    const symbol = parseInstrumentSymbol(instr);
    const lastPx = safeNumber(header.lastPx);
    const bestBid = safeNumber(header.bestBid);
    const bestAsk = safeNumber(header.bestAsk);
    const dayHigh = safeNumber(header.dayHigh);
    const dayLow = safeNumber(header.dayLow);
    const dayAssetTokens = safeNumber(header.dayAssetTokens);
    const dayCrncyTokens = safeNumber(header.dayCrncyTokens);
    const perpFundingRate = safeNumber(header.perpFundingRate);
    const perpOpenInt = safeNumber(header.perpOpenInt);
    const dayVolatility = safeNumber(header.dayVolatility);

    const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
    const change24h = dayLow > 0 ? ((lastPx - dayLow) / dayLow) * 100 : 0;

    const isPerp = symbol.toLowerCase().includes("perp") ||
                   perpOpenInt > 0 ||
                   perpFundingRate !== 0;

    instruments.push({
      id: String(obj.id || instruments.length),
      symbol,
      type: isPerp ? "perp" : "spot",
      header: {
        instrId: String(obj.id || instruments.length),
        symbol,
        lastPx,
        bestBid,
        bestAsk,
        spread,
        dayHigh,
        dayLow,
        dayAssetTokens,
        dayCrncyTokens,
        perpFundingRate,
        perpOpenInt,
        dayVolatility,
        change24h,
      },
    });
  }

  return instruments;
}

export async function fetchMarketData(instrId: string): Promise<MarketData | null> {
  const instruments = await fetchAllInstruments();
  return instruments.find((i) => i.id === instrId)?.header ?? null;
}

export async function fetchOrderBook(instrId: string): Promise<OrderBookData> {
  const engine = getEngine();
  await engine.load();

  const emptyBook: OrderBookData = { bids: [], asks: [], midPrice: 0, spread: 0 };

  const instr = engine.instruments.find(
    (_i, idx) => String(idx) === instrId || String((_i as unknown as Record<string, unknown>).id) === instrId
  );
  if (!instr) return emptyBook;

  const obj = instr as unknown as Record<string, unknown>;

  const rawBids = (obj.spotBids || obj.perpBids || []) as Array<Record<string, unknown>>;
  const rawAsks = (obj.spotAsks || obj.perpAsks || []) as Array<Record<string, unknown>>;

  let cumBid = 0;
  const bids: OrderBookEntry[] = rawBids.map((b) => {
    const price = safeNumber(b.price || b.px);
    const size = safeNumber(b.size || b.qty);
    cumBid += size;
    return { price, size, cumSize: cumBid };
  });

  let cumAsk = 0;
  const asks: OrderBookEntry[] = rawAsks.map((a) => {
    const price = safeNumber(a.price || a.px);
    const size = safeNumber(a.size || a.qty);
    cumAsk += size;
    return { price, size, cumSize: cumAsk };
  });

  const bestBid = bids.length > 0 ? bids[0].price : 0;
  const bestAsk = asks.length > 0 ? asks[0].price : 0;
  const midPrice = bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : bestBid || bestAsk;
  const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;

  return { bids, asks, midPrice, spread };
}

// Mock data fallback when devnet is unavailable
export function getMockMarketData(): InstrumentInfo[] {
  const mockInstruments: { symbol: string; type: "spot" | "perp"; lastPx: number; bid: number; ask: number }[] = [
    { symbol: "SOL/USDC", type: "perp", lastPx: 178.42, bid: 178.38, ask: 178.46 },
    { symbol: "BTC/USDC", type: "perp", lastPx: 97250.00, bid: 97245.00, ask: 97255.00 },
    { symbol: "ETH/USDC", type: "perp", lastPx: 3485.50, bid: 3485.00, ask: 3486.00 },
    { symbol: "JUP/USDC", type: "spot", lastPx: 1.24, bid: 1.235, ask: 1.245 },
    { symbol: "WIF/USDC", type: "perp", lastPx: 2.15, bid: 2.14, ask: 2.16 },
    { symbol: "BONK/USDC", type: "spot", lastPx: 0.0000234, bid: 0.0000233, ask: 0.0000235 },
  ];

  return mockInstruments.map((m, i) => ({
    id: String(i),
    symbol: m.symbol,
    type: m.type,
    header: {
      instrId: String(i),
      symbol: m.symbol,
      lastPx: m.lastPx,
      bestBid: m.bid,
      bestAsk: m.ask,
      spread: m.ask - m.bid,
      dayHigh: m.lastPx * 1.035,
      dayLow: m.lastPx * 0.972,
      dayAssetTokens: Math.random() * 500000 + 100000,
      dayCrncyTokens: Math.random() * 50000000 + 5000000,
      perpFundingRate: m.type === "perp" ? (Math.random() - 0.5) * 0.001 : 0,
      perpOpenInt: m.type === "perp" ? Math.random() * 10000000 + 1000000 : 0,
      dayVolatility: Math.random() * 5 + 1,
      change24h: (Math.random() - 0.45) * 8,
    },
  }));
}

export function getMockOrderBook(): OrderBookData {
  const midPrice = 178.42;
  const bids: OrderBookEntry[] = [];
  const asks: OrderBookEntry[] = [];
  let cumBid = 0;
  let cumAsk = 0;

  for (let i = 0; i < 15; i++) {
    const bidPrice = midPrice - (i + 1) * 0.05;
    const bidSize = Math.random() * 500 + 50;
    cumBid += bidSize;
    bids.push({ price: bidPrice, size: bidSize, cumSize: cumBid });

    const askPrice = midPrice + (i + 1) * 0.05;
    const askSize = Math.random() * 500 + 50;
    cumAsk += askSize;
    asks.push({ price: askPrice, size: askSize, cumSize: cumAsk });
  }

  return { bids, asks, midPrice, spread: 0.10 };
}

export const DERIVERSE_PROGRAM_ID = "DVRSxmkGHGjuyp3VGWwkBJmVMxnABRMZEaDa3atnih3E";
