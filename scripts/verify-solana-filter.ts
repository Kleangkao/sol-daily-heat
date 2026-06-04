/**
 * Lightweight checks for Solana feed filter (run: npx tsx scripts/verify-solana-filter.ts)
 */
import { matchesSolanaFeedFilter } from "../lib/text/solana-filter";

const cases: Array<{ text: string; expected: boolean }> = [
  {
    text: "Bitcoin treasury Metaplanet launches splashy advertising",
    expected: false,
  },
  { text: "Pump.fun token surges on Solana", expected: true },
  { text: "Solana tokenization expands", expected: true },
  { text: "$WIF rallies on Solana", expected: true },
  { text: "Bitcoin ETF inflows rise", expected: false },
  { text: "Drift to issue recovery tokens in wake of hack", expected: true },
  { text: "Pump up 13%! Monero hits another ATH!", expected: false },
  { text: "Are Memes back? Pump fun launches on Solana", expected: true },
];

let failed = 0;
for (const { text, expected } of cases) {
  const got = matchesSolanaFeedFilter(text);
  if (got !== expected) {
    console.error(`FAIL: expected ${expected} got ${got} — ${text}`);
    failed += 1;
  } else {
    console.log(`ok: ${expected} — ${text.slice(0, 60)}…`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${cases.length} filter checks passed.`);
