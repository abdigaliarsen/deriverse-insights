import { Trade } from "@/types/trading";

const CACHE_KEY_PREFIX = "deriverse-wallet-trades-";
const CACHE_VERSION = 1;
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface SerializedTrade extends Omit<Trade, "entryTime" | "exitTime"> {
  entryTime: string;
  exitTime: string;
}

interface CacheEntry {
  version: number;
  wallet: string;
  trades: SerializedTrade[];
  fetchedAt: number;
  totalSignatures: number;
}

function serializeTrade(t: Trade): SerializedTrade {
  return { ...t, entryTime: t.entryTime.toISOString(), exitTime: t.exitTime.toISOString() };
}

function deserializeTrade(s: SerializedTrade): Trade {
  return { ...s, entryTime: new Date(s.entryTime), exitTime: new Date(s.exitTime) } as Trade;
}

export function getCachedTrades(wallet: string): Trade[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + wallet);
    if (!raw) return null;

    const entry: CacheEntry = JSON.parse(raw);
    if (entry.version !== CACHE_VERSION) return null;
    if (Date.now() - entry.fetchedAt > DEFAULT_TTL_MS) return null;

    return entry.trades.map(deserializeTrade);
  } catch {
    return null;
  }
}

export function setCachedTrades(wallet: string, trades: Trade[], totalSignatures: number): void {
  try {
    const entry: CacheEntry = {
      version: CACHE_VERSION,
      wallet,
      trades: trades.map(serializeTrade),
      fetchedAt: Date.now(),
      totalSignatures,
    };
    localStorage.setItem(CACHE_KEY_PREFIX + wallet, JSON.stringify(entry));
  } catch {
    // localStorage quota exceeded — silently fail
  }
}

export function clearCachedTrades(wallet: string): void {
  localStorage.removeItem(CACHE_KEY_PREFIX + wallet);
}
