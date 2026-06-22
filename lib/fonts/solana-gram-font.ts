import localFont from "next/font/local";

// TODO: Replace/verify brand font asset before any commercial/public release.
export const solanaGramFont = localFont({
  src: "../../app/fonts/InstagramSansHeadline.otf",
  variable: "--font-solana-gram",
  weight: "400",
  display: "swap",
});

/** Set true to render Solanagram titles with the bundled brand font asset. */
export const USE_SOLANA_GRAM_BRAND_FONT = false;

export function solanaGramRailTitleClass(): string {
  if (USE_SOLANA_GRAM_BRAND_FONT) {
    return `${solanaGramFont.className} shrink-0 whitespace-nowrap text-[19px] font-normal leading-none tracking-tight text-text-primary sm:text-[23px]`;
  }
  return "shrink-0 whitespace-nowrap font-heading text-[19px] font-bold leading-none tracking-tight text-text-primary sm:text-[23px]";
}

export function solanaGramModalTitleClass(): string {
  if (USE_SOLANA_GRAM_BRAND_FONT) {
    return `${solanaGramFont.className} text-[19px] font-normal tracking-tight text-text-primary sm:text-[23px]`;
  }
  return "font-heading text-[19px] font-bold tracking-tight text-text-primary sm:text-[23px]";
}
