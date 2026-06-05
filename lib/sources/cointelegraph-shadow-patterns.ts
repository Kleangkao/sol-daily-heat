/** Low-signal editorial patterns common in Cointelegraph tag/market feeds. */
export const PRICE_PREDICTION_TITLE_RE =
  /\bprice\s+predictions?\b/i;

export const PRICE_PREDICTION_URL_RE =
  /\/markets\/price-predictions/i;

export const GENERIC_SOL_MARKET_RE =
  /\b(is\s+\$\d+.*\bsol\b.*\bnext\b|solana\s+open\s+interest|funding\s+rate\s+turns\s+negative)/i;

export function isPricePredictionItem(title: string, url: string): boolean {
  return (
    PRICE_PREDICTION_TITLE_RE.test(title) ||
    PRICE_PREDICTION_URL_RE.test(url)
  );
}

export function isGenericSolMarketItem(title: string, url: string): boolean {
  return GENERIC_SOL_MARKET_RE.test(title) || /\/markets\/solana/i.test(url);
}

export type CointelegraphNoiseClass =
  | "editorial"
  | "price_prediction"
  | "generic_market"
  | "other";

export function classifyCointelegraphNoise(
  title: string,
  url: string
): CointelegraphNoiseClass {
  if (isPricePredictionItem(title, url)) return "price_prediction";
  if (isGenericSolMarketItem(title, url)) return "generic_market";
  if (/\/news\//i.test(url)) return "editorial";
  return "other";
}
