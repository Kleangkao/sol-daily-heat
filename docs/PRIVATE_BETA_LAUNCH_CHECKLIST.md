# Private Beta Launch Checklist

Single runbook for a **controlled private beta** of Solana Daily Heat. Complete in order; check boxes as you go.

**System scope (as of this checklist):** Core Heat Scanner · Market Pulse V2 · Builder / Infra Watch · Topic Detail · Token Detail · Source Wave 1 + filter fix · Wave 2 GitHub builder releases · Builder composition fix · UX Polish Sprint 1.

**Prerequisites:** Supabase project · Vercel (or similar) for Next.js 14 · No automated migration runner in repo — SQL is manual.

---

## Go / no-go (production gate)

Do **not** invite private-beta users until **all** are true:

| # | Criterion |
|---|-----------|
| 1 | `npm run audit:local` → `warnings: []` |
| 2 | `dashboard.dataSource` is **`live`** (not `mock` or `mixed` unless intentional demo) |
| 3 | All six homepage sections show **`sectionSources` live** (Top Heat, New Tokens, DeFi, Builder, Creator, Investor) |
| 4 | Market Pulse is **`dataSource: live`** on `GET /api/market/pulse`, **or** homepage shows production-safe “Market context is updating…” (no CLI text) |
| 5 | `GET /api/health` → `ok: true`, `publishedCountToday` > 0 on an active ranking day |
| 6 | Migrations **001–010** applied on production Supabase |
| 7 | `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` set in production (never `NEXT_PUBLIC_`) |
| 8 | First successful `POST /api/cron/pipeline` and `POST /api/cron/pulse` after deploy |

---

## 1. Pre-launch local verification

Run from repo root with `.env.local` pointing at **staging or production** Supabase (recommended before Vercel deploy).

```bash
npm install
npm run lint
npm run build
npm run ingest:local
npm run pipeline:local
npm run pulse:local
npm run audit:local
npm run audit:local -- --table
npm run cleanup:local -- --dry-run
```

**Expect:**

- Lint: no errors · Build: success
- Ingest: `totalItems` > 0, no persistent adapter failures
- Pipeline: `rankingsWritten` > 0, `topicsProcessed` > 0
- Pulse: completes without 503 (requires migration **006**)
- Audit: `warnings: []`, `rankingDate` = today, section counts at caps (e.g. top_heat 10, builder_watch 6)
- Cleanup dry-run: JSON only, no deletes

**Optional local smoke (dev server):**

```bash
npm run dev
curl http://localhost:3000/api/health
```

In browser: homepage disclaimer not demo-only · Top Heat category filter label says **Top Heat category filter** · Creator cards show **Creator angle** when metadata exists · Builder GitHub cards show **GitHub release** / **Infra release** badges · open `/topics/<uuid>` and `/tokens/<mint>`.

---

## 2. Supabase production setup

1. Create Supabase project (note **URL**, **anon key**, **service role key**).
2. Apply migrations **in order** (SQL Editor or `psql $DATABASE_URL -f …`).
3. Run verification SQL (section 5 below).
4. Never commit `.env.local` or service role key.

**Paused project:** writes stop → health `publishedCountToday: 0` → UI may fall back to mock. Resume project before go-live.

---

## 3. Migration order (001 → 010)

| # | File | Purpose |
|---|------|---------|
| 001 | `supabase/migrations/001_initial_schema.sql` | Core schema |
| 002 | `supabase/migrations/002_rls_policies.sql` | Anon read policies |
| 003 | `supabase/migrations/003_source_expansion_pass1.sql` | Helius, Raydium, The Block |
| 004 | `supabase/migrations/004_project_sources_pass1.sql` | Marinade, Orca, Pyth status |
| 005 | `supabase/migrations/005_solanafloor_sitemap.sql` | `sitemap` source type + SolanaFloor |
| 006 | `supabase/migrations/006_market_pulse_snapshots.sql` | `market_pulse_snapshots` |
| 007 | `supabase/migrations/007_builder_watch_section.sql` | `builder_watch` section |
| 008 | `supabase/migrations/008_topic_detail_raw_items_read.sql` | Topic detail `raw_items` RLS |
| 009 | `supabase/migrations/009_public_beta_sources_wave1.sql` | Wave 1 RSS sources |
| 010 | `supabase/migrations/010_builder_github_release_sources.sql` | Wave 2 GitHub Atom releases |

