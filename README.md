# Solana Daily Heat Scanner



Daily intelligence dashboard for the Solana ecosystem — what is hot, why, how hot, and what to watch next.



**Not investment advice.** Uses neutral language: watchlist, signal, context, risk.



## Stack



- Next.js 14 (App Router), TypeScript, Tailwind CSS

- Supabase / Postgres schema (`supabase/migrations`)

- Free adapters: RSS, manual JSON, DexScreener, DefiLlama

- Rule-based Heat Score v1 (explainable `score_breakdown_json`)

- Optional OpenAI summaries when `OPENAI_API_KEY` is set



## Quick start (UI only)



```bash

npm install

npm run dev

```



Open [http://localhost:3000](http://localhost:3000). Without Supabase, the UI uses **mock data** for all sections.



## Live data setup (local)



1. Create a Supabase project and apply migrations **in order** (Supabase SQL Editor or `psql`). There is no automated migration runner in this repo — each file must be run manually.



   | # | File | Purpose |

   |---|------|---------|

   | 001 | `supabase/migrations/001_initial_schema.sql` | Core schema (sources, raw_items, topics, tokens, rankings) |

   | 002 | `supabase/migrations/002_rls_policies.sql` | Anon read policies for dashboard tables |

   | 003 | `supabase/migrations/003_source_expansion_pass1.sql` | Extra RSS sources (Helius, Raydium, The Block) |

   | 004 | `supabase/migrations/004_project_sources_pass1.sql` | Project sources (Marinade, Orca, Pyth status) |

   | 005 | `supabase/migrations/005_solanafloor_sitemap.sql` | `sitemap` source type + SolanaFloor source |

   | 006 | `supabase/migrations/006_market_pulse_snapshots.sql` | Market Pulse snapshot table |

   | 007 | `supabase/migrations/007_builder_watch_section.sql` | `builder_watch` ranking section |

   | 008 | `supabase/migrations/008_topic_detail_raw_items_read.sql` | Anon read `raw_items` via `topic_sources` (topic detail) |
   | 009 | `supabase/migrations/009_public_beta_sources_wave1.sql` | Public beta Wave 1 RSS (Drift, Metaplex, Magic Eden status, DL News, Decrypt) |
   | 010 | `supabase/migrations/010_builder_github_release_sources.sql` | Wave 2 builder GitHub release Atom feeds (Agave, Firedancer, Jito Solana) |
   | 011 | `supabase/migrations/011_broad_rss_wave3_coindesk.sql` | Wave 3 CoinDesk RSS trial (Solana-filtered, 5/run) |



   **Fresh database:** after `001` and `002`, also run `supabase/seed.sql` (base sources).



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
   psql $DATABASE_URL -f supabase/migrations/011_broad_rss_wave3_coindesk.sql

   ```

   **Existing DB shortcuts:** `npx tsx scripts/apply-wave1-sources.ts` · `npx tsx scripts/apply-wave2-github-sources.ts`



   **Do not skip 005–008 on production.** Without them: sitemap ingest fails, Market Pulse / Builder Watch / topic detail timeline break.



2. Copy `.env.example` → `.env.local` and set required vars (see [Environment variables](#environment-variables) below).



3. Ingest and process:



   ```bash

   npm run ingest:local

   npm run pipeline:local

   npm run audit:local

   ```



4. Refresh Market Pulse and rankings:



   ```bash

   npm run pulse:local

   ```



5. Refresh the homepage — `GET /api/heat/today` serves live sections where rankings exist; empty sections use mock (`dataSource`: `live`, `mock`, or `mixed`).



## Private beta deployment



**Release candidate:** [docs/RELEASE_CANDIDATE_PRIVATE_BETA.md](docs/RELEASE_CANDIDATE_PRIVATE_BETA.md) — **Private Beta RC 1** freeze record (validation snapshot, audit summary, go/no-go).

**Soft launch (Vercel):** [docs/SOFT_LAUNCH_DEPLOYMENT_CHECKLIST.md](docs/SOFT_LAUNCH_DEPLOYMENT_CHECKLIST.md) — exact Vercel build/env/cron/post-deploy curl and smoke tests (manual deploy).

**Soft launch verification (complete):** [docs/SOFT_LAUNCH_VERIFICATION.md](docs/SOFT_LAUNCH_VERIFICATION.md) — production URL, commits, cron, endpoints/tables checked, monitoring, known observations.

**Primary runbook:** [docs/PRIVATE_BETA_LAUNCH_CHECKLIST.md](docs/PRIVATE_BETA_LAUNCH_CHECKLIST.md) — go/no-go criteria, migrations **001–010**, env vars, Vercel cron, curl/SQL smoke tests, rollback, and daily monitoring.

Use this section as a short summary; follow the linked checklist for a controlled private beta. **Do not deploy without migrations 001–010 on the production Supabase project.**



### Deploy checklist (summary)



- [ ] **Migrations:** Apply `001` → `011` in order on production Supabase (SQL Editor or `psql`); run `seed.sql` on a fresh DB — see [launch checklist](docs/PRIVATE_BETA_LAUNCH_CHECKLIST.md)

- [ ] **Verify SQL:** `sources.source_type` includes `sitemap`; `daily_rankings.section` includes `builder_watch`; table `market_pulse_snapshots` exists; policy `anon_read_raw_items_via_topic_sources` on `raw_items`

- [ ] **Env vars (Vercel):** Set all [required](#required-environment-variables) variables; never prefix `SUPABASE_SERVICE_ROLE_KEY` or `CRON_SECRET` with `NEXT_PUBLIC_`

- [ ] **Deploy** the Next.js app (build must pass: `npm run build`)

- [ ] **Cron — pipeline once:** `POST /api/cron/pipeline` with `Authorization: Bearer <CRON_SECRET>` → `ok: true`, `process.rankingsWritten` > 0

- [ ] **Cron — pulse once:** `POST /api/cron/pulse` with same bearer → `ok: true`, watchlist/hot tape populated

- [ ] **Smoke tests** (see [Production smoke test](#production-smoke-test) below)

- [ ] **Schedule cron** (Vercel Cron or external): pipeline every 2–4h, pulse every 15–30m, cleanup daily/weekly

- [ ] **Optional:** `npm run audit:local` against production credentials locally (read-only report)



### Warnings



- **Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser** — server-only (cron routes, server-side token detail Dex reads). Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` belong in client bundles.

- **Do not skip migrations 005–011** — production needs sitemap source type, Market Pulse table, `builder_watch` section, topic-detail `raw_items` read policy, and Wave 1/2/3 sources.

- **`CRON_SECRET` is required in production** — without it, all `POST /api/cron/*` routes return **401** when `NODE_ENV=production`.



## Environment variables



### Required (private beta)



| Variable | Server-only? | Safe in browser? | Used for | If missing |

|----------|--------------|------------------|----------|------------|

| `NEXT_PUBLIC_SUPABASE_URL` | No | Yes | Dashboard, APIs, detail pages | UI/API fall back to mock data |

| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Yes | Anon Supabase client (RLS) | Same |

| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | **No** | Cron ingest/pipeline/pulse/cleanup; server Dex reads in token detail | Cron **503**; incomplete token timeline |

| `CRON_SECRET` | **Yes** | **No** | `Authorization: Bearer …` on cron routes | Production cron **401** |



### Optional



| Variable | In code? | Effect if unset |

|----------|----------|-----------------|

| `OPENAI_API_KEY` | Yes (`lib/process/ai-summary.ts`) | Rule-based topic summaries only |

| `GEMINI_API_KEY` | Yes (`lib/env.ts`) | No AI provider wired today |

| `JUPITER_API_KEY` | Yes (`lib/market-pulse/jupiter-price.ts`) | Jupiter price fetch still runs keyless (may rate-limit) |

| `BIRDEYE_API_KEY` | Stub only (`lib/adapters/optional/stubs.ts`) | Birdeye adapter disabled |

| `HELIUS_API_KEY` | Stub only | Helius adapter disabled |

| `COINGECKO_API_KEY` | Stub only | CoinGecko adapter disabled |



Copy `.env.example` → `.env.local` for local development.



## Private-beta daily audit (multi-day dry run)



```bash

npm run ingest:local

npm run pipeline:local

npm run audit:local

npm run cleanup:local -- --dry-run

```



- **`audit:local`** is read-only (JSON report; `--table` for console summary).

- SQL snippets, warning thresholds, and monitoring guide: [docs/PRIVATE_BETA_AUDIT.md](docs/PRIVATE_BETA_AUDIT.md).

- Sitemap-specific checks: [supabase/verify-solanafloor-sitemap.sql](supabase/verify-solanafloor-sitemap.sql).




## Supabase RLS



Migration `002_rls_policies.sql` enables **public read** on dashboard tables for the anon key and leaves writes to the **service role** (ingest/pipeline scripts and cron routes).



- Do not enable RLS manually without applying `002_rls_policies.sql`, or live reads will fail and the UI will show demo sections.

- The service role key bypasses RLS and must only run server-side.



## Operations & cron



### Health check (no secrets)



```bash

curl https://YOUR_DOMAIN/api/health

```



Returns `ok`, env booleans (public Supabase, service role configured, cron secret set), today's published ranking count, and estimated `dataSource` (`live` / `mock` / `mixed`).



### Cron routes (POST, server-only)



| Route | Purpose | Typical use |

|-------|---------|-------------|

| `/api/cron/pipeline` | **Ingest + pipeline** (recommended) | Scheduled heat refresh |

| `/api/cron/ingest` | Adapters → `raw_items` only | Debugging / split jobs |

| `/api/cron/process` | Cluster + `daily_rankings` only | After manual ingest |

| `/api/cron/pulse` | Market Pulse snapshots (watchlist + hot tape) | Every 15–30 minutes |

| `/api/cron/cleanup` | Retention deletes | Daily or weekly (dry-run first) |



All cron routes:



- Return JSON with `ok: true|false` and structured payloads (`ingest`, `process`, `cleanup`).

- Return **401** in production when `CRON_SECRET` is unset or the `Authorization` header is wrong.

- Return **503** when Supabase admin env is missing (ingest/pipeline/cleanup).

- Use **service role** only on the server — never `NEXT_PUBLIC_` for `SUPABASE_SERVICE_ROLE_KEY`.



| Environment | `CRON_SECRET` unset | `CRON_SECRET` set |

|-------------|---------------------|-------------------|

| **development** (`npm run dev`) | Cron **allowed** (local only) | `Authorization: Bearer <secret>` |

| **production** (Vercel / `npm start`) | Cron **401** | `Authorization: Bearer <secret>` required |



### Recommended cadence (private beta, Supabase Free)



| Job | Schedule | Why |

|-----|----------|-----|

| **`POST /api/cron/pipeline`** | Every **2–4 hours** | Ingest + rankings in one call; avoids hammering free-tier DB and upstream feeds |

| **`POST /api/cron/pulse`** | Every **15–30 minutes** | Refreshes Market Pulse prices/snapshots (Jupiter keyless; optional `JUPITER_API_KEY`) |

| **`POST /api/cron/cleanup`** | **Daily** (e.g. 03:00 UTC) or **weekly** | Retention on `raw_items` / `ingest_runs`; dry-run first after deploy |

| Separate `/api/cron/ingest` + `/api/cron/process` | Optional | Debugging only; prefer `pipeline` |



**Order after deploy:** run **pipeline** once, then **pulse** once (pulse uses today's rankings + Dex raw_items).



**Tradeoffs on Free tier:**



- Hourly pipeline is usually unnecessary for MVP; 2–4h is enough for editorial/metric freshness.

- Paused Supabase projects stop writes — health shows `publishedCountToday: 0` and UI may fall back to mock.

- Cleanup: preview with `?dry_run=1` or `npm run cleanup:local -- --dry-run` before first production delete.



**Vercel Cron example** (optional — no `vercel.json` in repo; add in Vercel dashboard or commit later). Cron must send `Authorization: Bearer <CRON_SECRET>` (configure header in Vercel cron settings or use an external scheduler):



```json

{

  "crons": [

    { "path": "/api/cron/pipeline", "schedule": "0 */3 * * *" },

    { "path": "/api/cron/pulse", "schedule": "*/30 * * * *" },

    { "path": "/api/cron/cleanup", "schedule": "0 3 * * *" }

  ]

}

```



Set `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel → Settings → Environment Variables (Production only, not `NEXT_PUBLIC_`).



### Production smoke test



After deploy and first pipeline + pulse cron:



1. **`GET /api/health`** — `ok: true`, `supabasePublicConfigured` and `supabaseServiceRoleConfigured` true, `cronSecretConfigured` true, `publishedCountToday` > 0, `dashboard.dataSource` is `"live"`

2. **`GET /`** — Top Heat, New Tokens, DeFi, Builder / Infra Watch, Creator, Investor sections load with live cards (not demo-only)

3. **`GET /api/market/pulse`** — `dataSource: "live"`, `fetchedAt` recent, `hotTokens` / `hotTape` populated

4. **Topic detail** — click a live heat card title → `/topics/<uuid>` loads summary, evidence, score breakdown

5. **Token detail** — click a Market Pulse chip or New Tokens `$` symbol (with mint) → `/tokens/<mint>` loads scanner context and snapshot (if pulse ran)

6. **Optional:** `GET /api/heat/today` — `dataSource: "live"`, section counts match homepage



### Local manual commands



```bash

npm run ingest:local

npm run pipeline:local

npm run cleanup:local -- --dry-run

npm run cleanup:local

curl http://localhost:3000/api/health

```



Dev cron without secret (server must be running):



```bash

curl -X POST http://localhost:3000/api/cron/pipeline

```



### Production curl examples



```bash

curl https://YOUR_DOMAIN/api/health

curl -X POST https://YOUR_DOMAIN/api/cron/pipeline \

  -H "Authorization: Bearer $CRON_SECRET"

curl -X POST https://YOUR_DOMAIN/api/cron/pulse \

  -H "Authorization: Bearer $CRON_SECRET"

curl -X POST "https://YOUR_DOMAIN/api/cron/cleanup?dry_run=1" \

  -H "Authorization: Bearer $CRON_SECRET"

curl -X POST https://YOUR_DOMAIN/api/cron/cleanup \

  -H "Authorization: Bearer $CRON_SECRET"

```



### Operational checklist (ongoing)



**After deploy** — see [Deploy checklist](#deploy-checklist) for the full first-time list.



**After each cron run**



- [ ] Pipeline JSON: `ingest.totalItems` > 0, `process.topicsProcessed` reasonable

- [ ] No persistent `503` / missing-env errors in logs

- [ ] `GET /api/health` → `publishedCountToday` > 0 on active days



**When dashboard is `mock` or `mixed`**



- [ ] Health: is `supabasePublicConfigured` true?

- [ ] Supabase project not paused (dashboard → restore project)

- [ ] RLS migration `002_rls_policies.sql` applied

- [ ] Pipeline ran today (`publishedCountToday` on health)

- [ ] Section empty in DB → mock fill for that section only (`mixed`)



**When Supabase is paused**



- [ ] Resume project in Supabase dashboard

- [ ] Re-run pipeline cron; verify health counts



**Cleanup**



- [ ] `npm run cleanup:local -- --dry-run` (or `?dry_run=1` on cron) before first production cleanup

- [ ] Confirm `wouldDelete` counts, then run without dry-run



## Project layout



| Path | Purpose |

|------|---------|

| `app/page.tsx` | Heat dashboard + Market Pulse |

| `app/topics/[id]` | Topic detail (intelligence page) |

| `app/tokens/[mint]` | Token detail (scanner context) |

| `app/api/heat/today` | Dashboard JSON (live / mock / mixed per section) |

| `app/api/market/pulse` | Market Pulse JSON (stored snapshots) |

| `app/api/health` | Ops health (env booleans, ranking counts, dataSource) |

| `app/api/cron/*` | Ingest / process / pipeline / pulse / cleanup |

| `lib/adapters/` | RSS, manual, DexScreener, DefiLlama (+ optional stubs) |

| `lib/ingest/` | `raw_items` upsert, `ingest_runs` logging |

| `lib/process/` | Clustering, scoring, rankings |

| `lib/scoring/` | Heat Score v1, decay rules |

| `lib/db/merge-dashboard.ts` | Per-section live/mock merge |

| `lib/db/run-cleanup.ts` | Retention cleanup (dry-run + batched deletes) |

| `lib/db/ops-status.ts` | Health / status aggregation |

| `lib/mock/demo-data.ts` | Demo fallback |

| `DATA_SOURCES.md` | Source catalog + RLS notes |



## Scripts



| Command | Action |

|---------|--------|

| `npm run dev` | Local UI |

| `npm run build` | Production build |

| `npm run lint` | ESLint |

| `npm run ingest:local` | Run adapters → `raw_items` |

| `npm run pipeline:local` | Cluster + score → `daily_rankings` (+ token mint repair) |

| `npm run pulse:local` | Refresh Market Pulse snapshots |

| `npm run audit:local` | Read-only private-beta audit JSON |

| `npm run audit:source-health` | Zero-volume enabled sources + recommended actions |

| `npm run audit:metric-history` | 7d/30d metric average feasibility (read-only) |

| `npm run smoke:local` | HTTP smoke test (homepage, health, topic/token if DB has samples) |

| `npm run repair:token-mints` | Backfill `tokens.mint_address` from linked Dex raw_items |

| `npm run cleanup:local -- --dry-run` | Preview retention deletes (no changes) |

| `npm run cleanup:local` | Apply retention cleanup (service role) |



## Data retention (Supabase Free)



Keeps storage bounded while preserving dashboard summaries on `topics` and `daily_rankings`.



| Table | Retention | Notes |

|-------|-----------|--------|

| `raw_items` | **7 days** (`fetched_at`) | Deleted after topics retain summaries; `topic_sources.raw_item_id` → `NULL` |

| `ingest_runs` | **14 days** (`started_at`) | Adapter run logs only |

| `topics` | **90 days** (`last_updated_at`) | Archived first, then deleted if not ranking-protected |

| `daily_rankings` | **180 days** (`ranking_date`) | **Today is never deleted** |

| Orphan `topic_sources` | **90 days** | Rows with `raw_item_id IS NULL` |

| Orphan `tokens` / `protocols` | — | Removed when no `topic_*` links remain |



**Protected topics:** any topic with a `daily_rankings` row in the last 180 days, or any row dated **today** (all statuses).



**Delete order:** archive topics → `daily_rankings` → `ingest_runs` → `raw_items` → orphan `topic_sources` → `topics` → orphan tokens/protocols.



```bash

npm run cleanup:local -- --dry-run

npm run cleanup:local

```



## Heat decay (carryover)



- **Stale repeat** (hot yesterday, no new raw today): excluded in pipeline — does not appear on the dashboard.

- **Updated story** (`is_carryover=true`): hot yesterday **and** new raw today — shown with an **Updated story** badge, not hidden.



## Disclaimer



All scores and copy are **signals and context**, not recommendations to buy or sell any asset.

