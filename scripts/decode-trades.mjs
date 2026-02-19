/**
 * Decode real Deriverse trading transactions from Solana mainnet.
 *
 * Connects to Solana via RPC, initializes the Deriverse Engine,
 * fetches recent transactions for a specific wallet, and decodes the
 * on-chain log messages into structured trade events using @deriverse/kit.
 */

import { createSolanaRpc, address } from "@solana/kit";
import { createRequire } from "module";

// @deriverse/kit is CJS, so we need createRequire for ESM context
const require = createRequire(import.meta.url);
const { Engine, LogType } = require("@deriverse/kit");

// ── Configuration ──────────────────────────────────────────────────────────────
const WALLET = "FzzkRifeTpLAcgS52SnHeFbHmeYqscyPaiNADBrckEJu";
const RPC_URL = "https://api.mainnet-beta.solana.com";
const SIGNATURE_LIMIT = 20;
const DELAY_MS = 2000; // delay between RPC calls to avoid rate-limiting
const MAX_RETRIES = 5;
const RETRY_BASE_MS = 3000;

// ── Helpers ────────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(fn, label = "", retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err?.message || String(err);
      if (attempt < retries) {
        const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1);
        console.log(
          `  [retry ${attempt}/${retries}] ${label} failed: ${msg} -- waiting ${delay}ms`
        );
        await sleep(delay);
      } else {
        throw new Error(`${label} failed after ${retries} attempts: ${msg}`);
      }
    }
  }
}

/** Reverse-lookup: LogType enum value -> human-readable name */
const logTypeNames = Object.fromEntries(
  Object.entries(LogType)
    .filter(([, v]) => typeof v === "number")
    .map(([name, value]) => [value, name])
);

function logTypeName(tag) {
  return logTypeNames[tag] ?? `unknown(${tag})`;
}

function formatTime(unixSeconds) {
  if (!unixSeconds) return "N/A";
  return new Date(unixSeconds * 1000).toISOString();
}

/** Pretty-print all enumerable fields of a decoded log object */
function printLogFields(log) {
  const skip = new Set(["tag"]); // tag is printed separately as the type name
  for (const [key, value] of Object.entries(log)) {
    if (skip.has(key)) continue;
    if (typeof value === "function") continue;
    // Format the time field as a human-readable date as well
    if (key === "time" && typeof value === "number" && value > 1_000_000_000) {
      console.log(`      ${key}: ${value}  (${formatTime(value)})`);
    } else {
      console.log(`      ${key}: ${value}`);
    }
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Deriverse Trade Decoder ===\n");
  console.log(`Wallet:  ${WALLET}`);
  console.log(`RPC:     ${RPC_URL}`);
  console.log(`Limit:   last ${SIGNATURE_LIMIT} transactions\n`);

  // 1. Create RPC connection
  const rpc = createSolanaRpc(RPC_URL);

  // 2. Initialize the Deriverse engine (loads root state, tokens, instruments)
  console.log("[1/3] Initializing Deriverse Engine...");
  const engine = new Engine(rpc, { uiNumbers: true });
  const initOk = await engine.initialize();
  if (!initOk) {
    console.error("Engine initialization returned false. Cannot proceed.");
    process.exit(1);
  }
  console.log(
    `  Engine ready -- ${engine.instruments.size} instruments, ${engine.tokens.size} tokens loaded.\n`
  );

  // 3. Fetch recent signatures for the wallet
  console.log(`[2/3] Fetching last ${SIGNATURE_LIMIT} signatures for wallet...`);
  const walletAddress = address(WALLET);

  const signatures = await fetchWithRetry(
    () =>
      rpc
        .getSignaturesForAddress(walletAddress, { limit: SIGNATURE_LIMIT })
        .send(),
    "getSignaturesForAddress"
  );

  console.log(`  Received ${signatures.length} signatures.\n`);

  if (signatures.length === 0) {
    console.log("No transactions found for this wallet. Exiting.");
    return;
  }

  // 4. Fetch each transaction and decode its logs
  console.log("[3/3] Fetching and decoding transactions...\n");
  console.log("=".repeat(80));

  let decodedTxCount = 0;
  let totalDecodedLogs = 0;

  for (let i = 0; i < signatures.length; i++) {
    const sigInfo = signatures[i];
    const sig = sigInfo.signature;

    console.log(`\nTransaction ${i + 1}/${signatures.length}`);
    console.log(`  Signature: ${sig}`);
    console.log(`  Slot:      ${sigInfo.slot}`);
    console.log(
      `  BlockTime: ${sigInfo.blockTime ? formatTime(Number(sigInfo.blockTime)) : "N/A"}`
    );

    if (sigInfo.err !== null) {
      console.log(`  Status:    FAILED (${JSON.stringify(sigInfo.err)})`);
      console.log("  Skipping failed transaction.");
      await sleep(DELAY_MS);
      continue;
    }
    console.log(`  Status:    SUCCESS`);

    // Fetch full transaction data
    let tx;
    try {
      tx = await fetchWithRetry(
        () =>
          rpc
            .getTransaction(sig, {
              maxSupportedTransactionVersion: 0,
              encoding: "json",
            })
            .send(),
        `getTransaction[${i}]`
      );
    } catch (err) {
      console.log(`  ERROR fetching transaction: ${err.message}`);
      await sleep(DELAY_MS);
      continue;
    }

    if (!tx) {
      console.log("  Transaction data is null (possibly pruned).");
      await sleep(DELAY_MS);
      continue;
    }

    // Extract log messages from transaction metadata
    const logMessages = tx.meta?.logMessages;
    if (!logMessages || logMessages.length === 0) {
      console.log("  No log messages in this transaction.");
      await sleep(DELAY_MS);
      continue;
    }

    console.log(`  Log lines: ${logMessages.length}`);

    // Decode using the Deriverse engine
    const decoded = engine.logsDecode(logMessages);

    if (decoded.length === 0) {
      console.log("  No Deriverse events decoded (may not be a Deriverse tx).");
    } else {
      decodedTxCount++;
      totalDecodedLogs += decoded.length;
      console.log(`  Decoded events: ${decoded.length}`);
      console.log("  " + "-".repeat(60));

      for (let j = 0; j < decoded.length; j++) {
        const log = decoded[j];
        const typeName = logTypeName(log.tag);
        console.log(`    [${j + 1}] ${typeName} (tag=${log.tag})`);
        printLogFields(log);
        if (j < decoded.length - 1) console.log("");
      }
    }

    console.log("=".repeat(80));
    await sleep(DELAY_MS);
  }

  // Summary
  console.log("\n=== Summary ===");
  console.log(`  Total transactions fetched:  ${signatures.length}`);
  console.log(`  Transactions with events:    ${decodedTxCount}`);
  console.log(`  Total decoded events:        ${totalDecodedLogs}`);
}

main().catch((err) => {
  console.error("\nFATAL ERROR:", err);
  process.exit(1);
});
