# Broad RSS Source Discovery Audit

Read-only discovery audit for **Alice-s-hub**, **Alice Daily**, and **broad crypto RSS** candidates (Cointelegraph). No DB writes, no scoring/ranking changes, no deploy.

**Run date (UTC):** 2026-06-05  
**Audit script:** `npx tsx scripts/audit-broad-rss-discovery.ts`  
**Solana filter:** `lib/text/solana-filter.ts` → `matchesSolanaFeedFilter()` (same as The Block / DL News / Decrypt)

---

## Executive summary

| Question | Answer |
|----------|--------|
| Does **Alice-s-hub** contain RSS config? | **No** — static link hub only (`index.html` + assets + `serve`) |
| Does **Alice Daily** publish a public RSS feed? | **No** — SPA aggregator UI; `/feed`, `/rss.xml`, `/atom.xml` → 404 |
| Is **Cointelegraph global RSS** usable? | **Yes** (200, XML parses) but **high noise**; 2/30 Solana matches in current window |
| Is **Cointelegraph Solana tag RSS** real? | **Yes** — `https://cointelegraph.com/rss/tag/solana` (200, XML parses) |
| Best next step | **Shadow-test Cointelegraph Solana tag RSS**; skip global unless tag under-delivers |

---

## 1. Alice-s-hub (`Kleangkao/Alice-s-hub`)

**Repo:** https://github.com/Kleangkao/Alice-s-hub  
**Live:** https://alicearcade.ink (CNAME)

### Structure

| Path | Role |
|------|------|
| `index.html` | Single-page static hub |
| `public/` | Logo images only |
| `package.json` | `serve -l 5500 .` (local static server) |
| `CNAME` | `alicearcade.ink` |

### RSS / source config search

- GitHub code search for `rss`, `feed`, `atom`: **0 hits**
- No `sources.json`, ingest config, or adapter code
- **Conclusion:** Alice-s-hub is a **static navigation hub**, not a feed publisher or ingest config.

### Outbound links (from `index.html`)

| Card | URL | RSS relevance |
|------|-----|----------------|
| Holosim Fleet | `https://holosim-fleet-mining-calculator.vercel.app/` | App — not audited here |
| **Alice Daily** | `https://alicedaily.org/` | See §2 — no public RSS |
| Alice's Angels | `https://aliceangels.net` | Not audited (out of scope) |
| Thailand Digital Shortcuts | `https://digitalshortcuts.org/` | Not audited (out of scope) |
| Alice's Arcade | `https://x.com/AliceArcade` | Social — no RSS |
| Alice in Cryptoland | `https://x.com/CryptoAliceTH` | Social — no RSS |

---

## 2. Alice Daily (`https://alicedaily.org/`)

### Product shape

- Client-rendered **news intelligence dashboard** (“Fetching intelligence…”, category chips, live cards)
- Cards cite **third-party outlets** (CoinDesk, Bloomberg, Decrypt, The Block, etc.) — aggregator, not original publisher
- Homepage copy includes Solana-adjacent stories (e.g. Helium DePIN, “Solana Memecoin Frenzy” from Decrypt) but those are **UI-rendered citations**, not an exportable RSS surface

### RSS endpoint probes (feed-only; no article HTML scrape)

| URL | HTTP | Content-Type | Parse | Notes |
|-----|------|--------------|-------|-------|
| `https://alicedaily.org/feed` | 404 | `text/plain` | ✗ | |
| `https://alicedaily.org/rss.xml` | 404 | `text/plain` | ✗ | |
| `https://alicedaily.org/atom.xml` | 404 | `text/plain` | ✗ | |
| `https://alicedaily.org/robots.txt` | 200 | text | — | Allows crawlers; **no sitemap/feed hint** |

- Tested with default audit UA and browser UA — **no difference**
- **No `<link rel="alternate" type="application/rss+xml">`** discovered on homepage fetch
- **No Kleangkao GitHub repo** found for Alice Daily backend/API

### Recommendation

**Reject as RSS source** for sol-daily-heat ingest. If Alice Daily curation is valuable, it would require a **private API contract** or manual export — not a public RSS URL today.

---

## 3. Cointelegraph RSS candidates

### 3a. Global feed

| Field | Value |
|-------|-------|
| **URL** | `https://cointelegraph.com/rss` |
| **HTTP status** | 200 |
| **Content-Type** | `application/xml` |
| **Parse success** | ✓ (`rss-parser`) |
| **Items in feed** | 30 (hourly global cap in sample) |
| **7d / 30d items** | 30 / 30 |
| **7d / 30d Solana-filtered** | **2 / 2** |
| **Requires User-Agent** | No |
| **Noise risk** | **High** (~93% rejected in 30d window) |

