import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";
import { repairTokenMintsFromTopicSources } from "../lib/process/repair-token-mints";

async function main() {
  const db = getSupabaseAdmin();
  if (!db) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const result = await repairTokenMintsFromTopicSources(db);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
