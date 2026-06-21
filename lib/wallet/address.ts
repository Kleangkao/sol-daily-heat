interface PublicKeyLike {
  toBase58(): string;
}

export function getWalletAddressString(value: unknown): string | null {
  if (value == null) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (typeof record.address === "string") {
      const trimmed = record.address.trim();
      if (trimmed.length > 0) return trimmed;
    }

    if (typeof record.publicKey !== "undefined") {
      return getWalletAddressString(record.publicKey);
    }

    const maybePublicKey = value as Partial<PublicKeyLike>;
    if (typeof maybePublicKey.toBase58 === "function") {
      try {
        const address = maybePublicKey.toBase58();
        return typeof address === "string" && address.length > 0 ? address : null;
      } catch {
        return null;
      }
    }
  }

  return null;
}

export function shortenWalletAddress(
  address: string | null | undefined,
  chars = 4
): string {
  if (!address) return "—";
  if (address.length <= chars * 2 + 1) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}
