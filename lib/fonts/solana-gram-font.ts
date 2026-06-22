import localFont from "next/font/local";

// TODO: Replace/verify brand font asset before any commercial/public release.
export const solanaGramFont = localFont({
  src: "../../app/fonts/InstagramSansHeadline.otf",
  variable: "--font-solana-gram",
  weight: "400",
  display: "swap",
});
