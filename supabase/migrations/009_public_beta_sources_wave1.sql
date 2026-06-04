-- Public Beta Source Expansion Wave 1 (RSS only; safe to re-run)

INSERT INTO sources (slug, name, source_type, base_url, feed_url, reliability, is_enabled, requires_api_key, status, metadata_json)

VALUES

  (

    'drift-medium',

    'Drift — Medium',

    'rss',

    'https://medium.com/@driftprotocol',

    'https://medium.com/feed/@driftprotocol',

    0.84,

    true,

    false,

    'active',

    '{"purpose": "DeFi / perps official updates", "max_items_per_run": 10, "coverage": "defi_perps"}'::jsonb

  ),

  (

    'metaplex-medium',

    'Metaplex — Medium',

    'rss',

    'https://medium.com/@metaplex',

    'https://medium.com/feed/@metaplex',

    0.84,

    true,

    false,

    'active',

    '{"purpose": "NFT / protocol official updates", "max_items_per_run": 10, "coverage": "nft_protocol"}'::jsonb

  ),

  (

    'magiceden-status',

    'Magic Eden — Status',

    'rss',

    'https://status.magiceden.io',

    'https://status.magiceden.io/history.rss',

    0.90,

    true,

    false,

    'active',

    '{"purpose": "NFT marketplace incidents / maintenance", "max_items_per_run": 10, "coverage": "nft_status"}'::jsonb

  ),

  (

    'dlnews-rss',

    'DL News — RSS',

    'rss',

    'https://www.dlnews.com',

    'https://www.dlnews.com/arc/outboundfeeds/rss/',

    0.78,

    true,

    false,

    'active',

    '{"purpose": "DeFi / ecosystem news (Solana-filtered at ingest)", "requires_solana_filter": true, "max_items_per_run": 10, "coverage": "ecosystem_editorial"}'::jsonb

  ),

  (

    'decrypt-rss',

    'Decrypt — RSS',

    'rss',

    'https://decrypt.co',

    'https://decrypt.co/feed',

    0.76,

    true,

    false,

    'active',

    '{"purpose": "ecosystem / NFT / gaming news (Solana-filtered at ingest)", "requires_solana_filter": true, "max_items_per_run": 10, "coverage": "ecosystem_editorial"}'::jsonb

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


