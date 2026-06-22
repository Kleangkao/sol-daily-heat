import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Outfit } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-barlow",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-outfit",
});

const greatVibes = localFont({
  src: "./fonts/GreatVibes-Regular.ttf",
  variable: "--font-great-vibes",
  weight: "400",
  display: "swap",
});

import BeachAtmosphere from "@/components/heat/BeachAtmosphere";
import SolanaGradientAtmosphere from "@/components/heat/SolanaGradientAtmosphere";
import DevChunkRecovery from "@/components/DevChunkRecovery";
import WalletProviders from "@/components/wallet/WalletProviders";
import { CRITICAL_APP_CSS } from "@/lib/theme/critical-css";
import { USE_SOLANA_GRADIENT_THEME } from "@/lib/theme/background-theme";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/product/copy";
import { SITE_URL } from "@/lib/site";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: PRODUCT_NAME,
  description: PRODUCT_TAGLINE,
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ backgroundColor: "#041616" }}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: CRITICAL_APP_CSS }} />
      </head>
      <body
        className={`${barlow.variable} ${outfit.variable} ${greatVibes.variable} bg-bg-primary text-text-primary font-body antialiased${USE_SOLANA_GRADIENT_THEME ? " theme-solana-gradient" : ""}`}
        style={{ backgroundColor: "#041616", color: "#eef4ec" }}
      >
        <DevChunkRecovery />
        <BeachAtmosphere />
        {USE_SOLANA_GRADIENT_THEME ? <SolanaGradientAtmosphere /> : null}
        <div className="relative z-10 min-w-0 overflow-x-clip">
          <WalletProviders>{children}</WalletProviders>
        </div>
      </body>
    </html>
  );
}