**One-shot `psql` sequence (fresh DB):**

```bash
psql $DATABASE_URL -f supabase/migrations/001_initial_schema.sql
psql $DATABASE_URL -f supabase/migrations/002_rls_policies.sql
psql $DATABASE_URL -f supabase/seed.sql
psql $DATABASE_URL -f supabase/migrations/003_source_expansion_pass1.sql
psql $DATABASE_URL -f supabase/migrations/004_project_sources_pass1.sql
psql $DATABASE_URL -f supabase/migrations/005_solanafloor_sitemap.sql
psql $DATABASE_URL -f supabase/migrations/006_market_pulse_snapshots.sql
psql $DATABASE_URL -f supabase/migrations/007_builder_watch_section.sql
psql $DATABASE_URL -f supabase/migrations/008_topic_detail_raw_items_read.sql
psql $DATABASE_URL -f supabase/migrations/009_public_beta_sources_wave1.sql
psql $DATABASE_URL -f supabase/migrations/010_builder_github_release_sources.sql
```

**Do not skip 005–008 on production** — sitemap ingest, Market Pulse, Builder Watch, and topic timeline break without them.

**Existing DB (sources only):** optional helpers after 001–008:

- `npx tsx scripts/apply-wave1-sources.ts`
- `npx tsx scripts/apply-wave2-github-sources.ts`

---

## 4. Seed strategy

| Scenario | Action |
|----------|--------|
| **Fresh database** | Run `supabase/seed.sql` **after 001 + 002**, **before** 003–010 |
| **Production already on 001–008** | Run **009** and **010** only; seed not required if sources exist |
| **Re-run safe** | Migrations 009–010 use `ON CONFLICT` upserts |

Seed loads base enabled sources (Solana blog, Helius, DexScreener, DefiLlama, manual, etc.). Wave 1/2 slugs come from migrations **009** / **010**, not seed alone.

---

## 5. SQL verification queries

Run in Supabase SQL Editor after migrations.

### 5.1 `builder_watch` in rankings section enum

```sql
SELECT DISTINCT section
FROM daily_rankings
ORDER BY 1;
-- Expect section list to include: builder_watch
```

```sql
SELECT column_name, udt_name
FROM information_schema.columns
WHERE table_name = 'daily_rankings' AND column_name = 'section';
-- Confirm enum/type allows builder_watch (migration 007)
```

### 5.2 `sitemap` source type

```sql
SELECT slug, source_type, is_enabled
FROM sources
WHERE source_type = 'sitemap';
-- Expect: solanafloor-sitemap (enabled)
```

### 5.3 `market_pulse_snapshots` exists

```sql
SELECT COUNT(*) AS snapshot_rows FROM market_pulse_snapshots;
-- Table must exist (migration 006); row count may be 0 before first pulse
```

### 5.4 Topic detail `raw_items` policy

```sql
SELECT polname, polcmd, polroles::regrole[]
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
WHERE c.relname = 'raw_items';
-- Expect policy: anon_read_raw_items_via_topic_sources (migration 008)
```

### 5.5 Wave 1 source slugs

```sql
SELECT slug, name, is_enabled, status
FROM sources
WHERE slug IN (
  'drift-medium',
  'metaplex-medium',
  'magiceden-status',
  'dlnews-rss',
  'decrypt-rss'
)
ORDER BY slug;
-- Expect 5 rows, enabled (migration 009)
```

### 5.6 Wave 2 GitHub release slugs

```sql
SELECT slug, name, feed_url, is_enabled, metadata_json->>'feed_format' AS feed_format
FROM sources
WHERE slug IN (
  'agave-releases',
  'firedancer-releases',
  'jito-solana-releases'
)
ORDER BY slug;
-- Expect 3 rows, feed_format atom (migration 010)
```

### 5.7 Today’s published rankings (sanity)

```sql
SELECT section, COUNT(*) AS n
FROM daily_rankings
WHERE ranking_date = CURRENT_DATE
  AND status = 'published'
GROUP BY section
ORDER BY section;
-- Expect rows for top_heat, new_tokens, defi_signals, builder_watch, creator_angles, investor_watchlist
```

---

## 6. Environment variables

Copy `.env.example` → `.env.local` for local; set same keys in **Vercel → Production**.

