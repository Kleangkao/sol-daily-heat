# Solana Space — Product Phase 1

**Public product name:** Solana Space  
**Internal repo / deployment:** `sol-daily-heat` (unchanged)

Phase 1 is a **visible rebrand and copy structure** only. Ranking logic, cron, ingest adapters, and database schema are unchanged.

---

## Product sections (Phase 1 mapping)

| Public section | Pipeline / DB section | Purpose |
|----------------|----------------------|---------|
| **Hot on Solana** | `top_heat` | Daily heat, important signals, standout ecosystem activity |
| **New & Trending on Solana** | `new_tokens` | Newly discovered projects, launches, tokens, pools, or builder signals — **not every new mint** |
| **Creator Space** · *Project on Solana of the Day* | `creator_angles` | One evidence-based daily spotlight (project, creator, builder, or launch) |

Supporting sections (unchanged in Phase 1): DeFi / Protocol Signals, Builder / Infra Watch, Investor Watchlist.

### Editorial principles

- Do **not** promise “all Solana news” — prefer **tracked Solana coverage**.
- New tokens alone are **not** sufficient for placement; traction or corroboration required.
- Summaries are **original and short** with attribution links — no copied article text.
- Twitter/X is **optional**, not core infrastructure.

---

## Creator Space — future MVP plan (not built in Phase 1)

### Goal

Daily **Project on Solana of the Day** with a structured, evidence-first brief:

1. **What happened**
2. **Evidence**
3. **Why it matters**
4. **Sources**

### Candidate sources (free-first)

| Source | Role |
|--------|------|
| RSS feeds | Official blogs, ecosystem news |
| Google News RSS | Targeted Solana queries |
| Reddit RSS | Community signal (low weight) |
| DefiLlama API | Protocol / TVL context |
| DEX Screener API | On-chain pair / launch context |
| GeckoTerminal API | Market corroboration |
| GitHub public API / Atom | Releases, activity |
| CoinGecko free tier | Optional reference pricing |
| Solana Status | Network / infra events |
| Official project blogs | Primary narrative |
| Curated official watchlist | Editorial seed list |

### Source badges (display)

- Official
- Independent media
- On-chain data
- Community signal
- Unverified

### Confidence levels

- High
- Medium
- Low

### MVP scope (suggested order)

1. **Editorial template + UI** — render Creator Space card with the four-part summary format (manual or rules-based fill from existing `creator_angles` rows).
2. **Source registry** — static config of RSS/API endpoints with badge + confidence defaults (no new DB tables initially; JSON config in repo).
3. **Daily picker job** — extend pipeline *later* to select one spotlight candidate from ingested signals + watchlist (rules, not LLM).
4. **Attribution layer** — link-out only; no full-text ingest of paywalled or copyrighted content.

### Out of scope for MVP

- Paid APIs
- X/Twitter scraping as a core dependency
- Telegram / Discord scraping
- AI-generated summaries
- New database tables (until schema is explicitly approved)

---

## Phase 1 validation

- `npm run lint`
- `npm run build`
- Local homepage loads; `/api/health` and `/api/heat/today` remain live
- No migrations, env changes, or cron changes
