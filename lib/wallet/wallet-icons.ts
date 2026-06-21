import type { BrowserWalletId } from "@/lib/wallet/types";

/** Wallet logos from project resources — used in connect modal and connected state. */
export const WALLET_ICON_SRC: Record<BrowserWalletId, string> = {
  phantom: "/wallets/phantom.svg",
  solflare: "/wallets/solflare.jpeg",
  backpack: "/wallets/backpack.jpg",
};
