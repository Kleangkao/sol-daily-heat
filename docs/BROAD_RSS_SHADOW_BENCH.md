# Broad RSS Shadow Benchmark

Standardized read-only evaluation for broad crypto RSS candidates. **No production ingest, no DB writes, no schema changes.**

## Run

```bash
npx tsx scripts/shadow-broad-rss-bench.ts
```

Registry: `data/sources.shadow.json` (`shadow_only: true`, `is_enabled: false`)

## Method

For each candidate:

1. HTTP probe + RSS/Atom parse (`rss-parser`)
2. `matchesSolanaFeedFilter()` from `lib/text/solana-filter.ts`
3. Noise class via `lib/sources/broad-rss-noise.ts`:
   - editorial · price_prediction · generic_market · press_release_or_sponsored · protocol_specific · ecosystem · infra_builder
4. **Noise %** = share of accepted items in `price_prediction | generic_market | press_release_or_sponsored`
5. **Overlap %** = URL/title cluster match vs 30d `raw_items` from The Block, Decrypt, DL News, SolanaFloor, Solana blog (read-only when Supabase env present)
6. Recommendation: `add_now` / `keep_shadow` / `defer` / `reject`

## Results — 2026-06-05 UTC

| Source | Status | Parse | Acc 7d/30d | Noise % | Overlap % | Recommendation |
|--------|--------|-------|------------|---------|-----------|----------------|
| cointelegraph-solana-rss | ok | yes | 2/16 | 58% | 0% | **keep_shadow** |
| cointelegraph-global-rss | ok | yes | 2/2 | 0% | 0% | defer |
| coindesk-rss | ok | yes | 3/3 | 0% | 0% | **add_now** |
| blockworks-rss | ok | yes | 0/0* | 0% | 0% | reject |
| cryptoslate-rss | ok | yes | 0/0 | 0% | n/a | reject |
| cryptobriefing-rss | ok | yes | 1/1 | 0% | 0% | defer |
| beincrypto-rss | ok | yes | 1/1 | 0% | 0% | defer |
| thedefiant-rss | ok | yes | 5/10 | 0% | 0% | **add_now**† |
| newsbtc-rss | ok | yes | 0/0 | 0% | n/a | reject |
| utoday-rss | ok | yes | 4/4 | 0% | 0% | **add_now**† |

\* Blockworks had 8 accepted items total but **none dated within 30d** in the feed sample (stale archive in RSS window).

† `add_now` means **future production consideration** after another shadow window — still **not enabled** in this sprint.

### Feeds failed

**0 / 10** — all configured URLs returned parseable RSS/Atom.

### Verified feed URLs

| Source | URL | Notes |
|--------|-----|-------|
| Cointelegraph Solana tag | `https://cointelegraph.com/rss/tag/solana` | |
| Cointelegraph global | `https://cointelegraph.com/rss` | |
| CoinDesk | `https://www.coindesk.com/arc/outboundfeeds/rss/` | Arc outbound (same pattern as DL News) |
| Blockworks | `https://blockworks.co/feed` | Atom; `/rss` also works |
| CryptoSlate | `https://cryptoslate.com/feed/` | |
| CryptoBriefing | `https://cryptobriefing.com/feed/` | |
| BeInCrypto | `https://beincrypto.com/feed/` | |
| The Defiant | `https://thedefiant.io/feed` | `/rss` returns 403 |
| NewsBTC | `https://www.newsbtc.com/feed/` | |
| U.Today | `https://u.today/rss` | `/feed` returns 404 |

## Noise findings

- **Cointelegraph Solana tag:** 58% low-signal noise — dominated by recurring **price-prediction roundups** (`/markets/price-predictions-*`) and generic SOL market templates. Confirms prior single-source shadow test.
- **Cointelegraph global:** Very low yield (2/30) after filter; acceptable noise but redundant vs tag feed.
- **CoinDesk / U.Today:** 0% template noise in sample; mostly editorial headlines.
- **The Defiant:** 0% template noise but several accepted items are **generic DeFi** (PENDLE, Mastercard multi-chain) that pass filter via `tokenization` / `rwa` keywords — review filter strictness for DeFi-only feeds.
- **NewsBTC / CryptoSlate:** BTC-price focused; **zero** Solana passes in sample.

## Overlap findings

- **0% overlap** across all sources vs existing 30d editorial `raw_items` in this run.
- Incremental URLs are distinct from The Block / Decrypt / SolanaFloor in the sample window.

## Production consideration ranking (shadow only)

1. **CoinDesk** — best broad RSS yield/noise ratio in 7d window (3/3 editorial).
2. **U.Today** — 4/4 accepted in 7d; watch for multi-asset “morning report” templates.
3. **The Defiant** — highest 30d volume (10); validate Solana precision before enable.
4. **Cointelegraph Solana tag** — good 30d volume (16) but keep shadow until price-prediction URLs excluded.
5. **Defer:** CryptoBriefing, BeInCrypto, Cointelegraph global (sparse).
6. **Reject:** Blockworks (no dated 30d accepts), CryptoSlate, NewsBTC.

## Related

- Single-source deep dive: `docs/COINTELEGRAPH_SHADOW_TEST.md`
- Discovery audit: `docs/SOURCE_DISCOVERY_BROAD_RSS.md`
- `npx tsx scripts/shadow-cointelegraph-solana.ts` — Cointelegraph-only runner (legacy)
