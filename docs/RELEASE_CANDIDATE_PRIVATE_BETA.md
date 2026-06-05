# Release Candidate — Private Beta RC 1

**Release candidate name:** Private Beta RC 1  
**Freeze recorded (UTC):** 2026-06-04T14:23:23Z  
**Repository:** `sol-daily-heat` (Solana Daily Heat Scanner)  
**Database target:** Current `.env.local` Supabase project (production-like validation; **do not switch DB** for this RC without a new RC note)

This document is a **checkpoint only**. No schema changes, no new migrations, no app logic changes at freeze time.

---

## Supabase validation status

| Check | Status |
|-------|--------|
| Migrations **001–010** applied | **Pass** (user-confirmed clean/new project) |
| `supabase/seed.sql` applied (fresh DB) | **Pass** |
| RLS / topic detail `raw_items` policy (008) | **Pass** (assumed per migration apply) |
| Re-verification on RC freeze (same `.env.local`) | **Pass** — see command results below |

**Schema freeze:** migrations **001–010** only. **No migration 011+** at this RC.

---

## Source inventory

| Metric | Value (RC freeze audit) |
|--------|-------------------------|
| **Enabled sources** | **22** |
| **Sources with rankings today** | 12 slugs (see audit `sourcesInRankingsToday`) |
| **Zero raw_items in 7d** | 8 slugs (stale-guard / filter / empty feeds — informational) |

**Wave 1 slugs (009):** `drift-medium`, `metaplex-medium`, `magiceden-status`, `dlnews-rss`, `decrypt-rss`  
**Wave 2 slugs (010):** `agave-releases`, `firedancer-releases`, `jito-solana-releases`

**Included in RC (feature stack, no new sources at freeze):**

- Core Heat Scanner · Market Pulse V2 · Builder / Infra Watch · Topic Detail · Token Detail  
- Source Wave 1 + filter quality fix · Wave 2 GitHub builder releases · Builder composition fix · UX Polish Sprint 1

---

## Final command results (RC freeze run)

Executed from repo root against **current `.env.local`**.

| Command | Exit | Result summary |
|---------|------|----------------|
| `npm run lint` | 0 | No ESLint warnings or errors |
| `npm run build` | 0 | Next.js 14 production build OK |
| `npm run ingest:local` | 0 | `totalItems: 93`, `skipped: false`, runId `744837bb-1051-48ab-bbd7-05b5ebdfddf6` |
| `npm run pipeline:local` | 0 | `topicsProcessed: 74`, `rankingsWritten: 45` |
| `npm run pulse:local` | 0 | `ok: true`, `dataSource: live`, `stale: false`, `jupiterOk: true`, watchlist 8, hotTape 5 |
| `npm run audit:local` | 0 | `warnings: []`, `dashboard.dataSource: live` |
| `npm run cleanup:local -- --dry-run` | 0 | `wouldDelete` all 0 on clean project |

---

## Final audit summary

**`rankingDate`:** 2026-06-04  
**`generatedAt`:** 2026-06-04T14:23:23.612Z

| Field | Value |
|-------|-------|
| `warnings` | **`[]`** |
| `dashboard.dataSource` | **`live`** |
| All `sectionSources` | **`live`** (six sections) |

### Section counts (published vs cap)

| Section | Published | Limit |
|---------|-----------|-------|
| top_heat | 10 | 10 |
| new_tokens | 8 | 8 |
| defi_signals | 8 | 8 |
| builder_watch | 6 | 6 |
| creator_angles | 5 | 5 |
| investor_watchlist | 8 | 8 |

### Section composition (classifier)

| Section | Total | full_editorial | metric_only | status | other |
|---------|-------|----------------|-------------|--------|-------|
| top_heat | 10 | 9 | 0 | 1 | 0 |
| builder_watch | 6 | 4 | 0 | 2 | 0 |
| creator_angles | 5 | 5 | 0 | 0 | 0 |
| investor_watchlist | 8 | 3 | 4 | 1 | 0 |

### Supabase growth (this project)

| Table / metric | Count |
|----------------|-------|
| raw_items | 93 |
| topics | 74 |
| daily_rankings (published rows) | 45 |
| ingest_runs | 2 |
| tokens_with_mint_address | 15 |

### SolanaFloor sitemap health

- rawItemCount 13 · no duplicate canonical groups · rankedTopicCount 3 · linkRowMismatchCount 0

---

## Market Pulse status (RC freeze)

