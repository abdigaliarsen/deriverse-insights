import { Engine, PROGRAM_ID } from "@deriverse/kit";
import { createSolanaRpc } from "@solana/kit";

const MAINNET_RPCS = [
  "https://api.mainnet-beta.solana.com",
  "https://mainnet.helius-rpc.com/?api-key=9f3b050a-4edd-4a78-ba63-d1a114e1913a",
];

// Well-known Solana token mints → symbols
const MINT_SYMBOLS: Record<string, string> = {
  So11111111111111111111111111111111111111112: "SOL",
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "USDT",
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: "JUP",
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: "BONK",
  EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm: "WIF",
  RaydiumPoo111111111111111111111111111111111: "RAY",
};

// Reverse map: symbol → mint address
const SYMBOL_MINTS: Record<string, string> = Object.fromEntries(
  Object.entries(MINT_SYMBOLS).map(([mint, sym]) => [sym, mint])
);

/** Get Solscan URL for a token mint */
export function solscanMintUrl(mint: string): string {
  return `https://solscan.io/token/${mint}`;
}

/** Get Solscan URL for an account */
export function solscanAccountUrl(address: string): string {
  return `https://solscan.io/account/${address}`;
}

/** Look up the mint address for a trading symbol like "SOL-PERP" or "SOL/USDC" */
export function getMintForSymbol(symbol: string): string | null {
  // Handle formats: "SOL-PERP", "SOL/USDC", "SOL"
  const base = symbol.replace("-PERP", "").split("/")[0].trim();
  return SYMBOL_MINTS[base] || null;
}

let engineInstance: Engine | null = null;
let currentRpcIndex = 0;
let tokenSymbolMap: Map<number, string> = new Map();

/** Return the preferred (Helius) RPC URL for trade history fetching */
export function getPreferredRpcUrl(): string {
  return MAINNET_RPCS[1] || MAINNET_RPCS[0];
}

/** Resolve an instrument ID to its human-readable symbol (e.g. "SOL/USDC") */
export function resolveSymbolForInstrId(instrId: number): string {
  if (!engineInstance) return `INSTR-${instrId}`;
  const instr = engineInstance.instruments.get(instrId);
  if (!instr) return `INSTR-${instrId}`;
  const h = instr.header;
  return resolveSymbol(h.assetTokenId, h.crncyTokenId);
}

/** Check if an instrument supports perpetual trading */
export function getInstrumentType(instrId: number): "spot" | "perp" {
  if (!engineInstance) return "spot";
  const instr = engineInstance.instruments.get(instrId);
  if (!instr) return "spot";
  return (instr.header.mask & 8) !== 0 ? "perp" : "spot";
}

function createEngine(): Engine {
  const rpcUrl = MAINNET_RPCS[currentRpcIndex % MAINNET_RPCS.length];
  const rpc = createSolanaRpc(rpcUrl);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Engine(rpc as any, { uiNumbers: true });
}

export async function getInitializedEngine(): Promise<Engine> {
  if (engineInstance && engineInstance.instruments?.size > 0) {
    return engineInstance;
  }

  // Try each RPC endpoint
  for (let attempt = 0; attempt < MAINNET_RPCS.length; attempt++) {
    try {
      const engine = createEngine();
      const ok = await engine.initialize();
      if (!ok) {
        currentRpcIndex++;
        continue;
      }

      // Build token symbol map from engine tokens
      tokenSymbolMap = new Map();
      if (engine.tokens) {
        for (const [id, token] of engine.tokens) {
          const addr = String(token.address);
          const sym = MINT_SYMBOLS[addr];
          if (sym) tokenSymbolMap.set(id, sym);
        }
      }

      engineInstance = engine;
      return engine;
    } catch {
      currentRpcIndex++;
    }
  }

  throw new Error("All RPC endpoints failed");
}

function resolveSymbol(assetTokenId: number, crncyTokenId: number): string {
  const asset = tokenSymbolMap.get(assetTokenId) || `T${assetTokenId}`;
  const crncy = tokenSymbolMap.get(crncyTokenId) || `T${crncyTokenId}`;
  return `${asset}/${crncy}`;
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
  // Extra fields from on-chain data
  perpBestBid: number;
  perpBestAsk: number;
  perpDayCrncyTokens: number;
  alltimeTrades: number;
  perpAlltimeTrades: number;
  dayTrades: number;
  perpDayTrades: number;
  maxLeverage: number;
  avgSpread: number;
  perpClientsCount: number;
  variance: number;
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
  assetMint: string;
  crncyMint: string;
  marketAddress: string;
}