### Required (private beta)

| Variable | Server-only? | If missing |
|----------|--------------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | No (public) | UI/API → mock |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No (public) | UI/API → mock |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Cron **503**; incomplete server paths |
| `CRON_SECRET` | **Yes** | Production cron **401** |

**Never** prefix `SUPABASE_SERVICE_ROLE_KEY` or `CRON_SECRET` with `NEXT_PUBLIC_`.

### Optional

| Variable | Effect if unset |
|----------|-----------------|
| `OPENAI_API_KEY` | Rule-based summaries only |
| `GEMINI_API_KEY` | No effect (not wired) |
| `JUPITER_API_KEY` | Jupiter price fetch keyless (may rate-limit) |
| `BIRDEYE_API_KEY` | Stub adapter disabled |
| `HELIUS_API_KEY` | Stub adapter disabled |
| `COINGECKO_API_KEY` | Stub adapter disabled |

---

## 7. Vercel setup

1. Import Git repo · Framework: **Next.js**
2. **Environment variables (Production):** all required vars above
3. Deploy · confirm build log passes (`npm run build` equivalent)
4. **Cron** (Dashboard → Cron Jobs, or committed `vercel.json`):
   - Must send header: `Authorization: Bearer <CRON_SECRET>`
   - Vercel Cron does not inject this by default — configure custom headers in dashboard or use external scheduler (e.g. cron-job.org) with bearer token
5. **No `vercel.json` in repo by default** — add crons in dashboard if needed

**Recommended schedules (Supabase Free–friendly):**

| Job | Cron expression | Notes |
|-----|-----------------|-------|
| `POST /api/cron/pipeline` | `0 */3 * * *` | Every 3 hours — ingest + rankings |
| `POST /api/cron/pulse` | `*/30 * * * *` | Every 30 minutes — Market Pulse |
| `POST /api/cron/cleanup` | `0 3 * * *` | Daily 03:00 UTC — after dry-run validated |

**First deploy order:** pipeline once → pulse once → smoke tests.

---

## 8. Manual first-run cron commands

Replace `YOUR_DOMAIN` and `$CRON_SECRET`.

