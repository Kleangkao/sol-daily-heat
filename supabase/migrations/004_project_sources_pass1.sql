-- Project Source Implementation Pass 1 (verified discovery URLs). Safe to re-run.
INSERT INTO sources (slug, name, source_type, base_url, feed_url, reliability, is_enabled, requires_api_key, status, metadata_json)
VALUES
  (
    'marinade-blog',
    'Marinade Blog',
    'rss',
    'https://marinade.finance/blog',
    'https://marinade.finance/blog/rss.xml',
    0.86,
    true,
    false,
    'active',
    '{"purpose": "DeFi / LST / staking", "max_items_per_run": 15, "coverage": "defi_lst"}'::jsonb
  ),
  (
    'orca-medium',
    'Orca — Medium',
    'rss',
    'https://orca-so.medium.com',
    'https://orca-so.medium.com/feed',
    0.85,
    true,
    false,
    'active',
    '{"purpose": "DeFi / DEX official publication", "max_items_per_run": 10, "coverage": "defi_dex"}'::jsonb
  ),
  (
    'pyth-status',
    'Pyth Network Status',
    'rss',
    'https://status.pyth.network',
    'https://status.pyth.network/history.rss',
    0.90,
    true,
    false,
    'active',
    '{"purpose": "infra / oracle / incidents", "max_items_per_run": 10, "coverage": "infra_oracle"}'::jsonb
  ),
  (
    'sanctum-medium',
    'Sanctum — Medium',
    'rss',
    'https://medium.com/@sanctumso',
    'https://medium.com/feed/@sanctumso',
    0.82,
    true,
    false,
    'active',
    '{"purpose": "DeFi / LST / restaking", "max_items_per_run": 5, "coverage": "defi_lst"}'::jsonb
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
