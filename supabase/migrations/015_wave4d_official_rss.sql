-- Wave 4D: Official project RSS (Meteora, Kamino, Tensor) + Kamino GitHub releases. Safe to re-run.
INSERT INTO sources (slug, name, source_type, base_url, feed_url, reliability, is_enabled, requires_api_key, status, metadata_json)
VALUES
  (
    'meteoraag-medium',
    'Meteora — Medium',
    'rss',
    'https://meteoraag.medium.com',
    'https://meteoraag.medium.com/feed',
    0.86,
    true,
    false,
    'active',
    '{"purpose": "Meteora official DeFi publication", "max_items_per_run": 10, "coverage": "defi_official", "official_source": true, "wave": "4d"}'::jsonb
  ),
  (
    'kamino-blog',
    'Kamino Blog',
    'rss',
    'https://blog.kamino.com',
    'https://blog.kamino.com/feed',
    0.87,
    true,
    false,
    'active',
    '{"purpose": "Kamino official blog (Substack)", "max_items_per_run": 10, "coverage": "defi_official", "official_source": true, "wave": "4d"}'::jsonb
  ),
  (
    'tensor-blog',
    'Tensor — Substack',
    'rss',
    'https://blog.tensor.trade',
    'https://blog.tensor.trade/feed',
    0.82,
    true,
    false,
    'active',
    '{"purpose": "Tensor official NFT blog", "max_items_per_run": 8, "coverage": "nft_official", "official_source": true, "wave": "4d"}'::jsonb
  ),
  (
    'kamino-releases',
    'Kamino — GitHub Releases',
    'rss',
    'https://github.com/Kamino-Finance/klend',
    'https://github.com/Kamino-Finance/klend/releases.atom',
    0.86,
    true,
    false,
    'active',
    '{"purpose": "Kamino klend protocol releases", "feed_format": "atom", "max_items_per_run": 5, "coverage": "defi_builder", "builder_source": true, "wave": "4d"}'::jsonb
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
