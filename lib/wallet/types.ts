export type BrowserWalletId = "phantom" | "solflare" | "backpack";

export type BrowserWalletOption = {
  id: BrowserWalletId;
  name: string;
  installUrl: string;
  installed: boolean;
};

/** Public product scope — connect on Solana mainnet only; no signing or transactions. */
export const WALLET_NETWORK_LABEL = "Solana mainnet";
