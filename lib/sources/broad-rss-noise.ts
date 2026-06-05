import {
  GENERIC_SOL_MARKET_RE,
  PRICE_PREDICTION_TITLE_RE,
  PRICE_PREDICTION_URL_RE,
} from "@/lib/sources/cointelegraph-shadow-patterns";

export type BroadRssNoiseClass =
  | "editorial"
  | "price_prediction"
  | "generic_market"
  | "press_release_or_sponsored"
  | "protocol_specific"
  | "ecosystem"
  | "infra_builder";

const PRESS_RELEASE_RE =
  /\b(press\s+release|sponsored\s+content|partner\s+content|advertorial|paid\s+post)\b/i;

const PRICE_ANALYSIS_RE =
  /\b(price\s+analysis|technical\s+analysis|price\s+forecast|will\s+.+\s+hit\s+\$)\b/i;

const PROTOCOL_RE =
  /\b(jupiter|raydium|marinade|kamino|drift|orca|metaplex|pump\.fun|pumpfun|sanctum|tensor|magic\s+eden)\b/i;

const ECOSYSTEM_RE =
  /\b(solana\s+foundation|solana\s+ecosystem|institutional\s+push|ecosystem\s+expands)\b/i;

const INFRA_BUILDER_RE =
  /\b(firedancer|agave|validator|rpc\s+node|infra\b|developer\s+tooling|github\s+release|on-?chain\s+infrastructure)\b/i;

/** Low-signal classes used for noise ratio in shadow bench. */
export const LOW_SIGNAL_NOISE_CLASSES = new Set<BroadRssNoiseClass>([
  "price_prediction",
  "generic_market",
  "press_release_or_sponsored",
]);

export function classifyBroadRssNoise(
  title: string,
  url: string,
  description = ""
): BroadRssNoiseClass {
  const text = `${title} ${description}`;

  if (
    PRICE_PREDICTION_TITLE_RE.test(title) ||
    PRICE_PREDICTION_URL_RE.test(url) ||
    PRICE_ANALYSIS_RE.test(title)
  ) {
    return "price_prediction";
  }

  if (GENERIC_SOL_MARKET_RE.test(title) || /\/markets\//i.test(url)) {
    return "generic_market";
  }

  if (PRESS_RELEASE_RE.test(text) || /\/press-release/i.test(url)) {
    return "press_release_or_sponsored";
  }

  if (PROTOCOL_RE.test(text)) {
    return "protocol_specific";
  }

  if (INFRA_BUILDER_RE.test(text)) {
    return "infra_builder";
  }

  if (ECOSYSTEM_RE.test(text)) {
    return "ecosystem";
  }

  if (
    /\/news\//i.test(url) ||
    /\/article/i.test(url) ||
    /\/latest\//i.test(url) ||
    /\/defi\//i.test(url)
  ) {
    return "editorial";
  }

  return "editorial";
}

export function noiseRatio(accepted: { noiseClass: BroadRssNoiseClass }[]): number {
  if (accepted.length === 0) return 0;
  const low = accepted.filter((a) => LOW_SIGNAL_NOISE_CLASSES.has(a.noiseClass)).length;
  return low / accepted.length;
}
