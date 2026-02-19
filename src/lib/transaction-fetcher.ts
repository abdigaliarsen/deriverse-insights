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

const BATCH_SIZE = 25;
const BATCH_DELAY_MS = 100;
const SIGNATURES_PER_PAGE = 1000;
const MAX_RETRIES = 4;
const RETRY_BASE_MS = 1000;

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

// --- Decode a single transaction's logs ---

function decodeTxLogs(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  engine: any,
  sig: string,
  tx: { blockTime: number | null; logMessages: readonly string[] }
): DecodedTransaction | null {
  try {
    const logs = engine.logsDecode(tx.logMessages as string[]);
    if (logs && logs.length > 0) {
      return { signature: sig, blockTime: tx.blockTime ?? 0, logs, slot: 0 };
    }
  } catch {
    // Not a Deriverse transaction
  }
  return null;
}

// --- Public API ---

/**
 * Fetch and decode all Deriverse transactions for a wallet.
 * Calls onDecodedBatch after each batch so the UI can reconstruct trades incrementally.
 * Returns the final complete set of decoded transactions in chronological order.
 */
export async function fetchWalletTransactions(
  walletAddress: string,
  options?: {
    maxTransactions?: number;
    onProgress?: ProgressCallback;
    onDecodedBatch?: (allDecoded: DecodedTransaction[]) => void;
    abortSignal?: AbortSignal;
  }
): Promise<DecodedTransaction[]> {
  const maxTx = options?.maxTransactions ?? 2000;
  const onProgress = options?.onProgress;
  const onDecodedBatch = options?.onDecodedBatch;
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

  // Step 2+3: Fetch transactions in batches, decode immediately, emit incrementally
  const engine = await getInitializedEngine();
  const sigStrings = sigs.map((s) => s.signature);
  const allDecoded: DecodedTransaction[] = [];

  for (let i = 0; i < sigStrings.length; i += BATCH_SIZE) {
    if (abortSignal?.aborted) throw new Error("Aborted");

    const batch = sigStrings.slice(i, i + BATCH_SIZE);
    const promises = batch.map((sig) => fetchOneTransaction(rpc, sig));
    const settled = await Promise.allSettled(promises);

    let batchHasNew = false;
    for (let j = 0; j < settled.length; j++) {
      const result = settled[j];
      if (result.status === "fulfilled" && result.value) {
        const decoded = decodeTxLogs(engine, batch[j], result.value);
        if (decoded) {
          allDecoded.push(decoded);
          batchHasNew = true;
        }
      }
    }

    const fetched = Math.min(i + BATCH_SIZE, sigStrings.length);
    onProgress?.({
      phase: "transactions",
      current: fetched,
      total: sigStrings.length,
      message: `Loading ${fetched}/${sigStrings.length} txs (${allDecoded.length} decoded)...`,
    });

    // Emit incremental update so the hook can reconstruct trades progressively
    if (batchHasNew && onDecodedBatch) {
      const sorted = [...allDecoded].sort((a, b) => a.blockTime - b.blockTime);
      onDecodedBatch(sorted);
    }

    if (i + BATCH_SIZE < sigStrings.length) {
      await delay(BATCH_DELAY_MS);
    }
  }

  // Final sorted result
  const finalDecoded = allDecoded.sort((a, b) => a.blockTime - b.blockTime);

  onProgress?.({
    phase: "done",
    current: finalDecoded.length,
    total: finalDecoded.length,
    message: `Decoded ${finalDecoded.length} transactions`,
  });

  return finalDecoded;
}
