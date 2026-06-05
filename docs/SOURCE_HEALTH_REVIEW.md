# Source health review

Read-only report for **enabled sources with zero `raw_items` in the last 7 days**. Does not disable sources automatically.

## Run

```bash
npm run audit:source-health
# or
npx tsx scripts/audit-source-health-detail.ts
```

Also summarized in `npm run audit:local` under `sourceHealth.zeroItemsIn7d`.

## What the script reports

For each zero-volume enabled source:

| Field | Meaning |
|-------|---------|
| `likelyReason` | Best-effort classification (see below) |
| `recommendedAction` | Suggested ops response — **not auto-applied** |
| `detail` | Human-readable note |

### Reason classes

| Class | Typical cause |
|-------|----------------|
| `feed_stale` | Source not fetched recently or ingest not running |
| `filter_rejected` | Solana keyword filter dropped all items (The Block, DL News, Decrypt) |
| `fetch_error` | Adapter failed in recent `ingest_runs` |
| `status_feed_quiet` | Status RSS with no incidents (healthy = zero items) |
| `no_recent_posts` | RSS/Medium archive quiet or ingest cap reached |
| `unknown` | Needs manual feed URL / cap review |

### Recommended actions

| Action | Meaning |
|--------|---------|
| `keep_enabled` | Expected quiet period (e.g. healthy status feeds) |
| `monitor` | Watch next ingest runs; no change yet |
| `lower_priority` | Low yield; keep for coverage but don't expect daily cards |
| `disable_later` | Candidate to disable after sustained zero yield |
| `source_research_needed` | Verify feed URL, filters, or replace with better endpoint |

## Policy (Product Completion Sprint V2)

- **Do not** add new sources in polish sprints without a dedicated source wave.
- **Do not** auto-disable feeds from this script alone.
- Use with `DATA_SOURCES.md` and ingest logs (`[rss:slug] fetched=… passed_filter=…`).

## Known quiet sources (typical)

As of private-beta audits, these often show `0 items in 7d` while still enabled:

- Medium archives: `drift-medium`, `metaplex-medium`, `raydium-medium`, `orca-medium`, `sanctum-medium`
- Filtered news: `decrypt-rss` (strict Solana filter)
- Status (when healthy): `solana-status`, `magiceden-status`

Re-run after each ingest wave to refresh counts.
