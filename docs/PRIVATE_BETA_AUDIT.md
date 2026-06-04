# Private beta — multi-day dry run & stability audit

Read-only audit for local runs and Supabase Free monitoring. No UI changes required.

## Daily routine

Run once per day (or after each ingest/pipeline cycle during a dry run):

```bash
npm run ingest:local
npm run pipeline:local
npm run pulse:local
npm run audit:local
npm run cleanup:local -- --dry-run
```

Apply `supabase/migrations/006_market_pulse_snapshots.sql` once before first `pulse:local`.

Then open [http://localhost:3000](http://localhost:3000) and spot-check:

- Disclaimer shows **live** (not demo/mock)
- Top Heat has editorial + metrics mix (not boost-heavy)
- Sitemap cards show **Sitemap discovery** / **Headline-only** badges
- Evidence links open correct URLs

Optional table view:

```bash
npm run audit:local -- --table
```

Exit code `2` means warnings were raised (see `warnings` in JSON).

## Audit command

| Command | Behavior |
|---------|----------|
| `npm run audit:local` | JSON report to stdout; read-only |
| `npm run audit:local -- --table` | Human tables + JSON |

## Metrics to watch daily

| Area | Field | Healthy |
|------|--------|---------|
| Pipeline | `dashboard.dataSource` | `"live"` |
| Top Heat | `sectionComposition.top_heat.full_editorial` | ≥ 2 |
| Top Heat | `sectionComposition.top_heat.sitemap_headline_only` | ≤ 2 |
| Top Heat | `sectionComposition.top_heat.boost_only` | 0 |
| Creator | `sectionComposition.creator_angles.full_editorial` | ≥ 4 |
| Investor | `sectionComposition.investor_watchlist.metric_only` | ≤ 4 |
| Investor | status + editorial mix | ≥ 1 status when incidents exist |
| Sitemap | `solanafloorSitemap.duplicateCanonicalUrlGroups` | 0 |
| Sitemap | `solanafloorSitemap.linkRowMismatchCount` | 0 |
| Ingest | `rawItemsBySource7d` for critical slugs | > 0 for `solana-blog`, `defillama-*`, `dexscreener-*` |
| Storage | `supabaseGrowth.raw_items` | stable after cleanup; watch slope |
| Retention | `retentionReadiness.raw_items_older_than_retention_days` | low; run cleanup when high |

## Warning thresholds (in `lib/audit/thresholds.ts`)

| Warning | Threshold |
|---------|-----------|
| `dataSource` not `live` | any |
| `top_heat` sitemap headline-only | > 2 |
| `creator_angles` sitemap headline-only | > 1 |
| `investor_watchlist` metric-only | > 5 |
| `top_heat` boost-only | > 2 |
| `top_heat` metric-only | > 5 |
| Sitemap duplicate URL groups | > 0 |
| Sitemap linked_rows > unique_urls | > 0 |
| `raw_items` total | > 8,000 |
| `topics` total | > 3,000 |
| `daily_rankings` total | > 15,000 |
| `ingest_runs` total | > 500 |
| `raw_items` older than 7d | > 2,000 (run cleanup) |
| Critical source 0 items in 7d | `solana-blog`, `defillama-solana`, `dexscreener-solana` |

Tune thresholds in code as your Free-tier budget and board caps change.

## SQL verification (Supabase SQL editor)

### Table row counts

```sql
SELECT 'raw_items' AS table_name, COUNT(*) FROM raw_items
UNION ALL SELECT 'topics', COUNT(*) FROM topics
UNION ALL SELECT 'daily_rankings', COUNT(*) FROM daily_rankings
UNION ALL SELECT 'ingest_runs', COUNT(*) FROM ingest_runs;
```

### Duplicate sitemap canonical URLs (expect 0 rows)

```sql
SELECT canonical_url, COUNT(*) AS row_count
FROM raw_items ri
JOIN sources s ON s.id = ri.source_id
WHERE s.slug = 'solanafloor-sitemap' AND ri.canonical_url IS NOT NULL
GROUP BY canonical_url
HAVING COUNT(*) > 1;
```

### Ranking cap check (today)

```sql
SELECT section, COUNT(*) AS published
FROM daily_rankings
WHERE status = 'published'
  AND ranking_date = CURRENT_DATE
GROUP BY section
ORDER BY section;
-- Compare to caps: top_heat 10, new_tokens 8, defi_signals 8, creator_angles 5, investor_watchlist 8
```

### Source distribution (raw_items, last 7 days)

```sql
SELECT s.slug, COUNT(*) AS items_7d
FROM raw_items ri
JOIN sources s ON s.id = ri.source_id
WHERE ri.fetched_at >= NOW() - INTERVAL '7 days'
GROUP BY s.slug
ORDER BY items_7d DESC;
```

### Top Heat source slugs (today)

```sql
SELECT t.title, dr.heat_score,
       array_agg(DISTINCT src.slug ORDER BY src.slug) AS source_slugs
FROM daily_rankings dr
JOIN topics t ON t.id = dr.topic_id
JOIN topic_sources ts ON ts.topic_id = t.id
JOIN sources src ON src.id = ts.source_id
WHERE dr.status = 'published'
  AND dr.ranking_date = CURRENT_DATE
  AND dr.section = 'top_heat'
GROUP BY t.title, dr.heat_score, dr.rank_position
ORDER BY dr.rank_position NULLS LAST;
```

### Sitemap link integrity (linked_rows vs unique_urls)

```sql
SELECT t.title, dr.section,
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
HAVING COUNT(ts.id) > COUNT(DISTINCT COALESCE(ts.source_url, ri.canonical_url));
```

### Retention backlog

```sql
SELECT COUNT(*) AS raw_items_older_7d
FROM raw_items
WHERE fetched_at < NOW() - INTERVAL '7 days';

SELECT COUNT(*) AS ingest_runs_older_14d
FROM ingest_runs
WHERE started_at < NOW() - INTERVAL '14 days';
```

## Remaining risks during multi-day runs

- **Title clustering** may merge sitemap headlines with official RSS by similar wording (not a dedupe issue).
- **Supabase Free** row growth if cleanup is not scheduled; audit `supabaseGrowth` daily.
- **Low-volume RSS** (Orca, Sanctum) may show `0` in 7d — expected until fresh posts.
- **Mixed `dataSource`** if a section has no published rankings for the day.
- **Manual-curator** is enabled but optional; zero items is fine if unused.

## Related files

- `lib/audit/run-local-audit.ts` — audit logic
- `supabase/verify-solanafloor-sitemap.sql` — focused sitemap checks
- `lib/db/retention-policy.ts` — cleanup windows
