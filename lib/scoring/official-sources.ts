/** Official / project RSS slugs eligible for heat-score bonus. */
export const OFFICIAL_SOURCE_SLUGS = new Set([
  "solana-blog",
  "helius-blog",
  "raydium-medium",
  "marinade-blog",
  "orca-medium",
  "sanctum-medium",
  "drift-medium",
  "metaplex-medium",
  "solana-status",
]);

export function hasOfficialSource(slugs: string[]): boolean {
  return slugs.some((s) => OFFICIAL_SOURCE_SLUGS.has(s));
}
