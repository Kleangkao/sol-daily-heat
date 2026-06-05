# Metric history feasibility (7d / 30d averages)

Display-only investigation for **protocol fee metrics** (e.g. Jupiter Staked SOL, Solana chain fees). No schema changes in Product Completion Sprint V2.

## Run

```bash
npm run audit:metric-history
# or
npx tsx scripts/audit-metric-history-feasibility.ts
```

## Current stored data

- DefiLlama fee adapter writes `metadata_json.total24h` and `metadata_json.change_1d` on each ingest into `raw_items`.
- Each pipeline run creates new `raw_items` rows with `fetched_at` timestamps.
- **`raw_items` retention is 7 days** (`RAW_ITEMS_RETENTION_DAYS` in `lib/db/retention-policy.ts`).
- Cleanup deletes older rows (`npm run cleanup:local` — production cleanup remains **dry-run unless explicitly changed**).

## Feasibility summary

| Window | Feasible today? | Notes |
|--------|-----------------|-------|
| **7d average** | **Partial** | Possible only if multiple ingest snapshots exist for the same protocol within retention. Sparse ingest → too few points for a stable average. |
| **30d average** | **No** | Rows older than 7 days are deleted; cannot compute 30d from `raw_items` alone. |
| **Previous value (derived)** | **Yes (display)** | Already shown on topic detail: `previous = current / (1 + pct/100)` with explicit “derived” label. |

## What was implemented (Sprint V2)

- Topic detail shows **current**, **derived previous**, **% change**, source, snapshot, and limitations.
- UI does **not** fake 7d/30d averages when data is insufficient.
- Limitation line: *"Not enough stored history yet for 7d / 30d averages."*

## Future schema / retention sprint (if needed)

To show reliable 7d/30d averages:

1. **Option A — Longer retention:** Increase `RAW_ITEMS_RETENTION_DAYS` (e.g. 30–90) for protocol metric rows only.
2. **Option B — Metric snapshots table:** Daily upsert per `protocol_id` + `metric_type` + `value` + `snapshot_date` (new migration).
3. **Option C — Source-side history:** DefiLlama chart API (not in free-first scope today).

Until one of the above exists, keep derived previous + explicit limitations on metric topics.
