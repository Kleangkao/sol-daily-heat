/**
 * Load .env / .env.local for local CLI scripts (tsx ingest/pipeline).
 * Next.js loads these automatically; standalone scripts do not.
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
