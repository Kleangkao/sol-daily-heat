import type { TopicDetailView } from "@/lib/types/topic-detail";
import type { ScoreBreakdown } from "@/lib/types/db";
import { explainScoreBreakdown } from "@/lib/heat/score-breakdown-explainer";
import { hasOfficialSource } from "@/lib/scoring/official-sources";
import { resolveTopicDisplayCategory } from "@/lib/heat/topic-display-category";

const MAX_BULLETS = 4;

const SKIP_EXPLAIN_KEYS = new Set([
  "boost_only_cap",
  "boost_top_heat_penalty",
  "fee_small_base_discount",
  "recency",
  "novelty",
  "keyword_match",
  "reliability_weight",
  "source_diversity",
]);

const ALLOW_EXPLAIN_KEYS = new Set([
  "editorial_confirmation",
  "official_source_bonus",
  "cross_type_corroboration",
  "volume_signal",
  "tvl_delta",
  "fee_threshold_passed",
]);

const BLOCKED_EXPLAIN_PATTERN =
  /scanner|rule-based score|freshness window|penalty|cap\b|capped|discount|boost|keyword|score component|carryover|solana ecosystem keywords|single source|no independent corroboration|added weight|higher-trust sources/i;

type RationaleCandidate = {
  text: string;
  strength: "strong" | "normal";
  kind: "core" | "supporting";
};

const MULTI_SOURCE_BULLET_PATTERN =
  /multiple sources|covered by multiple sources|picked up by multiple sources/i;
const MULTI_SECTION_BULLET =
  "Highlighted in more than one homepage section today.";
const EDITORIAL_CONFIRMATION_PATTERN = /editorial rss sources confirmed/i;

function breakdownNum(b: ScoreBreakdown | undefined, key: string): number {
  const v = b?.[key];
  return typeof v === "number" ? v : 0;
}

function normalizeBullet(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const endsWithPunctuation = /[.!?]$/.test(trimmed);
  return endsWithPunctuation ? trimmed : `${trimmed}.`;
}

