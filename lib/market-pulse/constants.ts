/** API treats snapshot older than this as stale (still shown if present). */
export const PULSE_STALE_MINUTES = 15;

/** Snapshots older than this are not served as live prices. */
export const PULSE_EXPIRE_HOURS = 48;

export const HOT_TAPE_MAX_ITEMS = 5;

export const HOT_TAPE_WINDOW_MS = 24 * 3600000;

export const LOW_LIQUIDITY_USD = 50_000;

export const DEXSCREENER_SOURCE_SLUG = "dexscreener-solana";

export const SOL_MINT = "So11111111111111111111111111111111111111112";

export const MAX_DYNAMIC_HOT_TOKENS = 7;
export const MIN_DYNAMIC_BEFORE_ALLOWLIST = 4;
export const MAX_PROMOTED_BOOST_SLOTS = 2;
export const MAX_LOW_OR_UNKNOWN_LIQ_SLOTS = 3;

export const SCORE_NEW_PAIR = 40;
export const SCORE_IN_NEW_TOKENS = 30;
export const SCORE_IN_TOP_HEAT = 20;
export const SCORE_BOOST = 15;
export const SCORE_HIGH_LIQ = 10;
export const SCORE_LOW_LIQ = -25;
/** Strong penalty so ranking / non-pump scanner signals sort ahead of pump.fun-style mints. */
export const SCORE_PUMP_STYLE_PENALTY = -180;
/** Hard-block score for obvious scam patterns (not pump.fun-style mint suffix alone). */
export const SCORE_SPAM_BLOCK = -1000;

export const MAX_PUMP_STYLE_SLOTS_DEFAULT = 1;
export const MAX_PUMP_STYLE_SLOTS_ELEVATED = 2;
/** Second pump-style slot allowed when candidate meets either threshold. */
export const PUMP_STYLE_ELEVATED_LIQ_USD = 50_000;
export const PUMP_STYLE_MEANINGFUL_VOLUME_H24 = 25_000;
