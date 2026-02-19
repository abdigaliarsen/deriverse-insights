/**
 * Find the most active wallets trading on the Deriverse protocol (Solana mainnet).
 *
 * Uses @solana/kit v2 to:
 *   1. Fetch recent transaction signatures for the Deriverse program
 *   2. Get transaction details for each signature (with aggressive retry + backoff)
 *   3. Extract the signer (first account key) from each transaction
 *   4. Rank wallets by transaction count
 *
 * The public mainnet RPC is heavily rate-limited for getTransaction calls,
 * so this script uses long delays (1.5s) and exponential backoff retries.
 */

import { createSolanaRpc, address } from "@solana/kit";

const DERIVERSE_PROGRAM_ID = "DRVSpZ2YUYYKgZP8XtLhAGtT1zYSCKzeHfb4DgRnrgqD";
const RPC_URL = "https://api.mainnet-beta.solana.com";
const SIGNATURE_FETCH_LIMIT = 100;
const DELAY_MS = 1500;        // 1.5s between requests to respect public RPC limits
const MAX_RETRIES = 5;        // more retries
const RETRY_BASE_MS = 3000;   // 3s base retry delay with exponential backoff

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(fn, label = "", retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt < retries) {
        // Exponential backoff: 3s, 6s, 12s, 24s
        const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
}

async function main() {
  console.log("=== Deriverse Active Wallet Finder ===\n");
  console.log(`Program ID: ${DERIVERSE_PROGRAM_ID}`);
  console.log(`RPC endpoint: ${RPC_URL}`);
  console.log(`Fetching up to ${SIGNATURE_FETCH_LIMIT} recent signatures...\n`);

  const rpc = createSolanaRpc(RPC_URL);
  const programAddress = address(DERIVERSE_PROGRAM_ID);

  // 1. Fetch recent transaction signatures
  let signatures;
  try {
    signatures = await fetchWithRetry(
      () => rpc.getSignaturesForAddress(programAddress, { limit: SIGNATURE_FETCH_LIMIT }).send(),
      "getSignaturesForAddress"
    );
  } catch (err) {
    console.error("Failed to fetch signatures:", err.message || err);
    process.exit(1);
  }

  console.log(`Fetched ${signatures.length} transaction signatures.`);

  const successSigs = signatures.filter((s) => s.err === null);
  const errorSigs = signatures.filter((s) => s.err !== null);
  console.log(`  - ${successSigs.length} successful transactions`);
  console.log(`  - ${errorSigs.length} failed transactions (will be skipped)\n`);

  if (successSigs.length === 0) {
    console.log("No successful transactions found for this program.");
    return;
  }

  // 2. Fetch transaction details in sequence with delays
  const walletCounts = new Map();
  let fetchedCount = 0;
  let failCount = 0;

  for (let i = 0; i < successSigs.length; i++) {
    const sig = successSigs[i].signature;

    try {
      const tx = await fetchWithRetry(
        () => rpc.getTransaction(sig, { maxSupportedTransactionVersion: 0 }).send(),
        `getTransaction[${i}]`
      );

      if (tx && tx.transaction && tx.transaction.message) {
        const accountKeys = tx.transaction.message.accountKeys;
        if (accountKeys && accountKeys.length > 0) {
          const signer = accountKeys[0];
          walletCounts.set(signer, (walletCounts.get(signer) || 0) + 1);
          fetchedCount++;
        }
      }
    } catch (err) {
      failCount++;
    }

    if ((i + 1) % 10 === 0 || i === successSigs.length - 1) {
      console.log(`  Processed ${i + 1}/${successSigs.length} transactions (${fetchedCount} fetched, ${failCount} failed)...`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`\nDone. ${fetchedCount} transactions fetched, ${failCount} failed.\n`);

  // 3. Sort and display
  const sorted = [...walletCounts.entries()].sort((a, b) => b[1] - a[1]);
  const top10 = sorted.slice(0, 10);

  console.log("=== Top 10 Most Active Wallets ===\n");
  console.log("Rank | Wallet Address                                       | Tx Count");
  console.log("-----|--------------------------------------------------------|----------");
  top10.forEach(([wallet, count], index) => {
    const rank = String(index + 1).padStart(4);
    const addr = String(wallet).padEnd(54);
    const cnt = String(count).padStart(8);
    console.log(`${rank} | ${addr} | ${cnt}`);
  });

  if (sorted.length > 10) {
    console.log(`\n  ... and ${sorted.length - 10} more unique wallets.`);
  }
  console.log(`\nTotal unique wallets found: ${walletCounts.size}`);
  console.log(`Success rate: ${fetchedCount}/${successSigs.length} (${((fetchedCount / successSigs.length) * 100).toFixed(1)}%)`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
