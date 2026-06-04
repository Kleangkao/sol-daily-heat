/** Database row types — mirrors supabase/migrations/001_initial_schema.sql */



export type SourceType =
  | "rss"
  | "manual"
  | "dexscreener"
  | "defillama"
  | "api"
  | "sitemap";

export type EntityStatus = "active" | "paused" | "error" | "deprecated" | "inactive" | "flagged";



export type RawItemStatus = "pending" | "processed" | "skipped" | "error";

export type IngestRunStatus = "running" | "success" | "partial" | "failed";

export type TopicCategory =

  | "ecosystem"

  | "defi"

  | "meme"

  | "nft"

  | "infra"

  | "gaming"

  | "ai"

  | "regulatory"

  | "other";



export type TopicStatus = "active" | "cooling" | "archived" | "suppressed";

export type InterpretationType = "raw" | "rule_based" | "ai";

export type RankingSection =

  | "top_heat"

  | "new_tokens"

  | "defi_signals"

  | "creator_angles"

  | "investor_watchlist"

  | "builder_watch";

export type RankingStatus = "draft" | "published" | "superseded";

export type TokenRelationType = "primary" | "mentioned" | "watchlist";

export type ProtocolRelationType = "primary" | "mentioned" | "watchlist";



export interface Source {

  id: string;

  slug: string;

  name: string;

  source_type: SourceType;

  base_url: string | null;

  feed_url: string | null;

  reliability: number;

  is_enabled: boolean;

  requires_api_key: boolean;

  status: EntityStatus;

  metadata_json: Record<string, unknown>;

  last_fetched_at: string | null;

  created_at: string;

  updated_at: string;

}



export interface IngestRun {

  id: string;

  started_at: string;

  finished_at: string | null;

  status: IngestRunStatus;

  adapter_results_json: Record<string, unknown>[];

  error_summary: string | null;

  metadata_json: Record<string, unknown>;

  created_at: string;

}



export interface RawItem {

  id: string;

  source_id: string;

  external_id: string | null;

  title: string;

  snippet: string | null;

  body_text: string | null;

  canonical_url: string | null;

  content_hash: string;

  published_at: string | null;

  fetched_at: string;

  status: RawItemStatus;

  metadata_json: Record<string, unknown>;

  created_at: string;

  updated_at: string;

}



export interface Topic {

  id: string;

  slug: string;

  title: string;

  summary: string | null;

  category: TopicCategory;

  clustering_key: string;

  why_hot: string | null;

  risk_note: string | null;

  confidence_score: number;

  interpretation_type: InterpretationType;

  status: TopicStatus;

  first_seen_at: string;

  last_updated_at: string;

  metadata_json: Record<string, unknown>;

  created_at: string;

  updated_at: string;

}



export interface TopicSource {

  id: string;

  topic_id: string;

  raw_item_id: string | null;

  source_id: string;

  source_url: string | null;

  relevance: number;

  is_primary: boolean;

  created_at: string;

}



export interface Token {

  id: string;

  symbol: string;

  name: string | null;

  mint_address: string | null;

  dex_pair_address: string | null;

  chain: string;

  status: EntityStatus;

  metadata_json: Record<string, unknown>;

  first_seen_at: string;

  created_at: string;

  updated_at: string;

}



export interface TopicToken {

  id: string;

  topic_id: string;

  token_id: string;

  relation_type: TokenRelationType;

  relevance: number;

  created_at: string;

}



export interface Protocol {

  id: string;

  slug: string;

  name: string;

  defillama_id: string | null;

  category: string | null;

  website_url: string | null;

  status: EntityStatus;

  metadata_json: Record<string, unknown>;

  created_at: string;

  updated_at: string;

}



export interface TopicProtocol {

  id: string;

  topic_id: string;

  protocol_id: string;

  relation_type: ProtocolRelationType;

  relevance: number;

  created_at: string;

}



export interface ScoreBreakdown {

  source_diversity?: number;

  recency?: number;

  volume_signal?: number;

  tvl_delta?: number;

  keyword_match?: number;

  reliability_weight?: number;

  [key: string]: number | undefined;

}



export interface DailyRanking {

  id: string;

  topic_id: string;

  ranking_date: string;

  heat_score: number;

  rank_position: number | null;

  section: RankingSection;

  score_breakdown_json: ScoreBreakdown;

  confidence_score: number;

  is_carryover: boolean;

  status: RankingStatus;

  metadata_json: Record<string, unknown>;

  created_at: string;

  updated_at: string;

}

