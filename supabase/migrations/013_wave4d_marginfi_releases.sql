-- Wave 4D.1: marginfi GitHub releases (verified Atom feed). Safe to re-run.
INSERT INTO sources (slug, name, source_type, base_url, feed_url, reliability, is_enabled, requires_api_key, status, metadata_json)
VALUES
  (
    'marginfi-releases',
    'marginfi — GitHub Releases',
    'rss',
    'https://github.com/mrgnlabs/marginfi-v2',
    'https://github.com/mrgnlabs/marginfi-v2/releases.atom',
    0.84,
    true,
    false,
    'active',
    '{"purpose": "marginfi protocol CLI / SDK releases", "feed_format": "atom", "max_items_per_run": 5, "coverage": "defi_builder", "builder_source": true, "wave": "4d1"}'::jsonb
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
