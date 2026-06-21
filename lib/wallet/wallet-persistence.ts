import type { BrowserWalletId } from "@/lib/wallet/types";

const STORAGE_KEY = "solana-space:last-browser-wallet";

export function saveBrowserWalletId(id: BrowserWalletId): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, id);
}

export function getSavedBrowserWalletId(): BrowserWalletId | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "phantom" || raw === "solflare" || raw === "backpack") {
    return raw;
  }
  return null;
}

export function clearSavedBrowserWalletId(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
