/** Solana base58 mint addresses (32–44 chars). */
export const MINT_PARAM_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function decodeMintParam(mint: string): string {
  try {
    return decodeURIComponent(mint.trim());
  } catch {
    return mint.trim();
  }
}

export function isValidMintParam(mint: string): boolean {
  return MINT_PARAM_RE.test(decodeMintParam(mint));
}

export function tokenDetailPath(mint: string): string {
  return `/tokens/${encodeURIComponent(decodeMintParam(mint))}`;
}

/** Live dashboard links only — mock mints are placeholders, not base58 addresses. */
export function canLinkTokenDetail(
  mint: string | undefined | null,
  detailEnabled: boolean
): boolean {
  if (!detailEnabled || !mint) return false;
  return isValidMintParam(mint);
}