export async function fetchAllInstruments(): Promise<InstrumentInfo[]> {
  const engine = await getInitializedEngine();
  const instruments: InstrumentInfo[] = [];

  for (const [instrId, instr] of engine.instruments) {
    // Load full instrument data (orderbook + all header fields)
    try {
      await engine.updateInstrData({ instrId });
    } catch {
      // Use partial header data if full load fails
    }

    const h = instr.header;
    const symbol = resolveSymbol(h.assetTokenId, h.crncyTokenId);

    const lastPx = h.lastPx || 0;
    const bestBid = h.bestBid || 0;
    const bestAsk = h.bestAsk || 0;
    const dayHigh = h.dayHigh || 0;
    const dayLow = h.dayLow || 0;

    const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
    const change24h = h.lastClose > 0 ? ((lastPx - h.lastClose) / h.lastClose) * 100 : 0;

    // mask bit 3 = perp-enabled
    const isPerp = (h.mask & 8) !== 0;

    instruments.push({
      id: String(instrId),
      symbol,
      type: isPerp ? "perp" : "spot",
      assetMint: h.assetMint ? String(h.assetMint) : (SYMBOL_MINTS[tokenSymbolMap.get(h.assetTokenId) || ""] || ""),
      crncyMint: h.crncyMint ? String(h.crncyMint) : (SYMBOL_MINTS[tokenSymbolMap.get(h.crncyTokenId) || ""] || ""),
      marketAddress: instr.address ? String(instr.address) : "",
      header: {
        instrId: String(instrId),
        symbol,
        lastPx,
        bestBid,
        bestAsk,
        spread,
        dayHigh,
        dayLow,
        dayAssetTokens: h.dayAssetTokens || 0,
        dayCrncyTokens: h.dayCrncyTokens || 0,
        perpFundingRate: h.perpFundingRate || 0,
        perpOpenInt: h.perpOpenInt || 0,
        dayVolatility: h.dayVolatility || 0,
        change24h,
        perpBestBid: h.perpBestBid || 0,
        perpBestAsk: h.perpBestAsk || 0,
        perpDayCrncyTokens: h.perpDayCrncyTokens || 0,
        alltimeTrades: h.alltimeTrades || 0,
        perpAlltimeTrades: h.perpAlltimeTrades || 0,
        dayTrades: h.dayTrades || 0,
        perpDayTrades: h.perpDayTrades || 0,
        maxLeverage: h.maxLeverage || 0,
        avgSpread: h.avgSpread || 0,
        perpClientsCount: h.perpClientsCount || 0,
        variance: h.variance || 0,
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
  const engine = await getInitializedEngine();
  const emptyBook: OrderBookData = { bids: [], asks: [], midPrice: 0, spread: 0 };

  const numId = parseInt(instrId, 10);
  const instr = engine.instruments.get(numId);
  if (!instr) return emptyBook;

  // Refresh instrument data for latest orderbook
  try {
    await engine.updateInstrData({ instrId: numId });
  } catch {
    // Use existing data
  }

  // Prefer perp orderbook if available, fall back to spot
  const rawBids = (instr.perpBids?.length > 0 ? instr.perpBids : instr.spotBids) || [];
  const rawAsks = (instr.perpAsks?.length > 0 ? instr.perpAsks : instr.spotAsks) || [];

  let cumBid = 0;
  const bids: OrderBookEntry[] = rawBids.map((b) => {
    const price = b.px || 0;
    const size = b.qty || 0;
    cumBid += size;
    return { price, size, cumSize: cumBid };
  });

  let cumAsk = 0;
  const asks: OrderBookEntry[] = rawAsks.map((a) => {
    const price = a.px || 0;
    const size = a.qty || 0;
    cumAsk += size;
    return { price, size, cumSize: cumAsk };
  });

  const bestBid = bids.length > 0 ? bids[0].price : 0;
  const bestAsk = asks.length > 0 ? asks[0].price : 0;
  const midPrice = bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : bestBid || bestAsk;
  const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;

  return { bids, asks, midPrice, spread };
}

// Force engine re-initialization on next fetch (e.g. after RPC failure)
export function resetEngine(): void {
  engineInstance = null;
  tokenSymbolMap = new Map();
}

// Mock data fallback when mainnet is unavailable
export function getMockMarketData(): InstrumentInfo[] {
  const mockInstruments: { symbol: string; type: "spot" | "perp"; lastPx: number; bid: number; ask: number }[] = [
    { symbol: "SOL/USDC", type: "perp", lastPx: 178.42, bid: 178.38, ask: 178.46 },
    { symbol: "BTC/USDC", type: "perp", lastPx: 97250.00, bid: 97245.00, ask: 97255.00 },
    { symbol: "ETH/USDC", type: "perp", lastPx: 3485.50, bid: 3485.00, ask: 3486.00 },
    { symbol: "JUP/USDC", type: "spot", lastPx: 1.24, bid: 1.235, ask: 1.245 },
    { symbol: "WIF/USDC", type: "perp", lastPx: 2.15, bid: 2.14, ask: 2.16 },
    { symbol: "BONK/USDC", type: "spot", lastPx: 0.0000234, bid: 0.0000233, ask: 0.0000235 },
  ];

  return mockInstruments.map((m, i) => {
    const base = m.symbol.split("/")[0];
    const quote = m.symbol.split("/")[1];
    return {
    id: String(i),
    symbol: m.symbol,
    type: m.type,
    assetMint: SYMBOL_MINTS[base] || "",
    crncyMint: SYMBOL_MINTS[quote] || "",
    marketAddress: "",
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
      perpBestBid: 0,
      perpBestAsk: 0,
      perpDayCrncyTokens: 0,
      alltimeTrades: 0,
      perpAlltimeTrades: 0,
      dayTrades: 0,
      perpDayTrades: 0,
      maxLeverage: 0,
      avgSpread: 0,
      perpClientsCount: 0,
      variance: 0,
    },
  };
  });
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

export const DERIVERSE_PROGRAM_ID = PROGRAM_ID;
