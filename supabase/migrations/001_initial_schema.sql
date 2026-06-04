-- Solana Daily Heat Scanner — initial schema (Phase 0+1)



CREATE EXTENSION IF NOT EXISTS "pgcrypto";



-- ---------------------------------------------------------------------------

-- sources: configurable ingestion endpoints (RSS, manual, DexScreener, etc.)

-- ---------------------------------------------------------------------------

CREATE TABLE sources (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  slug TEXT NOT NULL UNIQUE,

  name TEXT NOT NULL,

  source_type TEXT NOT NULL CHECK (source_type IN ('rss', 'manual', 'dexscreener', 'defillama', 'api')),

  base_url TEXT,

  feed_url TEXT,

  reliability NUMERIC(3, 2) NOT NULL DEFAULT 0.50 CHECK (reliability >= 0 AND reliability <= 1),

  is_enabled BOOLEAN NOT NULL DEFAULT true,

  requires_api_key BOOLEAN NOT NULL DEFAULT false,

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error', 'deprecated')),

  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,

  last_fetched_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

);



CREATE INDEX idx_sources_status ON sources (status) WHERE is_enabled = true;



-- ---------------------------------------------------------------------------

-- ingest_runs: per-run adapter execution log (Phase 1 schema only)

-- ---------------------------------------------------------------------------

CREATE TABLE ingest_runs (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  finished_at TIMESTAMPTZ,

  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'failed')),

  adapter_results_json JSONB NOT NULL DEFAULT '[]'::jsonb,

  error_summary TEXT,

  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()

);



CREATE INDEX idx_ingest_runs_started ON ingest_runs (started_at DESC);

CREATE INDEX idx_ingest_runs_status ON ingest_runs (status);



-- ---------------------------------------------------------------------------

-- raw_items: immutable-ish fetched payloads before topic merge

-- ---------------------------------------------------------------------------

CREATE TABLE raw_items (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  source_id UUID NOT NULL REFERENCES sources (id) ON DELETE CASCADE,

  external_id TEXT,

  title TEXT NOT NULL,

  snippet TEXT,

  body_text TEXT,

  canonical_url TEXT,

  content_hash TEXT NOT NULL,

  published_at TIMESTAMPTZ,

  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'skipped', 'error')),

  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (source_id, content_hash)

);



CREATE INDEX idx_raw_items_source_fetched ON raw_items (source_id, fetched_at DESC);

CREATE INDEX idx_raw_items_status ON raw_items (status);

CREATE INDEX idx_raw_items_published ON raw_items (published_at DESC NULLS LAST);



-- ---------------------------------------------------------------------------

-- topics: canonical clustered stories / signals

-- ---------------------------------------------------------------------------

CREATE TABLE topics (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  slug TEXT NOT NULL UNIQUE,

  title TEXT NOT NULL,

  summary TEXT,

  category TEXT NOT NULL CHECK (category IN (

    'ecosystem', 'defi', 'meme', 'nft', 'infra', 'gaming', 'ai', 'regulatory', 'other'

  )),

  clustering_key TEXT NOT NULL UNIQUE,

  why_hot TEXT,

  risk_note TEXT,

  confidence_score NUMERIC(3, 2) NOT NULL DEFAULT 0.50 CHECK (confidence_score >= 0 AND confidence_score <= 1),

  interpretation_type TEXT NOT NULL DEFAULT 'rule_based' CHECK (interpretation_type IN ('raw', 'rule_based', 'ai')),

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cooling', 'archived', 'suppressed')),

  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

);



CREATE INDEX idx_topics_clustering_key ON topics (clustering_key);

CREATE INDEX idx_topics_category ON topics (category);

CREATE INDEX idx_topics_last_updated ON topics (last_updated_at DESC);



-- ---------------------------------------------------------------------------

-- topic_sources: links topics to contributing raw items / sources

-- ---------------------------------------------------------------------------

CREATE TABLE topic_sources (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  topic_id UUID NOT NULL REFERENCES topics (id) ON DELETE CASCADE,

  raw_item_id UUID REFERENCES raw_items (id) ON DELETE SET NULL,

  source_id UUID NOT NULL REFERENCES sources (id) ON DELETE CASCADE,

  source_url TEXT,

  relevance NUMERIC(3, 2) NOT NULL DEFAULT 1.00 CHECK (relevance >= 0 AND relevance <= 1),

  is_primary BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (topic_id, raw_item_id)

);



CREATE INDEX idx_topic_sources_topic ON topic_sources (topic_id);



-- ---------------------------------------------------------------------------

-- tokens: Solana tokens referenced by heat topics