function bulletKey(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function addCandidate(
  candidates: RationaleCandidate[],
  seen: Set<string>,
  text: string,
  strength: RationaleCandidate["strength"] = "normal",
  kind: RationaleCandidate["kind"] = "core"
): void {
  const normalized = normalizeBullet(text);
  if (!normalized) return;
  const key = bulletKey(normalized);
  if (seen.has(key)) return;
  seen.add(key);
  candidates.push({ text: normalized, strength, kind });
}

function hasMultiSourceBullet(candidates: RationaleCandidate[]): boolean {
  return candidates.some((c) => MULTI_SOURCE_BULLET_PATTERN.test(c.text));
}

function hasMetricSignal(
  b: ScoreBreakdown,
  title: string,
  summary: string,
  category: string,
  sourceSlugs: string[]
): boolean {
  if (
    breakdownNum(b, "volume_signal") > 0 ||
    breakdownNum(b, "tvl_delta") > 0 ||
    breakdownNum(b, "fee_threshold_passed") > 0
  ) {
    return true;
  }
  if (category !== "defi") return false;
  if (sourceSlugs.some((s) => s.includes("defillama"))) return true;
  return /\b(fees?\s+(up|down)|tvl|revenue|volume)\b/i.test(`${title} ${summary}`);
}

function metricActivityBullet(
  b: ScoreBreakdown,
  title: string,
  summary: string
): string {
  const isFee =
    breakdownNum(b, "fee_threshold_passed") > 0 ||
    /\bfees?\s+(up|down)/i.test(`${title} ${summary}`);
  if (isFee) {
    return "The fee move is tied to measurable protocol activity rather than only social chatter.";
  }
  return "Protocol metric movement makes this relevant for tracking usage, not just market chatter.";
}

function isMemeOrDiscovery(title: string, summary: string, category: string): boolean {
  const combined = `${title} ${summary}`.toLowerCase();
  return (
    category === "meme" ||
    combined.includes("dexscreener") ||
    /^dexscreener boost:/i.test(title)
  );
}

function sanitizeWhyHot(text: string | undefined): string | null {
  const t = text?.trim();
  if (!t || t.length > 160) return null;
  if (
    /[_]|scanner|boost|score|confidence|keyword_match|threshold|adapter signal|independent source mentions|source mentions|discounted|carryover|rule-based|clustered signals/i.test(
      t
    )
  ) {
    return null;
  }
  if (/^\d+\s/.test(t) || /\+\d/.test(t)) return null;
  if (/^[0-9]+ adapter signal/i.test(t)) return null;
  return normalizeBullet(t);
}

function isExplainExplanationSafe(explanation: string): boolean {
  if (BLOCKED_EXPLAIN_PATTERN.test(explanation)) return false;
  if (/reduced|limited|did not|no .+ bonus|weak|little measurable|headline-only|single-source/i.test(explanation)) {
    return false;
  }
  return true;
}

function assembleCandidates(candidates: RationaleCandidate[]): RationaleCandidate[] {
  const core = candidates.filter((c) => c.kind === "core");
  if (core.length === 0) return [];

  const assembled: RationaleCandidate[] = [...core];
  const coreCount = core.length;

  for (const candidate of candidates) {
    if (candidate.kind !== "supporting") continue;
    if (assembled.length >= MAX_BULLETS) break;

    if (
      candidate.text === MULTI_SECTION_BULLET &&
      (coreCount >= 2 || assembled.length >= 2)
    ) {
      continue;
    }

    if (
      EDITORIAL_CONFIRMATION_PATTERN.test(candidate.text) &&
      hasMultiSourceBullet(assembled)
    ) {
      continue;
    }

    if (assembled.some((c) => bulletKey(c.text) === bulletKey(candidate.text))) continue;
    assembled.push(candidate);
  }

  return assembled.slice(0, MAX_BULLETS);
}

function finalizeCandidates(candidates: RationaleCandidate[]): string[] {
  const assembled = assembleCandidates(candidates);
  const bullets = assembled.map((c) => c.text);
  if (bullets.length >= 2) return bullets;
  if (bullets.length === 1) {
    const only = assembled[0];
    if (only?.strength === "strong") return bullets;
  }
  return [];
}

export type TopicHeatRationaleInput = Pick<
  TopicDetailView,
  | "whyHot"
  | "scoreBreakdown"
  | "uniqueSourceCount"
  | "storyAt"
  | "rankingDate"
  | "sectionAppearancesToday"
  | "protocols"
  | "timeline"
  | "category"
  | "title"
  | "summary"
>;

/** Reader-facing bullets for topic detail — no points, keys, or debug language. */
export function buildTopicHeatRationale(topic: TopicHeatRationaleInput): string[] {
  const candidates: RationaleCandidate[] = [];
  const seen = new Set<string>();
  const b = topic.scoreBreakdown ?? {};
  const sourceSlugs = Array.from(new Set(topic.timeline.map((t) => t.sourceSlug)));
  const sourceCount = topic.uniqueSourceCount ?? sourceSlugs.length;
  const displayCategory = resolveTopicDisplayCategory({
    category: topic.category,
    sourceSlugs,
    title: topic.title,
    summary: topic.summary,
    itemTypes: topic.timeline.map((t) => t.itemType),
  });
  const combined = `${topic.title} ${topic.summary}`;
  const protocolName = topic.protocols[0]?.name?.trim() ?? null;
  const hasOfficial =
    breakdownNum(b, "official_source_bonus") > 0 || hasOfficialSource(sourceSlugs);
  const multiSource =
    sourceCount >= 2 || breakdownNum(b, "editorial_confirmation") > 0;
  const memeOrDiscovery = isMemeOrDiscovery(topic.title, topic.summary, displayCategory);
  let addedMetricBullet = false;

  if (hasOfficial && protocolName) {
    addCandidate(
      candidates,
      seen,
      `Includes an official project source and ties to ${protocolName}, linking the story to a named Solana project.`,
      "strong"
    );
  } else if (hasOfficial) {
    addCandidate(
      candidates,
      seen,
      "Includes an official project source in the source cluster."
    );
  } else if (protocolName) {
    addCandidate(
      candidates,
      seen,
      `Tied to ${protocolName}, making it easier to connect the story to a specific Solana project.`
    );
  }

  if (displayCategory === "regulatory" && multiSource) {
    addCandidate(
      candidates,
      seen,
      "Covered by multiple sources, adding context beyond a single filing headline.",
      "strong"
    );
    addCandidate(
      candidates,
      seen,
      "Regulatory or ETF-related coverage can affect how Solana is discussed in broader market structure."
    );
  } else if (multiSource) {
    addCandidate(
      candidates,
      seen,
      "Picked up by multiple sources, which adds context beyond a single post.",
      "normal",
      "supporting"
    );
  }

  if (hasMetricSignal(b, topic.title, topic.summary, displayCategory, sourceSlugs) && !memeOrDiscovery) {
    addCandidate(candidates, seen, metricActivityBullet(b, topic.title, topic.summary));
    addedMetricBullet = true;
  }

  if (displayCategory === "infra") {
    addCandidate(
      candidates,
      seen,
      "Infrastructure or developer-stack news can affect how builders evaluate the Solana ecosystem."
    );
    if (protocolName && /acqui|launch|release|sdk|api|tooling/i.test(combined)) {
      addCandidate(
        candidates,
        seen,
        `The update is tied to ${protocolName}, not just a broad market headline.`,
        "strong"
      );
    }
  }

  if (isMemeOrDiscovery(topic.title, topic.summary, displayCategory)) {
    addCandidate(
      candidates,
      seen,
      "Token discovery activity is moving in Solana market feeds."
    );
    addCandidate(
      candidates,
      seen,
      "The signal is market/activity-driven, so it is worth treating as context rather than endorsement."
    );
  }

  if (breakdownNum(b, "cross_type_corroboration") > 0) {
    addCandidate(
      candidates,
      seen,
      "News and on-chain signals line up, which strengthens the story context."
    );
  }

  if (topic.sectionAppearancesToday.length >= 2) {
    addCandidate(candidates, seen, MULTI_SECTION_BULLET, "normal", "supporting");
  }

  if (displayCategory === "regulatory" && !multiSource) {
    addCandidate(
      candidates,
      seen,
      "Regulatory or ETF-related coverage can affect how Solana is discussed in broader market structure."
    );
  }

  const explained = explainScoreBreakdown(topic.scoreBreakdown, {
    uniqueSourceCount: sourceCount,
  });
  for (const row of explained) {
    if (candidates.length >= MAX_BULLETS) break;
    if (row.points <= 0 || SKIP_EXPLAIN_KEYS.has(row.key)) continue;
    if (!ALLOW_EXPLAIN_KEYS.has(row.key)) continue;
    if (hasOfficial && row.key === "official_source_bonus") continue;
    if (memeOrDiscovery && (row.key === "volume_signal" || row.key === "fee_threshold_passed")) continue;
    if (
      addedMetricBullet &&
      (row.key === "volume_signal" || row.key === "fee_threshold_passed" || row.key === "tvl_delta")
    ) {
      continue;
    }
    if (!isExplainExplanationSafe(row.explanation)) continue;
    if (
      row.key === "editorial_confirmation" &&
      (hasMultiSourceBullet(candidates) || multiSource)
    ) {
      continue;
    }
    const explainKind =
      row.key === "editorial_confirmation" ? "supporting" : "core";
    addCandidate(candidates, seen, row.explanation, "normal", explainKind);
  }

  const safeWhyHot = sanitizeWhyHot(topic.whyHot);
  if (safeWhyHot) {
    addCandidate(candidates, seen, safeWhyHot);
  }

  return finalizeCandidates(candidates);
}
