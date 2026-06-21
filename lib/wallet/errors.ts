export function friendlyWalletError(err: unknown): string {
  return friendlyWalletActionError(err, "connection");
}

export function friendlyWalletActionError(
  err: unknown,
  context: "connection" | "action" = "action"
): string {
  const msg = err instanceof Error ? err.message : String(err);

  if (/user rejected|rejected the request|request rejected|user denied/i.test(msg)) {
    return context === "connection"
      ? "Connection was rejected in your wallet."
      : "The wallet request was rejected.";
  }
  if (/cancel|denied|declined|closed/i.test(msg)) {
    return context === "connection"
      ? "Connection was cancelled."
      : "The wallet request was cancelled.";
  }
  if (/insufficient funds|insufficient lamports|Attempt to debit/i.test(msg)) {
    return "Not enough SOL to pay the network fee. Add a small amount of SOL to this wallet and try again.";
  }
  if (/blockhash not found|expired/i.test(msg)) {
    return "The transaction expired. Please try again.";
  }
  if (/not installed/i.test(msg)) {
    return msg;
  }
  if (/does not support|cannot sign|cannot send|cannot record/i.test(msg)) {
    return msg;
  }

  return msg || (context === "connection"
    ? "Wallet connection failed. Try again."
    : "Wallet action failed. Try again.");
}
