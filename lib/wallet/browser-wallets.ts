import type { BrowserWalletId, BrowserWalletOption } from "@/lib/wallet/types";
import { getWalletAddressString } from "@/lib/wallet/address";

interface InjectedSolanaWallet {
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
  publicKey?: unknown;
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey?: unknown }>;
  disconnect(): Promise<void>;
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

export async function disconnectBrowserWallet(id: BrowserWalletId): Promise<void> {
  const provider = getBrowserWalletProvider(id);
  if (provider) await provider.disconnect();
}
