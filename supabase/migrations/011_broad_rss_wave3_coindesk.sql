-- Broad RSS Wave 3: CoinDesk trial (Solana-filtered; not official source). Safe to re-run.
INSERT INTO sources (slug, name, source_type, base_url, feed_url, reliability, is_enabled, requires_api_key, status, metadata_json)
VALUES
  (
    'coindesk-rss',
    'CoinDesk — RSS',
    'rss',
    'https://www.coindesk.com',
    'https://www.coindesk.com/arc/outboundfeeds/rss/',
    0.78,
    true,
    false,
    'active',
    '{"purpose": "Broad crypto editorial (Solana-filtered at ingest) — Wave 3 trial", "requires_solana_filter": true, "max_items_per_run": 5, "coverage": "ecosystem_editorial", "broad_rss_trial": true, "official_source": false}'::jsonb
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