```bash
# Health (no auth)
curl https://YOUR_DOMAIN/api/health

# Ingest + pipeline (required first)
curl -X POST https://YOUR_DOMAIN/api/cron/pipeline \
  -H "Authorization: Bearer $CRON_SECRET"

# Market Pulse (after pipeline)
curl -X POST https://YOUR_DOMAIN/api/cron/pulse \
  -H "Authorization: Bearer $CRON_SECRET"

# Cleanup preview (no deletes)
curl -X POST "https://YOUR_DOMAIN/api/cron/cleanup?dry_run=1" \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Local dev** (cron allowed without secret when `CRON_SECRET` unset):

```bash
curl -X POST http://localhost:3000/api/cron/pipeline
curl -X POST http://localhost:3000/api/cron/pulse
```

**Expect pipeline JSON:** `ok: true`, `ingest.totalItems` > 0, `process.rankingsWritten` > 0.

**Expect pulse JSON:** `ok: true`, snapshots written.

---

## 9. Smoke test checklist

After deploy + first pipeline + pulse:

- [ ] `GET /api/health` — `ok: true`, `supabasePublicConfigured`, `supabaseServiceRoleConfigured`, `cronSecretConfigured` true; `publishedCountToday` > 0; `dashboard.dataSource` = `"live"`
- [ ] `GET /api/heat/today` — `dataSource: "live"`; all section counts > 0 on active days
- [ ] `GET /api/market/pulse` — `dataSource: "live"` OR graceful updating copy on homepage (no `npm run` in UI)
- [ ] Homepage — six sections with live cards (no section marked demo)
- [ ] Top Heat filter label + “Other sections are curated separately.”
- [ ] Creator Angles — **Creator angle** block visible on cards
- [ ] Investor Watchlist — **Investor watch** block visible on cards
- [ ] Builder / Infra Watch — status and/or GitHub cards with **Status incident** / **GitHub release** badges
- [ ] Topic detail — live card → `/topics/<uuid>` — summary, evidence, sources, timeline
- [ ] Token detail — Pulse chip or `$` mint link → `/tokens/<mint>` — **Snapshot updated** or **may be stale** copy
- [ ] `npm run audit:local` (against prod `.env.local`) — `warnings: []`

---

## 10. Known limitations (tell beta users)

**Product / UX**

- Long homepage scroll (up to ~43 cards + Market Pulse) — section jump nav exists; cards are compact previews; full brief is on topic detail
- Same topic may appear in multiple sections **by design** (different persona lenses); topic detail lists all appearances in a muted rank line
- **Topic detail is reader-first:** Signal brief / Narrative brief, metric evidence (fee topics), confirmed facts vs possible interpretations, evidence & sources, timeline; **scoring details collapsed at bottom**
- **Homepage cards** show compact signal label + brief + heat bucket (scanner interest, not confidence or price direction)
- **Heat score** = scanner interest for the UTC snapshot — not confidence, validation, or price direction
- Token detail is **context only** — stored Market Pulse snapshot, not live trading or buy/sell
- **Metric 7d/30d averages** not shown unless future retention/schema supports them — see `docs/METRIC_HISTORY_FEASIBILITY.md`

**Sources not in scope (gaps)**

- Jupiter, Phantom, Backpack, Gaming, Airdrops, DAO, DePIN — not fully covered; see `DATA_SOURCES.md` for enabled list
- Some Wave 1 feeds may show **zero stored items** in 7d (Medium/status archives) — run `npm run audit:source-health` and see `docs/SOURCE_HEALTH_REVIEW.md`
- Jito blog / paid APIs intentionally not added

**Ops**

- Supabase Free: avoid hourly pipeline; 2–4h cadence recommended
- Paused Supabase → mock/mixed UI
- Prices in Pulse/token pages can be **delayed** — “Prices delayed” / stale snapshot copy

---

## 11. Rollback / emergency steps

| Situation | Action |
|-----------|--------|
| Bad rankings published | Re-run `POST /api/cron/pipeline` after fixing data; previous rows superseded per snapshot logic |
| Cron abuse / leaked secret | Rotate `CRON_SECRET` in Vercel immediately; redeploy |
| Leaked service role | Rotate Supabase service role key; update Vercel env; never commit key |
| UI shows mock/mixed | Check Supabase not paused; run pipeline; verify env vars on Vercel |
| Need to stop deletes | Do not run cleanup without `dry_run=1`; use `npm run cleanup:local -- --dry-run` to preview |
| Disable public site quickly | Vercel → pause deployment or password-protect project |
| Database disaster | Restore Supabase backup; re-apply migrations 001–010 in order on new project |

---

## 12. What to monitor daily

**Automated / CLI**

```bash
npm run audit:local -- --table
npm run audit:source-health
npm run smoke:local   # dev server must be running
```

Watch for: `warnings` non-empty · `dataSource` not `live` · `zeroItemsIn7d` growing unexpectedly · `creator_angles` persistently under cap.

**Cron:** GitHub Actions (or Vercel cron) for ingest/pipeline/pulse — schedules unchanged in polish sprints. **Cleanup** remains preview/dry-run unless explicitly enabled in ops.

**HTTP**

```bash
curl https://YOUR_DOMAIN/api/health
```

**After each pipeline cron**

- `ingest.totalItems` > 0
- `process.rankingsWritten` > 0
- No recurring 401/503 in Vercel logs

**After each pulse cron**

- `GET /api/market/pulse` → `dataSource: live`, recent `fetchedAt`

**Weekly**

```bash
npm run cleanup:local -- --dry-run
# then production: POST /api/cron/cleanup?dry_run=1
# then scheduled cleanup without dry_run
```

**Deeper audit doc:** [PRIVATE_BETA_AUDIT.md](./PRIVATE_BETA_AUDIT.md) · Sitemap SQL: [../supabase/verify-solanafloor-sitemap.sql](../supabase/verify-solanafloor-sitemap.sql)

---

## Quick reference — npm scripts

| Command | Purpose |
|---------|---------|
| `npm run lint` | ESLint |
| `npm run build` | Production build |
| `npm run ingest:local` | All adapters → `raw_items` |
| `npm run pipeline:local` | Cluster, heat, `daily_rankings` |
| `npm run pulse:local` | Market Pulse snapshots |
| `npm run audit:local` | Read-only health report |
| `npm run cleanup:local -- --dry-run` | Retention preview |

---

*Last aligned with migrations through **010** and UX Polish Sprint 1.*
