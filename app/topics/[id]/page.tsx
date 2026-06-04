import { notFound } from "next/navigation";
import TopicDetailContent from "@/components/topic/TopicDetailContent";
import { getTopicDetail } from "@/lib/db/queries/topic-detail";
import { getSupabaseBrowser } from "@/lib/db/supabase-browser";
import { isLiveTopicId } from "@/lib/heat/topic-link";

type Props = {
  params: { id: string };
  searchParams: { date?: string };
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  return {
    title: `Topic · Solana Daily Heat`,
    description: "Topic intelligence detail from Solana Daily Heat.",
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
