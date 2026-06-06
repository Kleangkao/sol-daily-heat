-- Wave 4A: Cointelegraph Solana tag RSS + CoinDesk cap bump. Safe to re-run.
INSERT INTO sources (slug, name, source_type, base_url, feed_url, reliability, is_enabled, requires_api_key, status, metadata_json)
VALUES
  (
    'cointelegraph-solana-rss',
    'Cointelegraph — Solana tag',
    'rss',
    'https://cointelegraph.com/tags/solana',
    'https://cointelegraph.com/rss/tag/solana',
    0.75,
    true,
    false,
    'active',
    '{"purpose": "Solana-tagged Cointelegraph editorial (secondary Solana filter at ingest)", "requires_solana_filter": true, "max_items_per_run": 10, "coverage": "ecosystem_editorial", "wave": "4a", "official_source": false}'::jsonb
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

-- CoinDesk Wave 3 trial: raise ingest cap after clean local QA (5 → 8).
UPDATE sources
SET metadata_json = metadata_json || '{"max_items_per_run": 8}'::jsonb
WHERE slug = 'coindesk-rss';
