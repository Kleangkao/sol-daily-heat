-- SolanaFloor headline-only sitemap discovery source

ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_source_type_check;

ALTER TABLE sources ADD CONSTRAINT sources_source_type_check
  CHECK (source_type IN ('rss', 'manual', 'dexscreener', 'defillama', 'api', 'sitemap'));

INSERT INTO sources (slug, name, source_type, base_url, feed_url, reliability, is_enabled, requires_api_key, status, metadata_json)
VALUES (
  'solanafloor-sitemap',
  'SolanaFloor — News (sitemap)',
  'sitemap',
  'https://solanafloor.com',
  'https://solanafloor.com/news/sitemap.xml',
  0.75,
  true,
  false,
  'active',
  '{"purpose": "headline-only discovery via public news sitemap", "max_items_per_run": 15, "max_age_hours": 168, "discovery": "sitemap", "no_article_fetch": true}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  source_type = EXCLUDED.source_type,
  base_url = EXCLUDED.base_url,
  feed_url = EXCLUDED.feed_url,
  reliability = EXCLUDED.reliability,
  is_enabled = EXCLUDED.is_enabled,
  metadata_json = EXCLUDED.metadata_json;
