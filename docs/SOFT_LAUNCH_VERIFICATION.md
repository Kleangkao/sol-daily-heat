# Soft Launch Verification

**Status:** Soft launch **complete** (production live).  
**Verified:** 2026-06-03  
**Launch URL:** https://sol-daily-heat.vercel.app

Related: [SOFT_LAUNCH_DEPLOYMENT_CHECKLIST.md](./SOFT_LAUNCH_DEPLOYMENT_CHECKLIST.md) · [RELEASE_CANDIDATE_PRIVATE_BETA.md](./RELEASE_CANDIDATE_PRIVATE_BETA.md)

---

## Deployment commits

| Commit | Summary |
|--------|---------|
| `621e783` | Private beta RC 1 (app + schema baseline) |
| `ef67049` | Topic detail heat badge consistency (integer heat from `daily_rankings`) |
| `444ecf7` | GitHub Actions production cron scheduler |

Vercel production tracks `main`; deployment reported **ready** with live dashboard.

---

## Cron scheduler

**Provider:** GitHub Actions — separate workflows: [`cron-pulse.yml`](../.github/workflows/cron-pulse.yml), [`cron-pipeline.yml`](../.github/workflows/cron-pipeline.yml), [`cron-cleanup.yml`](../.github/workflows/cron-cleanup.yml)

| Job | UTC schedule | Endpoint / runner |
|-----|--------------|-------------------|
| Market Pulse | `*/30 * * * *` | `POST /api/cron/pulse` |
| Pipeline | `7 */3 * * *` | Ingest + pipeline on GitHub runner (`run-ingest.ts`, `run-pipeline.ts`) |
| Cleanup (dry-run) | `7 3 * * *` | `POST /api/cron/cleanup?dry_run=1` |

- Auth: `Authorization: Bearer` via repository secret `CRON_SECRET` (matches Vercel Production).
- **Manual run:** Actions → **Production cron — pulse / pipeline / cleanup** → **Run workflow** (`workflow_dispatch` on each).
- **Cleanup:** still **dry-run only** in workflow; no destructive deletes scheduled yet.

---

## Production endpoints verified

| Check | Result |
|-------|--------|
| `GET /api/health` | `ok: true`, `dashboard.dataSource`: **live** |
| `GET /api/heat/today` | All six sections served live rankings |
| `GET /api/market/pulse` | Live pulse payload |
| `POST /api/cron/pipeline` | Wrote pipeline / ingest activity |
| `POST /api/cron/pulse` | Wrote pulse snapshots |
| `POST /api/cron/cleanup?dry_run=1` | Dry-run OK (via Actions + checklist) |
| Homepage `/` | Live cards, Market Pulse block, Top Heat filter copy |
| Topic detail `/topics/[id]` | Loads; header heat matches homepage integer scale |
| Heat breakdown UI | Integer heat + component rows when breakdown present |

Base URL for all routes: `https://sol-daily-heat.vercel.app`

---

## Supabase tables verified (production project)

Migrations **001–010** + `seed.sql` on the same project wired to Vercel.

| Table / area | Verification signal |
|--------------|---------------------|
| `daily_rankings` | Published rows today; all six sections visible on homepage |
| `topics` / `topic_sources` / `raw_items` | Topic detail timeline and evidence |
| `ingest_runs` | New rows after production pipeline cron |
| `market_pulse_snapshots` | New rows after production pulse cron |
| `sources` | 22 enabled ingest sources (RC 1 + Wave 1/2) |

Local parity: `npm run audit:local` previously reported `warnings: []` on the validated clean project.

---

## Manual checks summary

No screenshot archive in repo; checks performed live in browser and via API/cron:

- Homepage: disclaimer reflects **live** data; six sections populated.
- **Top Heat:** category filter label + helper copy; integer heat on cards (e.g. Heat 56).
- **Market Pulse:** live anchor / hot tokens / tape; freshness copy where applicable.
- **Creator / Investor** persona blocks on cards when metadata present.
- **Builder / Infra:** badges on applicable cards.
- **Topic detail:** reader-first brief + metric evidence; heat context clarifies scanner interest; scoring details collapsed at bottom.
- **Homepage cards:** compact signal label + brief preview; heat badge shows bucket (High/Moderate/etc.).
- **GitHub Actions:** `workflow_dispatch` run green for pulse, pipeline, cleanup dry-run.

---

## Known post-launch observations

1. **Metric-only protocol movement** can rank high in Top Heat (rule-based scoring; no ranking change in soft launch).
2. **Pump-style tokens** can appear in Market Pulse with **High risk** labels (market data + risk heuristics, not endorsement).
3. **Homepage cards** are previews; **topic detail** holds full brief, metric evidence, and evidence/timeline (scoring collapsed).
4. **7d/30d metric averages** not shown without future retention/schema — see `docs/METRIC_HISTORY_FEASIBILITY.md`.
5. **Cleanup** remains **dry-run** in GitHub Actions until `wouldDelete` is reviewed and workflow URL is updated.

---

## Immediate monitoring checklist

Daily (first 1–2 weeks):

- [ ] `GET /api/health` → `ok: true`, `dataSource: live`, `publishedCountToday` > 0
- [ ] GitHub Actions **Production cron** — last scheduled runs green
- [ ] `ingest_runs` — recent successful pipeline runs (no stuck failures)
- [ ] `market_pulse_snapshots` — `fetchedAt` within ~30–60 min of pulse schedule
- [ ] Homepage — no section stuck empty while health shows live rankings
- [ ] Spot-check one Top Heat card vs topic detail heat integer

On failure:

- Re-run **Production cron** manually (`workflow_dispatch`).
- Check Vercel env (`CRON_SECRET`, Supabase keys) and Actions secret `CRON_SECRET` match.
- See [SOFT_LAUNCH_DEPLOYMENT_CHECKLIST.md](./SOFT_LAUNCH_DEPLOYMENT_CHECKLIST.md) rollback section.

---

## Next iteration candidates (not in soft launch scope)

- Enable **real cleanup** (remove `?dry_run=1` in workflow after reviewing dry-run output).
- Tune **Top Heat** signal mix for metric-only protocol spikes (product/scoring review only — no change made at soft launch).
- Market Pulse **risk / pump-style** surfacing policy (labels, filters, or caps).
- Topic detail **lighter consumer mode** vs current analyst layout.
- Optional: Vercel-native cron only if POST + Bearer auth is supported on plan.

---

*Soft launch verification freeze — documentation only; no schema, ranking, source, or UI changes in this note.*
