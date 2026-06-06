import { hasOfficialSource } from "@/lib/scoring/official-sources";

export type ProtocolRole = { name: string; slug: string };

const SOURCE_SLUG_TO_PROTOCOL: Record<string, string> = {
  "marinade-blog": "marinade",
  "kamino-blog": "kamino",
  "orca-medium": "orca",
  "raydium-medium": "raydium",
  "drift-medium": "drift",
  "sanctum-medium": "sanctum",
  "metaplex-medium": "metaplex",
  "meteoraag-medium": "meteora",
  "tensor-blog": "tensor",
  "helius-blog": "helius",
  "solana-blog": "solana",
};

function inferPrimarySlug(
  protocols: ProtocolRole[],
  sourceSlugs: string[],
  title: string
): string | null {
  for (const slug of sourceSlugs) {
    const hint = SOURCE_SLUG_TO_PROTOCOL[slug];
    if (hint && protocols.some((p) => p.slug === hint || p.slug.startsWith(hint))) {
      return hint;
    }
  }

  if (hasOfficialSource(sourceSlugs) && protocols.length === 1) {
    return protocols[0].slug;
  }

  const titleLead = title.split(/[:\-–]/)[0]?.trim().toLowerCase();
  if (titleLead) {
    const match = protocols.find(
      (p) =>
        p.name.toLowerCase() === titleLead ||
        p.slug === titleLead ||
        titleLead.startsWith(p.name.toLowerCase())
    );
    if (match) return match.slug;
  }

  return null;
}

export function resolveProtocolDisplayRoles(
  protocols: ProtocolRole[],
  sourceSlugs: string[],
  title: string,
  summary?: string
): { primary: ProtocolRole[]; mentioned: ProtocolRole[] } {
  if (protocols.length === 0) {
    return { primary: [], mentioned: [] };
  }

  const primarySlug = inferPrimarySlug(protocols, sourceSlugs, title);
  const textBlob = `${title} ${summary ?? ""}`.toLowerCase();

  const primary: ProtocolRole[] = [];
  const mentioned: ProtocolRole[] = [];

  for (const p of protocols) {
    const isPrimary =
      (primarySlug != null && (p.slug === primarySlug || p.slug.startsWith(primarySlug))) ||
      (primary.length === 0 &&
        hasOfficialSource(sourceSlugs) &&
        sourceSlugs.some((s) => SOURCE_SLUG_TO_PROTOCOL[s] === p.slug));

    if (isPrimary && !primary.some((x) => x.slug === p.slug)) {
      primary.push(p);
    } else if (textBlob.includes(p.name.toLowerCase()) || textBlob.includes(p.slug)) {
      mentioned.push(p);
    } else if (!isPrimary) {
      mentioned.push(p);
    }
  }

  if (primary.length === 0 && protocols.length > 0) {
    primary.push(protocols[0]);
    return {
      primary,
      mentioned: protocols.slice(1),
    };
  }

  return {
    primary,
    mentioned: mentioned.filter((m) => !primary.some((p) => p.slug === m.slug)),
  };
}
