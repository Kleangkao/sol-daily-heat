/** Trim trailing zeros after decimal (keeps at least one digit when needed). */
function trimTrailingZeros(decimal: string): string {
  if (!decimal.includes(".")) return decimal;
  const trimmed = decimal.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
  return trimmed.length > 0 ? trimmed : decimal;
}

/** Sub-cent USD without scientific notation (e.g. BONK → $0.00000507). */
function formatSubCentUsd(value: number): string {
  const abs = Math.abs(value);
  if (abs === 0) return "0";
  const leadingZeros = Math.max(0, Math.floor(-Math.log10(abs)) - 1);
  const fractionDigits = Math.min(10, Math.max(6, leadingZeros + 4));
  return trimTrailingZeros(value.toFixed(fractionDigits));
}

export function formatPriceUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value >= 1000) {
    return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  if (value >= 1) return `$${trimTrailingZeros(value.toFixed(2))}`;
  if (value >= 0.01) return `$${trimTrailingZeros(value.toFixed(4))}`;
  return `$${formatSubCentUsd(value)}`;
}

export function priceMissingTitle(symbol: string): string {
  return `No price from Jupiter for ${symbol} (mint may be illiquid or untracked in the last 7d)`;
}

export function formatChange24h(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function changeTone(value: number | null | undefined): "up" | "down" | "flat" {
  if (value == null || !Number.isFinite(value) || Math.abs(value) < 0.05) return "flat";
  return value > 0 ? "up" : "down";
}
