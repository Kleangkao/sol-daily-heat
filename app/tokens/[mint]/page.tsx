import { notFound } from "next/navigation";
import TokenDetailContent from "@/components/token/TokenDetailContent";
import { getTokenDetail } from "@/lib/db/queries/token-detail";
import { getSupabaseBrowser } from "@/lib/db/supabase-browser";
import { decodeMintParam, isValidMintParam } from "@/lib/heat/token-link";

type Props = {
  params: { mint: string };
  searchParams: { date?: string };
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const mint = decodeMintParam(params.mint);
  return {
    title: `Token · ${mint.slice(0, 8)}… · Solana Daily Heat`,
    description: "Token scanner context from Solana Daily Heat.",
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
