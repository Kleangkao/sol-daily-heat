import { Connection, Transaction } from "@solana/web3.js";
import {
  browserWalletSupportsSignTransaction,
  browserWalletSupportsTransactions,
  getBrowserWalletProvider,
  signAndSendTransactionWithBrowserWallet,
  signMessageWithBrowserWallet,
  signTransactionWithBrowserWallet,
} from "@/lib/wallet/browser-wallets";
import { bytesToBase58, bytesToBase64 } from "@/lib/wallet/encoding";
import { friendlyWalletActionError } from "@/lib/wallet/errors";
import {
  buildMemoText,
  buildMemoTransaction,
  buildOwnershipMessage,
} from "@/lib/wallet/memo-transaction";
import { MAINNET_RPC_URL, solscanTxUrl } from "@/lib/wallet/mainnet";
import type { BrowserWalletId } from "@/lib/wallet/types";

export type SignMessageResult = {
  message: string;
  signature: string;
};

export type SignMemoResult = {
  memo: string;
  signedTransactionBase64: string;
};

export type SendMemoResult = {
  memo: string;
  signature: string;
  explorerUrl: string;
};

function assertConnected(
  walletId: BrowserWalletId | null,
  address: string | null
): asserts walletId is BrowserWalletId {
  if (!walletId || !address) {
    throw new Error("Connect a wallet first.");
  }
}

function requireAddress(address: string | null): string {
  if (!address) throw new Error("Connect a wallet first.");
  return address;
}

export function walletSupportsMemoSign(id: BrowserWalletId | null): boolean {
  if (!id) return false;
  return browserWalletSupportsSignTransaction(id);
}

export function walletSupportsMemoSend(id: BrowserWalletId | null): boolean {
  if (!id) return false;
  return browserWalletSupportsTransactions(id);
}

export async function signOwnershipMessage(
  walletId: BrowserWalletId | null,
  address: string | null
): Promise<SignMessageResult> {
  assertConnected(walletId, address);
  const walletAddress = requireAddress(address);
  try {
    const message = buildOwnershipMessage(walletAddress);
    const bytes = new TextEncoder().encode(message);
    const signatureBytes = await signMessageWithBrowserWallet(walletId, bytes);
    return {
      message,
      signature: bytesToBase58(signatureBytes),
    };
  } catch (error) {
    throw new Error(friendlyWalletActionError(error), { cause: error });
  }
}

export async function signMemoTransaction(
  walletId: BrowserWalletId | null,
  address: string | null
): Promise<SignMemoResult> {
  assertConnected(walletId, address);
  const walletAddress = requireAddress(address);
  if (!browserWalletSupportsSignTransaction(walletId)) {
    throw new Error("This wallet cannot sign a transaction without sending.");
  }

  try {
    const memo = buildMemoText();
    const transaction = await buildMemoTransaction(walletAddress, memo);
    const signed = await signTransactionWithBrowserWallet(walletId, transaction);
    const serialized =
      signed instanceof Transaction
        ? signed.serialize({ requireAllSignatures: false, verifySignatures: false })
        : serializeSignedTransaction(signed);

    return {
      memo,
      signedTransactionBase64: bytesToBase64(serialized),
    };
  } catch (error) {
    throw new Error(friendlyWalletActionError(error), { cause: error });
  }
}

export async function sendMemoTransaction(
  walletId: BrowserWalletId | null,
  address: string | null
): Promise<SendMemoResult> {
  assertConnected(walletId, address);
  const walletAddress = requireAddress(address);
  if (!browserWalletSupportsTransactions(walletId)) {
    throw new Error("This wallet cannot send transactions.");
  }

  try {
    const memo = buildMemoText();
    const transaction = await buildMemoTransaction(walletAddress, memo);
    const provider = getBrowserWalletProvider(walletId);

    let signature: string;
    if (provider && typeof provider.signAndSendTransaction === "function") {
      signature = await signAndSendTransactionWithBrowserWallet(walletId, transaction);
    } else if (browserWalletSupportsSignTransaction(walletId)) {
      const signed = await signTransactionWithBrowserWallet(walletId, transaction);
      const serialized =
        signed instanceof Transaction
          ? signed.serialize()
          : serializeSignedTransaction(signed);
      const connection = new Connection(MAINNET_RPC_URL, "confirmed");
      signature = await connection.sendRawTransaction(serialized, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });
      await connection.confirmTransaction(signature, "confirmed");
    } else {
      throw new Error("This wallet cannot send transactions.");
    }

    return {
      memo,
      signature,
      explorerUrl: solscanTxUrl(signature),
    };
  } catch (error) {
    throw new Error(friendlyWalletActionError(error), { cause: error });
  }
}

function serializeSignedTransaction(signed: unknown): Uint8Array {
  if (signed instanceof Uint8Array) return signed;
  if (signed instanceof Transaction) return signed.serialize();
  if (typeof signed === "object" && signed !== null && "serialize" in signed) {
    const maybeTx = signed as { serialize: () => Uint8Array };
    if (typeof maybeTx.serialize === "function") {
      return maybeTx.serialize();
    }
  }
  throw new Error("Wallet returned an unexpected signed transaction format.");
}
