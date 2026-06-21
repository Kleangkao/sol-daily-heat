import { clusterApiUrl } from "@solana/web3.js";

/** Solana mainnet-beta — no devnet toggle in this pass. */
export const MAINNET_RPC_URL = clusterApiUrl("mainnet-beta");

export const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

export const MEMO_ACTION_PREFIX = "Solana Space wallet action";

export function solscanTxUrl(signature: string): string {
  return `https://solscan.io/tx/${signature}`;
}
