import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Outfit } from "next/font/google";
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

import BeachAtmosphere from "@/components/heat/BeachAtmosphere";
import { SITE_URL } from "@/lib/site";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Solana Daily Heat",
  description:
    "Daily intelligence dashboard for the Solana ecosystem. What is hot, why, and what to watch.",
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
    <html lang="en">
      <body
        className={`${barlow.variable} ${outfit.variable} bg-bg-primary text-text-primary font-body antialiased`}
      >
        <BeachAtmosphere />
        <div className="relative z-10 min-w-0 overflow-x-clip">{children}</div>
      </body>
    </html>
  );
}
