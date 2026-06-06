# Data sources

Solana Daily Heat Scanner uses **free-first** adapters. Missing API keys never break the app; failed fetches are logged per source and skipped.

| Source | Slug (seed) | Type | Cost | API key | Status | Purpose | Fallback |
|--------|-------------|------|------|---------|--------|---------|----------|
| Solana Foundation Blog | `solana-blog` | RSS | Free | No | **Enabled** | Official ecosystem news | Manual items |
| Helius Blog | `helius-blog` | RSS | Free | No | **Enabled** | Infra / dev / ecosystem (25 items/run cap) | — |
| Raydium — Medium | `raydium-medium` | RSS | Free | No | **Enabled** | DeFi / project official | — |
| The Block — News | `the-block-news` | RSS | Free | No | **Enabled** | General crypto news, **Solana-filtered at ingest** | — |
| Solana Status | `solana-status` | RSS | Free | No | **Enabled** | Incidents / maintenance | — |
| Marinade Blog | `marinade-blog` | RSS | Free | No | **Enabled** | DeFi / LST / staking (15 items/run, 30d ingest) | — |
| Orca — Medium | `orca-medium` | RSS | Free | No | **Enabled** | DeFi / DEX official publication (`orca-so.medium.com/feed`, 10/run) | — |
| Pyth Network Status | `pyth-status` | RSS | Free | No | **Enabled** | Oracle / infra incidents (10/run, 30d rank window) | — |
| Sanctum — Medium | `sanctum-medium` | RSS | Free | No | **Enabled** | DeFi / LST / restaking (5/run; low volume) | — |
| Drift — Medium | `drift-medium` | RSS | Free | No | **Enabled** | DeFi / perps official (10/run, 30d ingest) | — |
| Metaplex — Medium | `metaplex-medium` | RSS | Free | No | **Enabled** | NFT / protocol official (10/run, 30d ingest) | — |
| Magic Eden — Status | `magiceden-status` | RSS | Free | No | **Enabled** | NFT marketplace incidents (10/run, status rules) | — |
| DL News — RSS | `dlnews-rss` | RSS | Free | No | **Enabled** | DeFi / ecosystem news, **Solana-filtered at ingest** (10/run) | — |
| Decrypt — RSS | `decrypt-rss` | RSS | Free | No | **Enabled** | Ecosystem / NFT / gaming news, **Solana-filtered at ingest** (10/run) | — |
| CoinDesk — RSS | `coindesk-rss` | RSS | Free | No | **Enabled (trial)** | Broad crypto editorial, **Solana-filtered at ingest** (8/run, Wave 3 trial) | — |
| Cointelegraph — Solana tag | `cointelegraph-solana-rss` | RSS | Free | No | **Enabled** | Solana-tagged editorial + secondary filter (10/run, Wave 4A) | — |
| Agave — GitHub Releases | `agave-releases` | RSS (Atom) | Free | No | **Enabled** | Anza/Agave validator client releases (5/run, 30d ingest) | — |
| Firedancer — GitHub Releases | `firedancer-releases` | RSS (Atom) | Free | No | **Enabled** | Firedancer/Frankendancer releases (5/run, 30d ingest) | — |
| Jito Solana — GitHub Releases | `jito-solana-releases` | RSS (Atom) | Free | No | **Enabled** | Jito validator/MEV client releases (5/run, 30d ingest) | — |
| SolanaFloor — News (sitemap) | `solanafloor-sitemap` | Sitemap | Free | No | **Enabled** | Headline-only discovery via public `news/sitemap.xml` (15/run, 7d `lastmod`) | — |
| The Block — Solana (legacy) | `the-block-solana` | RSS | Free | No | **Disabled** | Superseded by `the-block-news` | — |
| DexScreener | `dexscreener-solana` | API | Free (public) | No | Enabled | New pairs, boosts, volume | Empty market section |
| DefiLlama TVL | `defillama-solana` | API | Free | No | Enabled | TVL movers, chain TVL | Stale snapshot |
| DefiLlama Fees | `defillama-fees-solana` | API | Free | No | Enabled | Solana protocol fees movers | — |
| Manual curator | `manual-curator` | Manual | Free | No | Enabled | Human watchlist drops | `data/manual-items.json` |
| Birdeye | — | API | Paid | `BIRDEYE_API_KEY` | Disabled stub | Enhanced token stats | N/A |
| Helius RPC | — | API | Paid | `HELIUS_API_KEY` | Disabled stub | RPC enrichment | N/A |
| CoinGecko Pro | — | API | Paid | `COINGECKO_API_KEY` | Disabled stub | Market cap context | N/A |