-- ---------------------------------------------------------------------------

CREATE TABLE tokens (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  symbol TEXT NOT NULL,

  name TEXT,

  mint_address TEXT UNIQUE,

  dex_pair_address TEXT,

  chain TEXT NOT NULL DEFAULT 'solana',

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'flagged')),

  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,

  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

);



CREATE INDEX idx_tokens_symbol ON tokens (symbol);



-- ---------------------------------------------------------------------------

-- topic_tokens: many-to-many topic ↔ token

-- ---------------------------------------------------------------------------

CREATE TABLE topic_tokens (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  topic_id UUID NOT NULL REFERENCES topics (id) ON DELETE CASCADE,

  token_id UUID NOT NULL REFERENCES tokens (id) ON DELETE CASCADE,

  relation_type TEXT NOT NULL DEFAULT 'mentioned' CHECK (relation_type IN ('primary', 'mentioned', 'watchlist')),

  relevance NUMERIC(3, 2) NOT NULL DEFAULT 1.00,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (topic_id, token_id)

);



CREATE INDEX idx_topic_tokens_topic ON topic_tokens (topic_id);



-- ---------------------------------------------------------------------------

-- protocols: DeFi / infra projects (DefiLlama-aligned)

-- ---------------------------------------------------------------------------

CREATE TABLE protocols (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  slug TEXT NOT NULL UNIQUE,

  name TEXT NOT NULL,

  defillama_id TEXT,

  category TEXT,

  website_url TEXT,

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated')),

  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

);



-- ---------------------------------------------------------------------------

-- topic_protocols: many-to-many topic ↔ protocol

-- ---------------------------------------------------------------------------

CREATE TABLE topic_protocols (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  topic_id UUID NOT NULL REFERENCES topics (id) ON DELETE CASCADE,

  protocol_id UUID NOT NULL REFERENCES protocols (id) ON DELETE CASCADE,

  relation_type TEXT NOT NULL DEFAULT 'mentioned' CHECK (relation_type IN ('primary', 'mentioned', 'watchlist')),

  relevance NUMERIC(3, 2) NOT NULL DEFAULT 1.00 CHECK (relevance >= 0 AND relevance <= 1),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (topic_id, protocol_id)

);



CREATE INDEX idx_topic_protocols_topic ON topic_protocols (topic_id);



-- ---------------------------------------------------------------------------

-- daily_rankings: per-day heat scores for dashboard ordering

-- ---------------------------------------------------------------------------

CREATE TABLE daily_rankings (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  topic_id UUID NOT NULL REFERENCES topics (id) ON DELETE CASCADE,

  ranking_date DATE NOT NULL,

  heat_score NUMERIC(6, 2) NOT NULL DEFAULT 0 CHECK (heat_score >= 0),

  rank_position INTEGER,

  section TEXT NOT NULL DEFAULT 'top_heat' CHECK (section IN (

    'top_heat', 'new_tokens', 'defi_signals', 'creator_angles', 'investor_watchlist'

  )),

  score_breakdown_json JSONB NOT NULL DEFAULT '{}'::jsonb,

  confidence_score NUMERIC(3, 2) NOT NULL DEFAULT 0.50,

  is_carryover BOOLEAN NOT NULL DEFAULT false,

  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'superseded')),

  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (topic_id, ranking_date, section)

);



CREATE INDEX idx_daily_rankings_date_section ON daily_rankings (ranking_date DESC, section, rank_position);



-- ---------------------------------------------------------------------------

-- updated_at triggers

-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()

RETURNS TRIGGER AS $$

BEGIN

  NEW.updated_at = now();

  RETURN NEW;

END;

$$ LANGUAGE plpgsql;



CREATE TRIGGER trg_sources_updated_at BEFORE UPDATE ON sources

  FOR EACH ROW EXECUTE FUNCTION set_updated_at();



CREATE TRIGGER trg_raw_items_updated_at BEFORE UPDATE ON raw_items

  FOR EACH ROW EXECUTE FUNCTION set_updated_at();



CREATE TRIGGER trg_topics_updated_at BEFORE UPDATE ON topics

  FOR EACH ROW EXECUTE FUNCTION set_updated_at();



CREATE TRIGGER trg_tokens_updated_at BEFORE UPDATE ON tokens

  FOR EACH ROW EXECUTE FUNCTION set_updated_at();



CREATE TRIGGER trg_protocols_updated_at BEFORE UPDATE ON protocols

  FOR EACH ROW EXECUTE FUNCTION set_updated_at();



CREATE TRIGGER trg_daily_rankings_updated_at BEFORE UPDATE ON daily_rankings

  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

