# Cointelegraph Solana RSS — shadow test

Evaluate `https://cointelegraph.com/rss/tag/solana` inside the sol-daily-heat pipeline **without** enabling production ingest or rankings.

## Constraints

- Source row is **shadow-only** (`is_enabled: false`, `shadow_only: true`)
- **Not** in `data/sources.rss.json` (production reference list)
- **Not** inserted by migrations in this pass
- Shadow script is **read-only** — `DRY_RUN = true` (no Supabase writes)
- Overlap check may **read** recent `raw_items` when Supabase env is present

## Shadow source config

| Field | Value |
|-------|-------|
| slug | `cointelegraph-solana-rss` |
| feed_url | `https://cointelegraph.com/rss/tag/solana` |
| type | `rss` |
| reliability | `0.75` |
| requires_solana_filter | `true` |
| max_items_per_run | `10` |
| is_enabled | `false` |
| metadata.shadow_only | `true` |

Files:

- `data/sources.shadow.json` — canonical shadow registry
- `lib/sources/shadow-source-config.ts` — typed constant for scripts

## Run

```bash
npx tsx scripts/shadow-cointelegraph-solana.ts
```

## What the script reports

1. Fetch + parse RSS (same `rss-parser` as production adapter)
2. Apply `matchesSolanaFeedFilter()` from `lib/text/solana-filter.ts`
3. Infer `TopicCategory` via `inferCategory()`
4. Classify noise (`price_prediction`, `generic_market`, `editorial`, `other`)
5. Compare overlap vs 30d `raw_items` from: The Block, Decrypt, DL News, SolanaFloor sitemap, Solana blog
6. Emit `add_now` / `keep_shadow` / `reject`

## Enabling production (later — not done in shadow pass)

1. Add migration or `apply-*` script with `is_enabled: false` initially
2. Run shadow script across multiple UTC snapshots
3. Only then set `is_enabled: true` after ops review
4. Never enable without `requires_solana_filter: true`

## Related

- Broad discovery: `docs/SOURCE_DISCOVERY_BROAD_RSS.md`
- Re-run broad probe: `npx tsx scripts/audit-broad-rss-discovery.ts`
