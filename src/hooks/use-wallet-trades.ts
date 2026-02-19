import { useState, useEffect, useCallback, useRef } from "react";
import { Trade } from "@/types/trading";
import { useLocalStorage } from "./use-local-storage";
import { fetchWalletTransactions, FetchProgress } from "@/lib/transaction-fetcher";
import { reconstructTrades } from "@/lib/trade-reconstructor";
import { getCachedTrades, setCachedTrades, clearCachedTrades } from "@/lib/wallet-cache";

const DEFAULT_WALLET = "FzzkRifeTpLAcgS52SnHeFbHmeYqscyPaiNADBrckEJu";

export interface WalletTradesState {
  trades: Trade[];
  wallet: string;
  setWallet: (addr: string) => void;
  isLoading: boolean;
  isCached: boolean;
  progress: FetchProgress | null;
  error: string | null;
  refresh: () => void;
  tradeCount: number;
}

export function useWalletTrades(): WalletTradesState {
  const [wallet, setWalletRaw] = useLocalStorage<string>("deriverse-wallet-address", DEFAULT_WALLET);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [progress, setProgress] = useState<FetchProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchTrades = useCallback(async (walletAddr: string, skipCache: boolean) => {
    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Check cache first
    if (!skipCache) {
      const cached = getCachedTrades(walletAddr);
      if (cached) {
        setTrades(cached);
        setIsCached(true);
        setIsLoading(false);
        setError(null);
        setProgress(null);
        return;
      }
    }

    setIsLoading(true);
    setIsCached(false);
    setError(null);
    setTrades([]);
    setProgress({ phase: "signatures", current: 0, total: 0, message: "Starting..." });

    try {
      // Validate wallet address format (base58, 32-44 chars)
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddr)) {
        throw new Error("Invalid Solana wallet address");
      }

      const decodedTxs = await fetchWalletTransactions(walletAddr, {
        maxTransactions: 2000,
        onProgress: (p) => {
          if (!controller.signal.aborted) setProgress(p);
        },
        onDecodedBatch: (decoded) => {
          if (!controller.signal.aborted) {
            const partial = reconstructTrades(decoded);
            setTrades(partial);
          }
        },
        abortSignal: controller.signal,
      });

      if (controller.signal.aborted) return;

      const reconstructed = reconstructTrades(decodedTxs);

      // Cache final results
      setCachedTrades(walletAddr, reconstructed, decodedTxs.length);

      setTrades(reconstructed);
      setProgress({
        phase: "done",
        current: reconstructed.length,
        total: reconstructed.length,
        message: `Found ${reconstructed.length} trades`,
      });
    } catch (e) {
      if (controller.signal.aborted) return;
      const msg = e instanceof Error ? e.message : "Failed to fetch trades";
      setError(msg);
      setTrades([]);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  // Fetch when wallet changes
  useEffect(() => {
    if (wallet) {
      fetchTrades(wallet, false);
    }
    return () => {
      abortRef.current?.abort();
    };
  }, [wallet, fetchTrades]);

  const setWallet = useCallback(
    (addr: string) => {
      const trimmed = addr.trim();
      if (trimmed) setWalletRaw(trimmed);
    },
    [setWalletRaw]
  );

  const refresh = useCallback(() => {
    clearCachedTrades(wallet);
    fetchTrades(wallet, true);
  }, [wallet, fetchTrades]);

  return {
    trades,
    wallet,
    setWallet,
    isLoading,
    isCached,
    progress,
    error,
    refresh,
    tradeCount: trades.length,
  };
}
