import type { DashboardDataSource } from "@/lib/types/heat";

const COPY: Record<DashboardDataSource, string> = {
  live:
    "Solana Daily Heat is informational context only — rule-based rankings from live ingested feeds (RSS, market, and protocol signals). Not investment advice. Verify sources and do your own research before acting on any signal.",
  mixed:
    "Solana Daily Heat is informational context only — a mix of live ingested rankings and demo fallbacks where a section has no live rows. Not investment advice. Verify sources and do your own research before acting on any signal.",
  mock:
    "Solana Daily Heat is informational context only — demo sample data for layout preview when Supabase is unavailable. Not investment advice. Verify sources and do your own research before acting on any signal.",
};

type Props = {
  dataSource?: DashboardDataSource;
  isLoading?: boolean;
};

export default function DisclaimerBar({ dataSource, isLoading }: Props) {
  const text = isLoading
    ? "Loading live scanner data from Supabase — rankings will appear when the fetch completes. Not investment advice."
    : COPY[dataSource ?? "mock"];

  return (
    <div
      role="note"
      className="border-b border-border bg-bg-primary/80 px-4 py-2.5 sm:px-6 lg:px-8"
    >
      <p className="mx-auto max-w-6xl text-center text-[11px] leading-relaxed text-text-muted">
        {text}
      </p>
    </div>
  );
}
