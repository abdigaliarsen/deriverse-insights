import { createSolanaRpc, address } from "@solana/kit";
import { getInitializedEngine, getPreferredRpcUrl } from "./deriverse-client";

// --- Types ---

export interface FetchProgress {
  phase: "signatures" | "transactions" | "decoding" | "done";
  current: number;
  total: number;
  message: string;
}

export interface DecodedTransaction {
  signature: string;
  blockTime: number; // Unix timestamp (seconds)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logs: any[]; // LogMessage[] from @deriverse/kit
  slot: number;
}

export type ProgressCallback = (progress: FetchProgress) => void;

// --- Constants ---

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 500;
const SIGNATURES_PER_PAGE = 1000;
const MAX_RETRIES = 4;
const RETRY_BASE_MS = 2000;

// --- Helpers ---

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// --- Fetch signatures ---

async function fetchSignatures(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: any,
  walletAddr: string,
  maxTx: number,
  onProgress?: ProgressCallback,
  abortSignal?: AbortSignal
): Promise<Array<{ signature: string; blockTime: number | null }>> {
  const addr = address(walletAddr);
  const allSigs: Array<{ signature: string; blockTime: number | null }> = [];
  let before: string | undefined;

  while (allSigs.length < maxTx) {
    if (abortSignal?.aborted) throw new Error("Aborted");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = { limit: SIGNATURES_PER_PAGE };
    if (before) config.before = before;

    const batch = await rpc.getSignaturesForAddress(addr, config).send();
    if (!batch || batch.length === 0) break;

    for (const item of batch) {
      if (item.err === null) {
        allSigs.push({
          signature: String(item.signature),
          blockTime: item.blockTime != null ? Number(item.blockTime) : null,
        });
      }
    }

    before = String(batch[batch.length - 1].signature);
    onProgress?.({
      phase: "signatures",
      current: allSigs.length,
      total: maxTx,
      message: `Found ${allSigs.length} transactions...`,
    });

    if (batch.length < SIGNATURES_PER_PAGE) break;
    await delay(BATCH_DELAY_MS);
  }

  return allSigs.slice(0, maxTx);
}

// --- Fetch single transaction with retries ---

async function fetchOneTransaction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: any,
  sig: string
): Promise<{ blockTime: number | null; logMessages: readonly string[] } | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // @solana/kit v2: signature needs to be the branded Signature type.
      // getSignaturesForAddress already returns branded Signature, but we stored as string.
      // Re-create it — the rpc should accept the raw string for getTransaction.
      const tx = await rpc
        .getTransaction(sig, { maxSupportedTransactionVersion: 0 })
        .send();

      if (!tx || !tx.meta?.logMessages) return null;

      return {
        blockTime: tx.blockTime != null ? Number(tx.blockTime) : null,
        logMessages: tx.meta.logMessages,
      };
    } catch {
      if (attempt < MAX_RETRIES - 1) {
        await delay(RETRY_BASE_MS * Math.pow(2, attempt));
      }
    }
  }
  return null;
}

// --- Fetch transactions in batches ---

async function fetchTransactionBatch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: any,
  signatures: string[],
  onProgress?: ProgressCallback,
  abortSignal?: AbortSignal
): Promise<Map<string, { blockTime: number | null; logMessages: readonly string[] }>> {
  const results = new Map<string, { blockTime: number | null; logMessages: readonly string[] }>();

  for (let i = 0; i < signatures.length; i += BATCH_SIZE) {
    if (abortSignal?.aborted) throw new Error("Aborted");

    const batch = signatures.slice(i, i + BATCH_SIZE);
    const promises = batch.map((sig) => fetchOneTransaction(rpc, sig));
    const settled = await Promise.allSettled(promises);

    for (let j = 0; j < settled.length; j++) {
      const result = settled[j];
      if (result.status === "fulfilled" && result.value) {
        results.set(batch[j], result.value);
      }
    }

    onProgress?.({
      phase: "transactions",
      current: Math.min(i + BATCH_SIZE, signatures.length),
      total: signatures.length,
      message: `Loading ${Math.min(i + BATCH_SIZE, signatures.length)}/${signatures.length} transactions...`,
    });

    if (i + BATCH_SIZE < signatures.length) {
      await delay(BATCH_DELAY_MS);
    }
  }

  return results;
}

// --- Decode logs ---

async function decodeLogs(
  txMap: Map<string, { blockTime: number | null; logMessages: readonly string[] }>,
  sigOrder: string[],
  onProgress?: ProgressCallback
): Promise<DecodedTransaction[]> {
  const engine = await getInitializedEngine();
  const results: DecodedTransaction[] = [];

  for (let i = 0; i < sigOrder.length; i++) {
    const sig = sigOrder[i];
    const tx = txMap.get(sig);
    if (!tx) continue;

    try {
      const logs = engine.logsDecode(tx.logMessages as string[]);
      if (logs && logs.length > 0) {
        results.push({
          signature: sig,
          blockTime: tx.blockTime ?? 0,
          logs,
          slot: 0,
        });
      }
    } catch {
      // Skip transactions that fail to decode (not Deriverse program txs)
    }

    if (i % 50 === 0) {
      onProgress?.({
        phase: "decoding",
        current: i + 1,
        total: sigOrder.length,
        message: `Decoding ${i + 1}/${sigOrder.length}...`,
      });
    }
  }

  // Return in chronological order (oldest first)
  return results.sort((a, b) => a.blockTime - b.blockTime);
}

// --- Public API ---

/**
 * Fetch and decode all Deriverse transactions for a wallet.
 * Returns decoded transaction logs in chronological order (oldest first).
 */
export async function fetchWalletTransactions(
  walletAddress: string,
  options?: {
    maxTransactions?: number;
    onProgress?: ProgressCallback;
    abortSignal?: AbortSignal;
  }
): Promise<DecodedTransaction[]> {
  const maxTx = options?.maxTransactions ?? 2000;
  const onProgress = options?.onProgress;
  const abortSignal = options?.abortSignal;

  // Use Helius RPC for better rate limits
  const rpcUrl = getPreferredRpcUrl();
  const rpc = createSolanaRpc(rpcUrl);

  // Step 1: Fetch all signatures
  onProgress?.({ phase: "signatures", current: 0, total: 0, message: "Finding transactions..." });
  const sigs = await fetchSignatures(rpc, walletAddress, maxTx, onProgress, abortSignal);

  if (sigs.length === 0) {
    onProgress?.({ phase: "done", current: 0, total: 0, message: "No transactions found" });
    return [];
  }

  // Step 2: Fetch transaction details
  const sigStrings = sigs.map((s) => s.signature);
  const txMap = await fetchTransactionBatch(rpc, sigStrings, onProgress, abortSignal);

  // Step 3: Decode logs
  const decoded = await decodeLogs(txMap, sigStrings, onProgress);

  onProgress?.({
    phase: "done",
    current: decoded.length,
    total: decoded.length,
    message: `Decoded ${decoded.length} transactions`,
  });

  return decoded;
}
