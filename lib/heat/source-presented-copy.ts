import {
  CARD_EXCERPT_MAX,
  DETAIL_EXCERPT_MAX,
  excerptForCard,
  excerptForDetail,
  stripEmDash,
} from "@/lib/heat/copy-format";
import { uniqueSnippets } from "@/lib/heat/unique-snippets";
import { normalizeCopyText } from "@/lib/heat/topic-copy-layers";
import type { ReaderCopyInput } from "@/lib/heat/reader-signal-copy";
import type { TopicDetailView } from "@/lib/types/topic-detail";
import type { EvidenceItem } from "@/lib/types/evidence";

const ADAPTER_SUMMARY_RE = /adapter signal|fees move|clustered from \d+ source/i;

type PublicationCandidateInput = {
  title: string;
  summary?: string;
  whatHappened?: string | null;
  sourceSnippets?: TopicDetailView["sourceSnippets"];
  evidenceItems?: EvidenceItem[];
};

function stripSourcePrefix(item: EvidenceItem): string {
  let text = item.text.trim();
  if (item.sourceName) {
    const prefix = `${item.sourceName}:`;
    if (text.startsWith(prefix)) {
      text = text.slice(prefix.length).trim();
    }
  }
  return text;
}

function collectSourceTextCandidates(input: PublicationCandidateInput): string[] {
  const out: string[] = [];

  for (const s of input.sourceSnippets ?? []) {
    const t = s.text.trim();
    if (t.length > 20) out.push(t);
  }

  for (const item of input.evidenceItems ?? []) {
    const t = stripSourcePrefix(item);
    if (t.length > 20) out.push(t);
  }

  return uniqueSnippets(out);
}

function collectPipelineFallbackCandidates(input: PublicationCandidateInput): string[] {
  const out: string[] = [];
  const whatHappened = input.whatHappened?.trim();
  if (whatHappened && whatHappened.length > 20) out.push(whatHappened);
  const summary = input.summary?.trim();
  if (summary && summary.length > 20) out.push(summary);
  return uniqueSnippets(out);
}

function dropShorterPrefixes(texts: string[]): string[] {
  return texts.filter((text) => {
    const norm = normalizeCopyText(text);
    return !texts.some((other) => {
      if (other === text) return false;
      const otherNorm = normalizeCopyText(other);
      return otherNorm.length > norm.length && otherNorm.startsWith(norm);
    });
  });
}

function buildPublicationParagraphs(input: PublicationCandidateInput): string[] {
  const fromSource = collectSourceTextCandidates(input);
  const fromPipeline = collectPipelineFallbackCandidates(input);
  const candidates = dropShorterPrefixes(
    fromSource.length > 0 ? fromSource : fromPipeline
  ).filter((t) => !ADAPTER_SUMMARY_RE.test(t));

  if (candidates.length === 0) {
    return [input.title.trim()];
  }

  return [...candidates]
    .sort((a, b) => b.length - a.length)
    .map(stripEmDash);
}

/** Best available publication text — always prefer the longest non-truncated source. */
export function pickSourcePublicationText(
  summary: string | undefined,
  title: string,
  whatHappened?: string | null,
  sourceSnippets?: TopicDetailView["sourceSnippets"],
  evidenceItems?: EvidenceItem[]
): string {
  return buildPublicationParagraphs({
    title,
    summary,
    whatHappened,
    sourceSnippets,
    evidenceItems,
  }).join("\n\n");
}

/** Full publication blocks for detail — longest source text wins over truncated summary. */
export function sourcePublicationParagraphs(topic: TopicDetailView): string[] {
  return buildPublicationParagraphs({
    title: topic.title,
    summary: topic.summary,
    whatHappened: topic.evidence?.whatHappened,
    sourceSnippets: topic.sourceSnippets,
    evidenceItems: topic.evidence?.evidenceItems,
  });
}

export type TopicPrimarySourceLink = {
  url: string;
  sourceLabel: string;
  cta: "Read full article →" | "Open primary source →";
};

function articleSourceCta(
  topic: TopicDetailView,
  linkLabel?: string
): TopicPrimarySourceLink["cta"] {
  const itemTypes = topic.timeline.map((entry) => entry.itemType);
  if (itemTypes.some((t) => t === "news" || t === "manual")) {
    return "Read full article →";
  }
  if (linkLabel && /article|blog|news|medium|floor|release/i.test(linkLabel)) {
    return "Read full article →";
  }
  return "Open primary source →";
}

/** Primary outbound link for the source brief (presentation only). */
export function resolveTopicPrimarySourceLink(
  topic: TopicDetailView
): TopicPrimarySourceLink | undefined {
  const links = topic.evidence?.sourceLinks ?? [];
  if (links.length > 0) {
    const preferred =
      links.find((link) => /article|blog|news/i.test(link.label)) ?? links[0];
    return {
      url: preferred.url,
      sourceLabel: preferred.label,
      cta: articleSourceCta(topic, preferred.label),
    };
  }

  const timelineEntry =
    topic.timeline.find((entry) => entry.isPrimary && entry.url) ??
    topic.timeline.find((entry) => entry.url);
  if (!timelineEntry?.url) return undefined;

  return {
    url: timelineEntry.url,
    sourceLabel: timelineEntry.sourceName,
    cta: articleSourceCta(
      topic,
      timelineEntry.itemType === "news" ? "Article" : timelineEntry.sourceName
    ),
  };
}

/**
 * Concise source brief for topic detail — excerpted like homepage cards,
 * up to two paragraphs for distinct multi-source editorial snippets.
 */
export function sourceDetailBriefParagraphs(topic: TopicDetailView): string[] {
  const candidates = buildPublicationParagraphs({
    title: topic.title,
    summary: topic.summary,
    whatHappened: topic.evidence?.whatHappened,
    sourceSnippets: topic.sourceSnippets,
    evidenceItems: topic.evidence?.evidenceItems,
  });

  if (candidates.length === 0) {
    return [stripEmDash(excerptForDetail(topic.title.trim()))];
  }

  const paragraphCount = candidates.length >= 2 ? 2 : 1;
  const maxLen =
    paragraphCount === 2
      ? Math.floor(DETAIL_EXCERPT_MAX / 2)
      : DETAIL_EXCERPT_MAX;

  return candidates
    .slice(0, paragraphCount)
    .map((paragraph) => stripEmDash(excerptForDetail(paragraph, maxLen)));
}

/** Card body: short excerpt from source text (presentation only). */
export function buildSourceCardExcerpt(
  input: ReaderCopyInput,
  maxLen = CARD_EXCERPT_MAX
): string | null {
  const text = pickSourcePublicationText(
    input.summary,
    input.title,
    input.evidence?.whatHappened,
    undefined,
    input.evidence?.evidenceItems
  );
  if (text === input.title.trim() && input.title.length < 28) {
    return null;
  }
  return stripEmDash(excerptForCard(text, maxLen));
}

export function sourcePublicationFromTopic(topic: TopicDetailView): string {
  return sourcePublicationParagraphs(topic).join("\n\n");
}

/** Card excerpt is expected to be a prefix of the detail source brief / full source text. */
export function isSourceExcerptOverlap(card: string, publication: string): boolean {
  const a = normalizeCopyText(card).replace(/…$/, "");
  const b = normalizeCopyText(publication);
  if (!a || !b) return false;
  return b.startsWith(a) || a.startsWith(b.slice(0, a.length));
}
