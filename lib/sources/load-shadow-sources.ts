import { readFileSync } from "fs";
import { join } from "path";
import type { EntityStatus, SourceType } from "@/lib/types/db";

export type ShadowCandidateCategory = "broad_rss" | "solana_tag" | "defi_editorial";

export type ShadowSourceRow = {
  slug: string;
  name: string;
  source_type: SourceType;
  base_url: string;
  feed_url: string;
  reliability: number;
  is_enabled: false;
  requires_api_key: boolean;
  status: EntityStatus;
  requires_solana_filter: boolean;
  candidate_category: ShadowCandidateCategory;
  shadow_only: true;
  metadata_json: Record<string, unknown>;
};

const SHADOW_PATH = join(process.cwd(), "data", "sources.shadow.json");

export function loadShadowSources(): ShadowSourceRow[] {
  const raw = readFileSync(SHADOW_PATH, "utf8");
  const parsed = JSON.parse(raw) as ShadowSourceRow[];
  return parsed.filter((row) => row.shadow_only === true && row.is_enabled === false);
}