### SolanaFloor — News (sitemap) (`solanafloor-sitemap`)

- **Public endpoints only:** `https://solanafloor.com/sitemap.xml` (index) and `https://solanafloor.com/news/sitemap.xml` (articles).
- **Does not** fetch article HTML or `cms.solanafloor.com` `/items` APIs (CMS robots disallow `/items`).
- Stores **title inferred from URL slug**, canonical URL, and `lastmod` as `published_at`; `metadata_json.sitemap_discovery=true`.
- **Dedup:** `content_hash` is stable per `source_id + canonical_url` (title changes upsert the same row). Repair: `npx tsx scripts/repair-solanafloor-sitemap-dedup.ts`.
- Ingest cap **15** URLs/run; only entries with `lastmod` within **7 days**.
- Reliability **0.75** (below full RSS). UI badges: **Sitemap discovery** / **Headline-only source**.
- Discovery signal only — summaries are rule-based placeholders, not article text.
- **Ranking guards:** max **2** headline-only cards in `top_heat`; max **1** in `creator_angles` (max **2** if corroborated by full RSS/manual); investor only when title/category show clear ecosystem/risk relevance. No `official_source_bonus` or `editorial_confirmation` on headline-only-only clusters.

### The Block — News (`the-block-news`)

- Verified feed: `https://www.theblock.co/rss.xml` (general crypto, not Solana-only).
- Ingest applies a **conservative Solana keyword allowlist** before writing `raw_items` (see `lib/text/solana-filter.ts`).
- **Low-yield:** if several ingest runs log `passed_filter=0`, keep enabled but treat as optional until a Solana-tagged feed is verified. Ingest logs: `[rss:the-block-news] fetched=… passed_filter=… rejected=…`.
- Legacy seed row `the-block-solana` remains disabled with `feed_url` NULL.

### Drift — Medium (`drift-medium`)

- Feed: `https://medium.com/feed/@driftprotocol`
- **Free / no API key.** Official project Medium; RSS adapter only (no article scrape).
- **Coverage:** DeFi, perps, ecosystem. Category hint: `defi`. Ingest cap **10**/run; 30d freshness guard; eligible for official-source bonus and `investor_watchlist` when fresh.
- **Fallback:** skipped on fetch failure; other DeFi sources remain.

### Metaplex — Medium (`metaplex-medium`)

- Feed: `https://medium.com/feed/@metaplex`
- **Free / no API key.** Official NFT/protocol publication.
- **Coverage:** NFT, ecosystem, infra-adjacent protocol updates. Category hint: `nft`. Cap **10**/run; 30d ingest guard.
- **Risk:** Medium archive may include older posts; stale items skipped at ingest.

### Magic Eden — Status (`magiceden-status`)

- Feed: `https://status.magiceden.io/history.rss`
- **Free / no API key.** Status-page RSS only (no marketplace article fetch).
- **Coverage:** NFT marketplace infra, incidents, maintenance. Treated as **status** (`source_kind: status`); in `STATUS_SOURCE_SLUGS` and **Builder / Infra Watch** when fresh.
- **Not** used for Creator Angles by default (status slug excluded). Investor placement follows status rules (max 1 severe/fresh in top_heat).
- **Fallback:** empty status section if feed fails.

### DL News — RSS (`dlnews-rss`)

- Feed: `https://www.dlnews.com/arc/outboundfeeds/rss/`
- **Free / no API key.** Broad DeFi/crypto editorial; **Solana keyword filter required** before `raw_items` insert.
- Ingest cap **10**/run; reliability **0.78**; logs `[rss:dlnews-rss] fetched=… passed_filter=… rejected=… stored=…`.
- **Risk:** filter yield varies; unrelated ETH/BTC-only items are dropped. Does not dominate top_heat (per-adapter section caps).

### Builder GitHub release feeds (Wave 2)

Public **Atom only** (`releases.atom`) — no GitHub API, no release HTML scraping, no repo pages.

| Slug | Atom URL | Reliability | Cap/run |
|------|----------|-------------|---------|
| `agave-releases` | `https://github.com/anza-xyz/agave/releases.atom` | 0.88 | 5 |
| `firedancer-releases` | `https://github.com/firedancer-io/firedancer/releases.atom` | 0.86 | 5 |
| `jito-solana-releases` | `https://github.com/jito-foundation/jito-solana/releases.atom` | 0.86 | 5 |

