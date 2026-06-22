import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";

/** Fresh .next on every dev start — avoids stale chunk/CSS 404s after build or HMR drift. */
if (existsSync(".next")) {
  rmSync(".next", { recursive: true, force: true });
  console.log("[dev] Cleaned .next cache");
}

const child = spawn("next", ["dev"], { stdio: "inherit", shell: true });
child.on("exit", (code) => process.exit(code ?? 0));
