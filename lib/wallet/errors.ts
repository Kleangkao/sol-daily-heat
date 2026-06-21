export function friendlyWalletError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/user rejected|rejected the request|request rejected|user denied/i.test(msg)) {
    return "Connection was rejected in your wallet.";
  }
  if (/cancel|denied|declined|closed/i.test(msg)) {
    return "Connection was cancelled.";
  }
  if (/not installed/i.test(msg)) {
    return msg;
  }
  return msg || "Wallet connection failed. Try again.";
}