- **Ingest:** existing `RssAdapter` + `rss-parser` (Atom supported); `metadata_json.feed_format: "atom"`, `source_kind: "github_release"`.
- **Freshness:** 30-day `published_at` ingest guard; 90-day ranking archive (same as other `PROJECT_RSS_STALE_GUARD` RSS).
- **Placement:** primary path **Builder / Infra Watch** (`BUILDER_SOURCE_SLUGS`); excluded from **Creator Angles**; not in `OFFICIAL_SOURCE_SLUGS` (no official heat-score bonus).
- **UI badges:** GitHub release · Builder source · Infra release.
- **Risk:** low volume; max 2 cards per GitHub slug in `builder_watch`.

### Decrypt — RSS (`decrypt-rss`)

- Feed: `https://decrypt.co/feed`
- **Free / no API key.** General crypto news with **Solana filter** at ingest (cap **10**/run; reliability **0.76**).
- **Coverage:** ecosystem, NFT, gaming, AI when Solana-related. Logs same filter stats as DL News.
- **Risk:** high global volume — strict allowlist only; broad non-Solana stories rejected.

### Cointelegraph — Solana tag (`cointelegraph-solana-rss`) — Wave 4A

- Feed: `https://cointelegraph.com/rss/tag/solana` (tag page HTML not ingested).
- **Free / no API key.** Solana-focused Cointelegraph editorial; **secondary** `matchesSolanaFeedFilter()` at ingest (tag pre-filters most noise).
- **Caps:** **10** items/run; reliability **0.75**; 30d ingest stale guard (filtered broad RSS).
- **Not official:** excluded from `OFFICIAL_SOURCE_SLUGS`.
- Ingest logs: `[rss:cointelegraph-solana-rss] fetched=… passed_filter=… rejected=… stored=…`.
- **Impact audit:** `npx tsx scripts/audit-source-impact.ts cointelegraph-solana-rss`.
- **Enable:** `npx tsx scripts/apply-wave4a.ts` or migration `012_wave4a_cointelegraph_coindesk.sql`.
- **Ingest guard:** `Price predictions …` listicles dropped at ingest (see `FILTERED_BROAD_RSS_SKIP_PRICE_PREDICTION_SLUGS`).
- **Risk:** generic market templates (OI / funding) may still pass — monitor vs The Block / Decrypt overlap.

### CoinDesk — RSS (`coindesk-rss`) — Wave 3 trial

- Feed: `https://www.coindesk.com/arc/outboundfeeds/rss/` (Arc outbound; same pattern as DL News).
- **Free / no API key.** Broad crypto editorial with **Solana keyword filter** at ingest.
- **Trial caps:** **8** items/run (raised Wave 4A); reliability **0.78**; 30d ingest stale guard (filtered broad RSS).
- **Not official:** excluded from `OFFICIAL_SOURCE_SLUGS` — no official-source heat bonus.
- Ingest logs: `[rss:coindesk-rss] fetched=… passed_filter=… rejected=… stored=…`.
- **Impact audit:** `npx tsx scripts/audit-source-impact.ts coindesk-rss`.
- **Risk:** single broad RSS trial — do not enable other shadow candidates simultaneously.

### Solana relevance filter (general news)

Used for `the-block-news`, `dlnews-rss`, `decrypt-rss`, `coindesk-rss`, `cointelegraph-solana-rss`, and any source with `metadata_json.requires_solana_filter: true`.

Keywords (title + snippet): ecosystem phrases and word-boundary matches for short tickers (`sol`, `spl`, `wif`, `bonk`, `pump.fun` / `pump fun` / `$PUMP` — not bare `pump` inside unrelated words, and not `spl` inside words like “splashy”). Named projects: Jupiter, Jito, Kamino, Drift, Phantom, Metaplex, etc.

`dlnews-rss`, `decrypt-rss`, and `coindesk-rss` also skip RSS items with `published_at` older than **30 days** at ingest (ingest-only stale guard).

Broad BTC/ETH-only stories are dropped unless they mention Solana or a listed ecosystem entity.

## Endpoints (implemented in adapters)

