-- Broad RSS Wave 5: U.Today + The Defiant (Solana-filtered; not official sources). Safe to re-run.
INSERT INTO sources (slug, name, source_type, base_url, feed_url, reliability, is_enabled, requires_api_key, status, metadata_json)
VALUES
  (
    'utoday-rss',
    'U.Today — RSS',
    'rss',
    'https://u.today',
    'https://u.today/rss',
    0.67,
    true,
    false,
    'active',
    '{"purpose": "Broad crypto editorial (Solana-filtered at ingest) — Wave 5", "requires_solana_filter": true, "max_items_per_run": 8, "coverage": "ecosystem_editorial", "broad_rss_trial": true, "official_source": false}'::jsonb
  ),
  (
    'thedefiant-rss',
    'The Defiant — RSS',
    'rss',
    'https://thedefiant.io',
    'https://thedefiant.io/feed',
    0.76,
    true,
    false,
    'active',
    '{"purpose": "DeFi editorial (Solana-filtered at ingest) — Wave 5", "requires_solana_filter": true, "max_items_per_run": 8, "coverage": "ecosystem_editorial", "broad_rss_trial": true, "official_source": false}'::jsonb
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  source_type = EXCLUDED.source_type,
  base_url = EXCLUDED.base_url,
  feed_url = EXCLUDED.feed_url,
  reliability = EXCLUDED.reliability,
  is_enabled = EXCLUDED.is_enabled,
  status = EXCLUDED.status,
  metadata_json = EXCLUDED.metadata_json;
