-- Source expansion pass 1 (verified URLs). Safe to re-run.
INSERT INTO sources (slug, name, source_type, base_url, feed_url, reliability, is_enabled, requires_api_key, status, metadata_json)
VALUES
  (
    'helius-blog',
    'Helius Blog',
    'rss',
    'https://www.helius.dev/blog',
    'https://www.helius.dev/blog/rss.xml',
    0.88,
    true,
    false,
    'active',
    '{"purpose": "infra / dev / ecosystem", "max_items_per_run": 25}'::jsonb
  ),
  (
    'raydium-medium',
    'Raydium — Medium',
    'rss',
    'https://medium.com/@raydium',
    'https://medium.com/feed/@raydium',
    0.84,
    true,
    false,
    'active',
    '{"purpose": "DeFi / project official updates"}'::jsonb
  ),
  (
    'the-block-news',
    'The Block — News',
    'rss',
    'https://www.theblock.co',
    'https://www.theblock.co/rss.xml',
    0.85,
    true,
    false,
    'active',
    '{"purpose": "general crypto news (Solana-filtered at ingest)", "requires_solana_filter": true, "max_items_per_run": 15}'::jsonb
  ),
  (
    'solana-status',
    'Solana Status',
    'rss',
    'https://status.solana.com',
    'https://status.solana.com/history.rss',
    0.92,
    true,
    false,
    'active',
    '{"purpose": "infra / security / incidents"}'::jsonb
  ),
  (
    'defillama-fees-solana',
    'DefiLlama — Solana Fees',
    'defillama',
    'https://defillama.com',
    'https://api.llama.fi/overview/fees/solana?excludeTotalDataChart=true',
    0.88,
    true,
    false,
    'active',
    '{"purpose": "protocol revenue / fees on Solana"}'::jsonb
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
