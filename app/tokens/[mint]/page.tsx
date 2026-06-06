import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TokenDetailContent from "@/components/token/TokenDetailContent";
import { getTokenDetail } from "@/lib/db/queries/token-detail";
import { getSupabaseBrowser } from "@/lib/db/supabase-browser";
import { decodeMintParam, isValidMintParam } from "@/lib/heat/token-link";
import { SITE_URL } from "@/lib/site";

type Props = {
  params: { mint: string };
  searchParams: { date?: string };
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  if (!isValidMintParam(params.mint)) {
    return {
      title: "Token · Solana Daily Heat",
      description: "Token scanner context from Solana Daily Heat.",
    };
  }

  const mint = decodeMintParam(params.mint);
  const db = getSupabaseBrowser();
  if (!db) {
    return {
      title: `Token · Solana Daily Heat`,
      description: "Token scanner context from Solana Daily Heat.",
    };
  }

  const token = await getTokenDetail(db, mint, searchParams.date);
  if (!token) {
    return {
      title: "Token · Solana Daily Heat",
      description: "Token scanner context from Solana Daily Heat.",
    };
  }

  const canonical = new URL(`/tokens/${params.mint}`, SITE_URL);
  if (searchParams.date) {
    canonical.searchParams.set("date", searchParams.date);
  }

  const titleLabel = `$${token.symbol.replace(/^\$/, "")}`;
  const contextLine = token.scannerContext?.join(" ").trim();
  const description =
    (contextLine ? contextLine.slice(0, 160) : null) ||
    `Market and scanner context for ${titleLabel} on Solana. Not investment advice.`;

  return {
    title: `${titleLabel} · Solana Daily Heat`,
    description,
    alternates: {
      canonical: `${canonical.pathname}${canonical.search}`,
    },
  };
}

export default async function TokenDetailPage({ params, searchParams }: Props) {
  if (!isValidMintParam(params.mint)) {
    notFound();
  }

  const mint = decodeMintParam(params.mint);
  const db = getSupabaseBrowser();
  if (!db) {
    notFound();
  }

  const token = await getTokenDetail(db, mint, searchParams.date);
  if (!token) {
    notFound();
  }

  return <TokenDetailContent token={token} />;
}
