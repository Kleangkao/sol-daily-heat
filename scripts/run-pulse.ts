/**
 * Refresh Market Pulse snapshots (Jupiter watchlist + Dex hot tape).
 */
import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";
import { runMarketPulseRefresh } from "../lib/market-pulse/run-pulse";
import { fetchMarketPulse } from "../lib/market-pulse/fetch-pulse";

async function main() {
  const db = getSupabaseAdmin();
  if (!db) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const result = await runMarketPulseRefresh(db);
  console.log("Pulse refresh:", JSON.stringify(result, null, 2));

  const view = await fetchMarketPulse(db, { readClient: "admin" });
  console.log("\nAPI-shaped response:", JSON.stringify(view, null, 2));

  if (!result.jupiterOk) {
    process.exitCode = 2;
  }
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("market_pulse_snapshots") || msg.includes("PGRST205")) {
    console.error(
      "Table market_pulse_snapshots missing. Apply supabase/migrations/006_market_pulse_snapshots.sql in the Supabase SQL editor, then re-run."
    );
  } else {
    console.error(e);
  }
  process.exit(1);
});
