-- SolanaFloor sitemap verification (run in Supabase SQL editor)

-- 1) Source row + type
SELECT slug, name, source_type, feed_url, reliability, is_enabled, metadata_json
FROM sources
WHERE slug = 'solanafloor-sitemap';

-- 2) Raw items ingested (headline-only)
SELECT COUNT(*) AS raw_count,
       MAX(fetched_at) AS last_fetched
FROM raw_items ri
JOIN sources s ON s.id = ri.source_id
WHERE s.slug = 'solanafloor-sitemap';

SELECT title, canonical_url, published_at, metadata_json->>'sitemap_discovery' AS sitemap_discovery
FROM raw_items ri
JOIN sources s ON s.id = ri.source_id
WHERE s.slug = 'solanafloor-sitemap'
ORDER BY published_at DESC NULLS LAST
LIMIT 5;

-- 3) Published rankings that include SolanaFloor sitemap
SELECT dr.section, dr.heat_score, dr.ranking_date, t.title
FROM daily_rankings dr
JOIN topics t ON t.id = dr.topic_id
JOIN topic_sources ts ON ts.topic_id = t.id
JOIN sources src ON src.id = ts.source_id
WHERE dr.status = 'published'
  AND src.slug = 'solanafloor-sitemap'
ORDER BY dr.ranking_date DESC, dr.section, dr.rank_position
LIMIT 20;

-- 4) Duplicate canonical_url rows (should be 0 extra after dedup fix)
SELECT canonical_url, COUNT(*) AS row_count, array_agg(title ORDER BY fetched_at DESC) AS titles
FROM raw_items ri
JOIN sources s ON s.id = ri.source_id
WHERE s.slug = 'solanafloor-sitemap'
  AND ri.canonical_url IS NOT NULL
GROUP BY canonical_url
HAVING COUNT(*) > 1
ORDER BY row_count DESC
LIMIT 20;

-- 5) Ranked topics: linked_rows vs unique_urls (sitemap source)
SELECT t.title,
       dr.section,
       COUNT(ts.id) AS linked_rows,
       COUNT(DISTINCT COALESCE(ts.source_url, ri.canonical_url)) AS unique_urls
FROM daily_rankings dr
JOIN topics t ON t.id = dr.topic_id
JOIN topic_sources ts ON ts.topic_id = t.id
JOIN sources src ON src.id = ts.source_id
LEFT JOIN raw_items ri ON ri.id = ts.raw_item_id
WHERE dr.status = 'published'
  AND src.slug = 'solanafloor-sitemap'
GROUP BY t.title, dr.section, dr.ranking_date
HAVING COUNT(ts.id) > COUNT(DISTINCT COALESCE(ts.source_url, ri.canonical_url))
ORDER BY linked_rows DESC
LIMIT 20;

-- 6) source_type constraint (should list 'sitemap' after migration 005)
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'sources'::regclass
  AND conname = 'sources_source_type_check';
