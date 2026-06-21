export type BrowserWalletId = "phantom" | "solflare" | "backpack";

export type BrowserWalletOption = {
  id: BrowserWalletId;
  name: string;
  installUrl: string;
  installed: boolean;
};

/** Public product scope — connect and memo-only actions on Solana mainnet. */
export const WALLET_NETWORK_LABEL = "Solana mainnet";
