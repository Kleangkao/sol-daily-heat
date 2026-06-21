import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import { MAINNET_RPC_URL, MEMO_ACTION_PREFIX, MEMO_PROGRAM_ID } from "@/lib/wallet/mainnet";

const MEMO_PROGRAM = new PublicKey(MEMO_PROGRAM_ID);

export function buildMemoText(timestamp = new Date()): string {
  return `${MEMO_ACTION_PREFIX} · ${timestamp.toISOString()}`;
}

export function buildOwnershipMessage(walletAddress: string, timestamp = new Date()): string {
  return [
    "Solana Space wallet verification",
    `Wallet: ${walletAddress}`,
    `Timestamp: ${timestamp.toISOString()}`,
    "This message does not move funds or authorize any transaction.",
  ].join("\n");
}

function createMemoInstruction(memo: string, signer: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    keys: [{ pubkey: signer, isSigner: true, isWritable: true }],
    programId: MEMO_PROGRAM,
    data: Buffer.from(memo, "utf8"),
  });
}

export async function buildMemoTransaction(
  walletAddress: string,
  memo: string = buildMemoText(),
  rpcUrl: string = MAINNET_RPC_URL
): Promise<Transaction> {
  if (memo.length >= 900) {
    throw new Error("Memo text is too large for a Solana transaction.");
  }

  const payer = new PublicKey(walletAddress);
  const connection = new Connection(rpcUrl, "confirmed");
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction({
    feePayer: payer,
    blockhash,
    lastValidBlockHeight,
  });
  transaction.add(createMemoInstruction(memo, payer));
  return transaction;
}
