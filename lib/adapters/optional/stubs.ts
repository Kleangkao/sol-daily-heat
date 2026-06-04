import type { SourceAdapter, AdapterContext, RawItemDraft } from "../types";

/** Paid/optional sources — disabled unless env flags are set. */

function disabledAdapter(slug: string, envFlag?: string): SourceAdapter {
  return {
    slug,
    isEnabled() {
      return Boolean(envFlag && process.env[envFlag]);
    },
    async fetch(): Promise<RawItemDraft[]> {
      return [];
    },
  };
}

export const birdeyeAdapter = disabledAdapter("birdeye", "BIRDEYE_API_KEY");
export const heliusAdapter = disabledAdapter("helius", "HELIUS_API_KEY");
export const coingeckoAdapter = disabledAdapter("coingecko", "COINGECKO_API_KEY");
