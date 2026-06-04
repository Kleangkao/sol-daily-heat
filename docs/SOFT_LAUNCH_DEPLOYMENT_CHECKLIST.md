# Soft Launch Deployment Checklist (Vercel)

**Purpose:** Exact steps to deploy **Private Beta RC 1** to Vercel for a controlled soft launch. **You deploy manually** — this repo does not auto-deploy.

**Prerequisites:** [RELEASE_CANDIDATE_PRIVATE_BETA.md](./RELEASE_CANDIDATE_PRIVATE_BETA.md) · [PRIVATE_BETA_LAUNCH_CHECKLIST.md](./PRIVATE_BETA_LAUNCH_CHECKLIST.md)

---

## Deployment readiness

| Check | Status |
|-------|--------|
| RC 1 validation (migrations 001–010, audit `warnings: []`) | **Ready** |
| `npm run lint` / `npm run build` | **Ready** (re-run before deploy) |
| `vercel.json` in repo | **Missing** (configure in Vercel UI or add later) |
| Cron routes | **POST only** — see [Cron setup](#cron-setup) |
| App/schema changes at deploy | **None required** for soft launch |

**Verdict:** **Ready for soft launch** once Vercel env points at the **same clean Supabase project** that passed production-like validation.

---

## Missing / manual config (not in repo)

1. **`vercel.json`** — not committed. Cron schedules go in Vercel Dashboard **or** you add `vercel.json` later.
2. **Cron HTTP method** — all `/api/cron/*` routes export **`POST` only**. Native Vercel Cron invocations are typically **GET** and will **not** hit these handlers unless you use an external scheduler or add GET wrappers (out of scope for RC 1).
3. **Cron `Authorization` header** — Vercel Cron does not inject `Bearer` automatically. Use:
   - **Recommended:** External scheduler (e.g. cron-job.org, GitHub Actions) with `POST` + `Authorization: Bearer $CRON_SECRET`, or
   - Manual first-run curls below, then wire scheduler.
4. **Supabase project ID** — copy URL/keys from the **validated clean project** (same as current `.env.local`). Do not point production at a different DB without re-running migrations 001–010.

---

## Supabase project (which one to use)

Use the **clean Supabase project** where you already applied:

- Migrations **001–010** + `seed.sql` (fresh path)
- Successful `ingest:local` / `pipeline:local` / `pulse:local` / `audit:local` with `warnings: []`

Copy these three values from that project into Vercel **Production** env (and keep `.env.local` aligned for local ops):

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- Anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Service role key → `SUPABASE_SERVICE_ROLE_KEY` (**server only**)

**Do not** create a new Supabase project at deploy time unless you repeat the full migration + seed + verification sequence.

---

## Vercel project setup (step-by-step)

### 1. Import repository

1. [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Import this Git repository
3. Confirm framework detection

### 2. Build settings (defaults are correct)

| Setting | Value |
|---------|--------|
| **Framework Preset** | Next.js |
| **Root Directory** | `.` (repo root) |
| **Install Command** | `npm install` |
| **Build Command** | `npm run build` |
| **Output Directory** | *(leave default — Next.js)* |
| **Node.js Version** | 20.x (recommended; match local if issues) |

No custom `next.config.mjs` overrides required (`next.config.mjs` is empty `{}`).

### 3. Environment variables (Production)

Add in **Settings → Environment Variables → Production**:

| Name | Value | `NEXT_PUBLIC_`? |
|------|--------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | **No** |
| `CRON_SECRET` | Long random string (e.g. `openssl rand -hex 32`) | **No** |

**Optional (not required for soft launch):**

- `OPENAI_API_KEY` — AI summaries only
- `JUPITER_API_KEY` — Jupiter works keyless
- `GEMINI_API_KEY`, `BIRDEYE_API_KEY`, `HELIUS_API_KEY`, `COINGECKO_API_KEY` — stubs / optional

Redeploy after changing env vars.

### 4. Deploy

1. **Deploy** production branch
2. Confirm build log ends with success (same as local `npm run build`)
3. Note production URL: `https://<your-app>.vercel.app`

---

## Post-deploy first-run (exact commands)

Replace:

- `YOUR_DOMAIN` — Vercel production URL (no trailing slash)
- `CRON_SECRET` — same value as Vercel env

### 1. Health (no auth)

```bash
curl -sS "https://YOUR_DOMAIN/api/health" | jq .
```

**Expect:** `ok: true`, `env.supabasePublicConfigured: true`, `env.supabaseServiceRoleConfigured: true`, `env.cronSecretConfigured: true`, `dashboard.dataSource: "live"`, `rankings.publishedCountToday` > 0 (after pipeline).

### 2. Pipeline (ingest + rankings) — run first

```bash
curl -sS -X POST "https://YOUR_DOMAIN/api/cron/pipeline" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" | jq .
```

**Expect:** `ok: true`, `ingest.totalItems` > 0, `process.rankingsWritten` > 0.

### 3. Market Pulse — run after pipeline

```bash
curl -sS -X POST "https://YOUR_DOMAIN/api/cron/pulse" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" | jq .
```

**Expect:** `ok: true`, pulse payload with snapshots.

### 4. Market Pulse read (no auth)

```bash
curl -sS "https://YOUR_DOMAIN/api/market/pulse" | jq .
```

**Expect:** `dataSource: "live"`, recent `fetchedAt`, `anchor` / `hotTokens` / `hotTape` populated.

### 5. Cleanup dry-run (optional, before scheduling deletes)

```bash
curl -sS -X POST "https://YOUR_DOMAIN/api/cron/cleanup?dry_run=1" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" | jq .
```

**Expect:** `ok: true`, `dryRun: true`, review `wouldDelete` before enabling daily cleanup.

---

## Cron setup

### Recommended schedule (soft launch)

| Job | Cadence | Cron expression | Route |
|-----|---------|-----------------|-------|
| Pipeline | Every **3 hours** | `0 */3 * * *` | `POST /api/cron/pipeline` |
| Pulse | Every **30 minutes** | `*/30 * * * *` | `POST /api/cron/pulse` |
| Cleanup | **Daily** 03:00 UTC (after dry-run) | `0 3 * * *` | `POST /api/cron/cleanup` |

**First day order:** pipeline → pulse → smoke tests → then enable schedulers.

### Option A — External scheduler (recommended for RC 1)

Use any HTTP cron that supports **POST** + custom headers:

```http
POST https://YOUR_DOMAIN/api/cron/pipeline
Authorization: Bearer <CRON_SECRET>
```

```http
POST https://YOUR_DOMAIN/api/cron/pulse
Authorization: Bearer <CRON_SECRET>
```

### Option B — Optional `vercel.json` (if your plan supports cron + auth)

Repo does **not** include this file today. Example only — **verify** your Vercel plan supports cron auth for POST; otherwise use Option A:

```json
{
  "crons": [
    { "path": "/api/cron/pipeline", "schedule": "0 */3 * * *" },
    { "path": "/api/cron/pulse", "schedule": "*/30 * * * *" },
    { "path": "/api/cron/cleanup", "schedule": "0 3 * * *" }
  ]
}
```

If Vercel cron only sends GET, these paths will **405** until routes accept GET or you use Option A.

### PowerShell (Windows) first-run example

```powershell
$Domain = "https://YOUR_DOMAIN"
$Secret = "your-cron-secret"
$Headers = @{ Authorization = "Bearer $Secret" }

Invoke-RestMethod -Uri "$Domain/api/health" -Method Get
Invoke-RestMethod -Uri "$Domain/api/cron/pipeline" -Method Post -Headers $Headers
Invoke-RestMethod -Uri "$Domain/api/cron/pulse" -Method Post -Headers $Headers
Invoke-RestMethod -Uri "$Domain/api/market/pulse" -Method Get
```

---

## Smoke test checklist (production)

After first pipeline + pulse on Vercel:

- [ ] `GET /api/health` → `dashboard.dataSource` is **`live`** (not `mock` / `mixed` unless intentional)
- [ ] Homepage disclaimer reflects **live** data (not demo-only)
- [ ] **All six sections** show live cards: Top Heat, New Tokens, DeFi, Builder, Creator, Investor
- [ ] **Market Pulse** — `GET /api/market/pulse` → `dataSource: live` **or** homepage shows “Market context is updating…” (no `npm run` CLI text)
- [ ] **Top Heat category filter** label + “Other sections are curated separately.”
- [ ] **Creator Angles** — “Creator angle” block on cards when metadata present
- [ ] **Investor Watchlist** — “Investor watch” block when metadata present
- [ ] **Builder** — GitHub / status badges visible where applicable
- [ ] **Topic detail** — click live card title → `/topics/<uuid>` loads
- [ ] **Token detail** — Pulse chip or `$` mint → `/tokens/<mint>` + snapshot freshness copy
- [ ] Optional: `GET /api/heat/today` → `dataSource: "live"`, section counts match UI
- [ ] Local against same DB: `npm run audit:local` → `warnings: []`

---

## Pre-deploy verification (local, same Supabase)

Run once more from repo root before clicking Deploy:

```bash
npm run lint
npm run build
npm run ingest:local
npm run pipeline:local
npm run pulse:local
npm run audit:local
npm run cleanup:local -- --dry-run
```

---

## Rollback

- **Vercel:** Promote previous deployment in Deployments tab
- **Supabase:** Do not swap project without migration replay; use Supabase backup if needed
- **Secrets:** Rotate `CRON_SECRET` and service role if exposed

---

## Related docs

- [RELEASE_CANDIDATE_PRIVATE_BETA.md](./RELEASE_CANDIDATE_PRIVATE_BETA.md)
- [PRIVATE_BETA_LAUNCH_CHECKLIST.md](./PRIVATE_BETA_LAUNCH_CHECKLIST.md)
- [PRIVATE_BETA_AUDIT.md](./PRIVATE_BETA_AUDIT.md)

---

*Soft launch — Vercel manual deploy only. No schema changes at checklist freeze.*