- **RSS**: per-row `sources.feed_url` via `rss-parser`; optional `max_items_per_run`, `requires_solana_filter` in `metadata_json`
- **Sitemap** (`solanafloor-sitemap`): `feed_url` → `news/sitemap.xml`; `SitemapAdapter` parses `<loc>` + `<lastmod>` only
- **DexScreener**: `https://api.dexscreener.com/token-boosts/top/v1`, `https://api.dexscreener.com/latest/dex/search?q=solana`
- **DefiLlama TVL** (`defillama-solana`): `https://api.llama.fi/protocols`, `https://api.llama.fi/v2/chains`
- **DefiLlama fees** (`defillama-fees-solana`): `https://api.llama.fi/overview/fees/solana?excludeTotalDataChart=true`
- **Manual**: `data/manual-items.json`

## Heat score (v1 additions)

- **Boost-only cap / Top Heat penalty**: paid boost clusters capped; extra `boost_top_heat_penalty` for placement.
- **Official source bonus**: fresh official/project RSS (`solana-blog`, `helius-blog`, `raydium-medium`, `marinade-blog`, `orca-medium`, `sanctum-medium`, `drift-medium`, `metaplex-medium`, `solana-status` within age limits).
- **Project RSS freshness**: ingest skips items older than **30 days** for official/status feeds; rankings drop RSS items older than **90 days**.
- **Status feeds** (`solana-status`, `pyth-status`, `magiceden-status`): primary placement `investor_watchlist` when fresh (30d); top_heat only for severe/fresh status (max 1). Investor section: max **4** metric-only, prefer ≥1 status + ≥1 editorial when eligible.
- **Editorial confirmation**: ≥2 distinct fresh RSS editorial sources in the 48h window.
- **Cross-type corroboration**: editorial + market or protocol signals on the same topic.
- **Fees**: `fee_threshold_passed`, `fee_small_base_discount` for small-base % spikes; min $25K 24h fees at ingest.

## Top Heat composition rules

- Max 2 boost-only, max 4 Dex-only, max 5 metric-only; prefer ≥2 fresh editorial/official when eligible.
- Per-source ingest caps: Helius/Marinade **15**, Orca/Drift/Metaplex/ME status **10**, Pyth status **10**, Sanctum **5**, DL News/Decrypt **10**, CoinDesk **8**, Cointelegraph Solana tag **10**, GitHub releases **5** each, The Block **15**; official/GitHub RSS older than **30d** skipped at ingest.

## Supabase RLS

Apply [`supabase/migrations/002_rls_policies.sql`](supabase/migrations/002_rls_policies.sql) after the initial schema:

- **anon / authenticated**: `SELECT` on dashboard tables
- **service role**: full access for ingest/pipeline
- **No** anon write policies

## Market Pulse V2 (display-only; no Heat Score coupling)

- **SOL anchor** + up to **7 hot tokens** from today’s scanner (`lib/market-pulse/scanner-hot-tokens.ts`).
- **Prices:** Jupiter Price V3 at `npm run pulse:local` / cron only — not on page load.
- **Sources:** Dex `raw_items` (24h, `boost` / `new_pair`), published `new_tokens` + `top_heat` (rank ≤ 5) via `topic_tokens` → `tokens.mint_address`.
- **Fallback:** if &lt; 4 dynamic tokens after filters, fill from known allowlist (`lib/market-pulse/known-token-allowlist.ts`) labeled **Known token**.
- **Caps:** max 2 promoted boosts, max 3 low/unknown liquidity; dedupe by mint; **not** sorted by % gain.
- **hot_tape:** separate row; excludes mints already in hot tokens (max 5).
- **Risks:** pump.fun / paid boost spam — heuristic penalty on `*pump` mints; missing Jupiter price shows `—` (no fake prices).

Snapshot shape (`market_pulse_snapshots.watchlist`): `{ anchor, hotTokens }`. V1 array snapshots are normalized on read.

## Ingest commands

```bash
npm run ingest:local    # Fetch → raw_items
npm run pipeline:local  # Cluster → topics → daily_rankings
npm run pulse:local     # Jupiter watchlist + Dex hot tape snapshots
```

After updating `seed.sql` on an existing database, insert new source rows (or re-seed) before ingest.

## UI data path

1. `GET /api/heat/today` loads Supabase when `NEXT_PUBLIC_SUPABASE_*` is set.
2. Each section uses **live** rows when available; empty sections use **mock** (`dataSource`: `live` | `mock` | `mixed`).
