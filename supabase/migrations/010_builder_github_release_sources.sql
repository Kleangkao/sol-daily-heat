-- Public Beta Wave 2: Builder GitHub release Atom feeds (no GitHub API). Safe to re-run.
INSERT INTO sources (slug, name, source_type, base_url, feed_url, reliability, is_enabled, requires_api_key, status, metadata_json)
VALUES
  (
    'agave-releases',
    'Agave — GitHub Releases',
    'rss',
    'https://github.com/anza-xyz/agave',
    'https://github.com/anza-xyz/agave/releases.atom',
    0.88,
    true,
    false,
    'active',
    '{"purpose": "validator client releases (Anza/Agave)", "feed_format": "atom", "max_items_per_run": 5, "coverage": "infra_builder", "builder_source": true}'::jsonb
  ),
  (
    'firedancer-releases',
    'Firedancer — GitHub Releases',
    'rss',
    'https://github.com/firedancer-io/firedancer',
    'https://github.com/firedancer-io/firedancer/releases.atom',
    0.86,
    true,
    false,
    'active',
    '{"purpose": "Firedancer / Frankendancer client releases", "feed_format": "atom", "max_items_per_run": 5, "coverage": "infra_builder", "builder_source": true}'::jsonb
  ),
  (
    'jito-solana-releases',
    'Jito Solana — GitHub Releases',
    'rss',
    'https://github.com/jito-foundation/jito-solana',
    'https://github.com/jito-foundation/jito-solana/releases.atom',
    0.86,
    true,
    false,
    'active',
    '{"purpose": "Jito validator / MEV client releases", "feed_format": "atom", "max_items_per_run": 5, "coverage": "infra_builder", "builder_source": true}'::jsonb
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
