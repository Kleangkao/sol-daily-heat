import "./load-env-local";
import { runIngest } from "../lib/ingest/run-ingest";

async function main() {
  console.log("Starting ingest…");
  const summary = await runIngest();
  if (summary.skipped) {
    console.error(summary.reason);
    process.exit(1);
  }
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