| Field | Value |
|-------|-------|
| `dataSource` | **live** |
| `stale` | **false** |
| `fetchedAt` | 2026-06-04T14:23:16.168Z |
| Jupiter | ok |
| Anchor | SOL priced |
| Hot tape | 5 items |
| Pulse version | v2 |

Homepage empty state uses production-safe copy (no CLI commands) per UX Polish Sprint 1.

---

## Go / no-go criteria (RC 1)

| # | Criterion | RC 1 |
|---|-----------|------|
| 1 | `audit:local` → `warnings: []` | **Go** |
| 2 | `dashboard.dataSource` === `live` | **Go** |
| 3 | All six sections `sectionSources` live | **Go** |
| 4 | Market Pulse live or graceful updating | **Go** (live, not stale) |
| 5 | No mock/mixed unless intentional | **Go** |
| 6 | Migrations 001–010 on target DB | **Go** (validated pre-freeze) |
| 7 | `npm run build` passes | **Go** |
| 8 | Ingest + pipeline + pulse succeed | **Go** |

**RC 1 verdict:** **GO** for controlled private beta deploy using this schema + codebase snapshot.

---

## Known limitations (updated — reader-first product polish)

- Long homepage scroll (~43 cards max + Market Pulse); homepage cards are **previews** — open topic detail for full brief/evidence  
- Same topic may appear in multiple sections **by design**  
- **Topic detail:** reader-first Signal/Narrative brief, metric evidence, confirmed vs possible interpretations; scoring details **collapsed** at bottom  
- **Heat score** = scanner interest (bucket: Very high / High / Moderate / Low) — not confidence or price direction  
- Token detail is **context only** — stored Market Pulse snapshot, not live trading  
- Source gaps: Jupiter, Phantom, Backpack, Gaming, Airdrops, DAO, DePIN (not in RC scope)  
- Some enabled feeds show **0 items in 7d** — `npm run audit:source-health`  
- **7d/30d metric averages** require future retention or schema — see `docs/METRIC_HISTORY_FEASIBILITY.md`  
- Supabase Free: use 2–4h pipeline cadence, not hourly  
- **GitHub Actions cron** for ingest/pipeline/pulse; cleanup still dry-run unless ops enables deletes  

See also [PRIVATE_BETA_LAUNCH_CHECKLIST.md](./PRIVATE_BETA_LAUNCH_CHECKLIST.md) §10.

---

## Next steps after RC 1

1. Tag or note git commit SHA used for deploy (recommended).  
2. Follow [PRIVATE_BETA_LAUNCH_CHECKLIST.md](./PRIVATE_BETA_LAUNCH_CHECKLIST.md) for Vercel + cron + smoke tests.  
3. Set production env: `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.  
4. First production cron: `POST /api/cron/pipeline` → `POST /api/cron/pulse`.  
5. Invite private-beta users only after production smoke tests pass.  
6. Daily: `npm run audit:local` (or health + logs in production).  

**Out of scope for RC 1 (future RCs / sprints):**

- Public-beta marketing · section nav / overlap copy on cards · new sources · Heat Score changes

---

## Rollback / checkpoint notes

| Action | Notes |
|--------|-------|
| **Code rollback** | Redeploy previous Vercel deployment or git revert to pre-RC SHA |
| **Data rollback** | Supabase point-in-time recovery (if enabled) or re-run migrations 001–010 on new project + seed |
| **Rankings** | Re-run `POST /api/cron/pipeline` supersedes same-day snapshot rows |
| **Secrets** | Rotate `CRON_SECRET` / service role if leaked |
| **This RC doc** | Immutable record; create **RC 2** doc if schema or major behavior changes |

**Checkpoint artifacts:**

- This file: `docs/RELEASE_CANDIDATE_PRIVATE_BETA.md`  
- Launch runbook: `docs/PRIVATE_BETA_LAUNCH_CHECKLIST.md`  
- Optional local capture: `prodlike-test-output.txt` (if present in workspace)

---

## Related docs

- [PRIVATE_BETA_LAUNCH_CHECKLIST.md](./PRIVATE_BETA_LAUNCH_CHECKLIST.md) — deploy procedure  
- [PRIVATE_BETA_AUDIT.md](./PRIVATE_BETA_AUDIT.md) — ongoing monitoring  
- [DATA_SOURCES.md](../DATA_SOURCES.md) — adapter catalog  

---

*Private Beta RC 1 — documentation freeze. No database schema changes at freeze.*
