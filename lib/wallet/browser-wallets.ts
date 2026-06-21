import type { Transaction } from "@solana/web3.js";
import type { BrowserWalletId, BrowserWalletOption } from "@/lib/wallet/types";
import { getWalletAddressString } from "@/lib/wallet/address";
import { normalizeSignature } from "@/lib/wallet/encoding";

interface InjectedSolanaWallet {
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
  publicKey?: unknown;
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey?: unknown }>;
  disconnect(): Promise<void>;
  signMessage?(
    message: Uint8Array,
    display?: string
  ): Promise<{ signature: Uint8Array }>;
  signTransaction?(transaction: Transaction): Promise<Transaction>;
  signAndSendTransaction?(
    transaction: Transaction,
    options?: { skipPreflight?: boolean; preflightCommitment?: string }
  ): Promise<{ signature: string | Uint8Array }>;
}

type WindowWithWallets = Window & {
  phantom?: { solana?: InjectedSolanaWallet };
  solana?: InjectedSolanaWallet;
  solflare?: InjectedSolanaWallet;
  backpack?: { solana?: InjectedSolanaWallet };
};

const BROWSER_WALLETS: Record<
  BrowserWalletId,
  { name: string; installUrl: string }
> = {
  phantom: {
    name: "Phantom",
    installUrl: "https://phantom.com/download",
  },
  solflare: {
    name: "Solflare",
    installUrl: "https://www.solflare.com/",
  },
  backpack: {
    name: "Backpack",
    installUrl: "https://backpack.app/download",
  },
};

function getWindow(): WindowWithWallets | null {
  return typeof window !== "undefined" ? window : null;
}

export function getPhantomProvider(): InjectedSolanaWallet | null {
  const win = getWindow();
  if (!win) return null;
  const fromPhantom = win.phantom?.solana;
  if (fromPhantom?.isPhantom) return fromPhantom;
  if (win.solana?.isPhantom) return win.solana;
  return null;
}

export function getSolflareProvider(): InjectedSolanaWallet | null {
  const win = getWindow();
  if (!win?.solflare?.isSolflare) return null;
  return win.solflare;
}

export function getBackpackProvider(): InjectedSolanaWallet | null {
  const win = getWindow();
  const fromBackpack = win?.backpack?.solana;
  if (fromBackpack?.isBackpack) return fromBackpack;
  if (win?.solana?.isBackpack) return win.solana;
  return null;
}

export function getBrowserWalletProvider(id: BrowserWalletId): InjectedSolanaWallet | null {
  switch (id) {
    case "phantom":
      return getPhantomProvider();
    case "solflare":
      return getSolflareProvider();
    case "backpack":
      return getBackpackProvider();
  }
}

export function listBrowserWalletOptions(): BrowserWalletOption[] {
  return (Object.keys(BROWSER_WALLETS) as BrowserWalletId[]).map((id) => ({
    id,
    name: BROWSER_WALLETS[id].name,
    installUrl: BROWSER_WALLETS[id].installUrl,
    installed: getBrowserWalletProvider(id) != null,
  }));
}

export function browserWalletLabel(id: BrowserWalletId): string {
  return BROWSER_WALLETS[id].name;
}

export async function connectBrowserWallet(id: BrowserWalletId): Promise<string> {
  const provider = getBrowserWalletProvider(id);
  if (!provider) {
    throw new Error(`${BROWSER_WALLETS[id].name} is not installed in this browser.`);
  }

  const result = await provider.connect();
  const address =
    getWalletAddressString(result?.publicKey) ??
    getWalletAddressString(provider.publicKey);
  if (!address) {
    throw new Error("Wallet connected but no address was returned.");
  }
  return address;
}

/** Read address when the extension still trusts this site (no connect prompt). */
export function getConnectedBrowserWalletAddress(id: BrowserWalletId): string | null {
  const provider = getBrowserWalletProvider(id);
  if (!provider) return null;
  return getWalletAddressString(provider.publicKey);
}

/** Restore session after refresh — never prompts unless onlyIfTrusted is accepted. */
export async function tryAutoConnectBrowserWallet(id: BrowserWalletId): Promise<string | null> {
  const provider = getBrowserWalletProvider(id);
  if (!provider) return null;

  const existing = getConnectedBrowserWalletAddress(id);
  if (existing) return existing;

  try {
    const connect = provider.connect as (
      options?: { onlyIfTrusted?: boolean }
    ) => Promise<{ publicKey?: unknown }>;
    const result = await connect({ onlyIfTrusted: true });
    return (
      getWalletAddressString(result?.publicKey) ??
      getWalletAddressString(provider.publicKey)
    );
  } catch {
    return null;
  }
}

export async function disconnectBrowserWallet(id: BrowserWalletId): Promise<void> {
  const provider = getBrowserWalletProvider(id);
  if (provider) await provider.disconnect();
}

export async function signMessageWithBrowserWallet(
  id: BrowserWalletId,
  message: Uint8Array
): Promise<Uint8Array> {
  const provider = getBrowserWalletProvider(id);
  if (!provider?.signMessage) {
    throw new Error("This wallet does not support message signing.");
  }
  const { signature } = await provider.signMessage(message, "utf8");
  return signature;
}

export function browserWalletSupportsSignTransaction(id: BrowserWalletId): boolean {
  const provider = getBrowserWalletProvider(id);
  return typeof provider?.signTransaction === "function";
}

export function browserWalletSupportsTransactions(id: BrowserWalletId): boolean {
  const provider = getBrowserWalletProvider(id);
  if (!provider) return false;
  return (
    typeof provider.signAndSendTransaction === "function" ||
    typeof provider.signTransaction === "function"
  );
}

export async function signTransactionWithBrowserWallet(
  id: BrowserWalletId,
  transaction: Transaction
): Promise<Transaction> {
  const provider = getBrowserWalletProvider(id);
  if (!provider?.signTransaction) {
    throw new Error("This wallet cannot sign a transaction without sending.");
  }
  return provider.signTransaction(transaction);
}

export async function signAndSendTransactionWithBrowserWallet(
  id: BrowserWalletId,
  transaction: Transaction
): Promise<string> {
  const provider = getBrowserWalletProvider(id);
  if (!provider) throw new Error("Wallet disconnected");

  if (typeof provider.signAndSendTransaction === "function") {
    const result = await provider.signAndSendTransaction(transaction, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    return normalizeSignature(result.signature);
  }

  if (typeof provider.signTransaction === "function") {
    throw new Error("This wallet must support signAndSendTransaction to send on mainnet.");
  }

  throw new Error("This wallet cannot send transactions.");
}
