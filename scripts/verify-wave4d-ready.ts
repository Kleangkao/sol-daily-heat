/**
 * Wave 4D readiness check (code policy + DB enabled state). Safe to re-run.
 * Run: npx tsx scripts/verify-wave4d-ready.ts
 */
import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";
import { OFFICIAL_SOURCE_SLUGS } from "../lib/scoring/official-sources";
import {
  GITHUB_RELEASE_SOURCE_SLUGS,
  PROJECT_OFFICIAL_BLOG_SLUGS,
  PROJECT_RSS_STALE_GUARD_SLUGS,
  RSS_INGEST_ITEM_CAPS,
} from "../lib/sources/rss-ingest-policy";
import { BUILDER_SOURCE_SLUGS } from "../lib/process/builder-watch";

const WAVE4D_OFFICIAL_BLOGS = ["meteoraag-medium", "kamino-blog", "tensor-blog"] as const;
const WAVE4D_GITHUB_RELEASES = ["marginfi-releases", "kamino-releases"] as const;
const WAVE4D_ALL = [...WAVE4D_OFFICIAL_BLOGS, ...WAVE4D_GITHUB_RELEASES] as const;

function assertSetContains(set: Set<string>, slug: string, label: string, errors: string[]) {
  if (!set.has(slug)) errors.push(`${label} missing slug: ${slug}`);
}

async function main() {
  const errors: string[] = [];

  for (const slug of WAVE4D_OFFICIAL_BLOGS) {
    assertSetContains(OFFICIAL_SOURCE_SLUGS, slug, "OFFICIAL_SOURCE_SLUGS", errors);
    assertSetContains(PROJECT_OFFICIAL_BLOG_SLUGS, slug, "PROJECT_OFFICIAL_BLOG_SLUGS", errors);
    assertSetContains(PROJECT_RSS_STALE_GUARD_SLUGS, slug, "PROJECT_RSS_STALE_GUARD_SLUGS", errors);
    if (!(slug in RSS_INGEST_ITEM_CAPS)) {
      errors.push(`RSS_INGEST_ITEM_CAPS missing slug: ${slug}`);
    }
  }

  for (const slug of WAVE4D_GITHUB_RELEASES) {
    assertSetContains(GITHUB_RELEASE_SOURCE_SLUGS, slug, "GITHUB_RELEASE_SOURCE_SLUGS", errors);
    assertSetContains(BUILDER_SOURCE_SLUGS, slug, "BUILDER_SOURCE_SLUGS", errors);
    assertSetContains(PROJECT_RSS_STALE_GUARD_SLUGS, slug, "PROJECT_RSS_STALE_GUARD_SLUGS", errors);
    if (!(slug in RSS_INGEST_ITEM_CAPS)) {
      errors.push(`RSS_INGEST_ITEM_CAPS missing slug: ${slug}`);
    }
  }

  const db = getSupabaseAdmin();
  if (!db) {
    errors.push("Missing Supabase admin credentials");
  } else {
    const { data, error } = await db
      .from("sources")
      .select("slug, is_enabled, status, feed_url")
      .in("slug", [...WAVE4D_ALL]);
    if (error) throw error;

    const bySlug = new Map((data ?? []).map((r) => [r.slug as string, r]));
    for (const slug of WAVE4D_ALL) {
      const row = bySlug.get(slug);
      if (!row) {
        errors.push(`DB sources row missing: ${slug}`);
        continue;
      }
      if (!row.is_enabled) errors.push(`DB source disabled: ${slug}`);
      if (row.status !== "active") errors.push(`DB source not active: ${slug} (${row.status})`);
      if (!row.feed_url) errors.push(`DB source missing feed_url: ${slug}`);
    }
  }

  if (errors.length > 0) {
    console.error("Wave 4D readiness: FAIL");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log("Wave 4D readiness: PASS");
  console.log(`  Official blogs (${WAVE4D_OFFICIAL_BLOGS.length}): ${WAVE4D_OFFICIAL_BLOGS.join(", ")}`);
  console.log(`  GitHub releases (${WAVE4D_GITHUB_RELEASES.length}): ${WAVE4D_GITHUB_RELEASES.join(", ")}`);
  console.log("  Policy sets, ingest caps, and DB enabled state verified.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