**Top matched titles (Solana filter)**

1. Pump.fun bounty platform pays users to tattoo tokens and chase viral stunts  
2. Forward Industries moves $32M in SOL amid $1B paper loss  

**Rejected examples**

- Crypto Biz: Nobody told Saylor ‘never sell’  
- Here’s what happened in crypto today  
- Bitcoin teases 'seller exhaustion' as BTC price downside reaches $60.3K  
- Visa tests private stablecoin settlement with Brale, Canton  

**Recommendation:** `test_in_shadow` **only if** Solana tag feed is insufficient — prefer tag feed first. Set `requires_solana_filter: true` if enabled (same pattern as The Block / Decrypt).

---

### 3b. Solana tag feed

| Field | Value |
|-------|-------|
| **URL** | `https://cointelegraph.com/rss/tag/solana` |
| **Tag page** | `https://cointelegraph.com/tags/solana` (HTML — not ingested) |
| **HTTP status** | 200 |
| **Content-Type** | `application/xml` |
| **Parse success** | ✓ |
| **Items in feed** | 30 |
| **7d / 30d items** | 2 / 18 |
| **7d / 30d Solana-filtered** | **2 / 16** |
| **Requires User-Agent** | No |
| **Noise risk** | **Low–medium** (tag pre-filters; some non-Solana macro/stablecoin pieces still pass feed) |

**Top matched titles (Solana filter)**

1. Forward Industries moves $32M in SOL amid $1B paper loss  
2. Price predictions 6/3: BTC, ETH, BNB, XRP, SOL, HYPE, DOGE, ZEC, ADA, XLM  
3. Solana open interest drops 30% as altcoins slump: Is $68 SOL next?  
4. Solana futures funding rate turns negative: Is $78 SOL next?  
5. Pump.fun accounts for over one-third of Solana’s Q1 revenue despite memecoin slowdown  

**Rejected examples (in tag feed but fail Solana filter)**

- Solayer launches Visa-compatible card for USDC payments  
- Coinbase and AWS launch USDC payment rails for AI agents  
- Bitcoin ETFs add nearly $1B as BTC surges past $80K  

**Recommendation:** **`test_in_shadow`** — best broad RSS candidate in this audit. Native Solana tag + optional secondary filter. Suggested slug: `cointelegraph-solana-rss`. Reliability ~0.75 (below The Block 0.85; editorial + price-prediction noise).

---

## 4. Solana filter yield comparison

Snapshot from audit run (2026-06-05 UTC):

| Source | Feed items | Solana 7d | Solana 30d | Pass rate (30d) |
|--------|------------|-----------|------------|-----------------|
| Cointelegraph global + filter | 30 | 2 | 2 | ~7% |
| Cointelegraph Solana tag + filter | 30 | 2 | 16 | ~53% of dated items |
| Alice Daily (any path) | — | — | — | N/A (no feed) |

**Context vs enabled sources** (`data/sources.rss.json`):

- The Block / Decrypt / DL News already use `requires_solana_filter: true` with similar low pass rates
- Cointelegraph **Solana tag** likely yields **comparable or better** precision than global + filter
- 7d volume is **low (2 items)** in this snapshot — monitor for consistency before `add_now`

---

## 5. Recommendations matrix

| Candidate | Action | Rationale |
|-----------|--------|-----------|
| Alice-s-hub | **Defer / N/A** | Static hub; no feeds to add |
| Alice Daily public RSS | **Reject** | No RSS endpoints |
| Cointelegraph `rss/tag/solana` | **Test in shadow** | Real feed, low noise, Solana-focused |
| Cointelegraph global `rss` | **Defer** | Works but noisy; redundant if tag feed enabled |
| Cointelegraph via RSSHub/third-party | **Reject** | Unnecessary; native feeds work without UA tricks |

### Suggested shadow config (not applied)

```json
{
  "slug": "cointelegraph-solana-rss",
  "name": "Cointelegraph — Solana tag",
  "feed_url": "https://cointelegraph.com/rss/tag/solana",
  "reliability": 0.75,
  "requires_solana_filter": true,
  "max_items_per_run": 10
}
```

Enable shadow ingest only — compare overlap with The Block, Decrypt, SolanaFloor before production `add_now`.

---

## 6. Constraints honored

- ✓ No DB source inserts  
- ✓ No scoring / ranking changes  
- ✓ No article HTML scraping (RSS/XML probes only)  
- ✓ Existing Solana filter reused  
- ✓ No deploy  

## 7. Re-run

```bash
npx tsx scripts/audit-broad-rss-discovery.ts
```

Update the tables in this doc if feed volume or endpoints change.
