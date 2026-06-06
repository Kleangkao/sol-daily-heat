import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TopicDetailContent from "@/components/topic/TopicDetailContent";
import { getTopicDetail } from "@/lib/db/queries/topic-detail";
import { getSupabaseBrowser } from "@/lib/db/supabase-browser";
import { isLiveTopicId } from "@/lib/heat/topic-link";
import { SITE_URL } from "@/lib/site";

type Props = {
  params: { id: string };
  searchParams: { date?: string };
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  if (!isLiveTopicId(params.id)) {
    return {
      title: "Topic · Solana Daily Heat",
      description: "Topic intelligence detail from Solana Daily Heat.",
    };
  }

  const db = getSupabaseBrowser();
  if (!db) {
    return {
      title: "Topic · Solana Daily Heat",
      description: "Topic intelligence detail from Solana Daily Heat.",
    };
  }

  const topic = await getTopicDetail(db, params.id, searchParams.date);
  if (!topic) {
    return {
      title: "Topic · Solana Daily Heat",
      description: "Topic intelligence detail from Solana Daily Heat.",
    };
  }

  const canonical = new URL(`/topics/${params.id}`, SITE_URL);
  if (searchParams.date) {
    canonical.searchParams.set("date", searchParams.date);
  }

  const description =
    topic.summary?.trim().slice(0, 160) ||
    "Rule-based topic intelligence from Solana Daily Heat. Not investment advice.";

  return {
    title: `${topic.title} · Solana Daily Heat`,
    description,
    alternates: {
      canonical: `${canonical.pathname}${canonical.search}`,
    },
  };
}

export default async function TopicDetailPage({ params, searchParams }: Props) {
  if (!isLiveTopicId(params.id)) {
    notFound();
  }

  const db = getSupabaseBrowser();
  if (!db) {
    notFound();
  }

  const topic = await getTopicDetail(db, params.id, searchParams.date);
  if (!topic) {
    notFound();
  }

  return <TopicDetailContent topic={topic} />;
}
