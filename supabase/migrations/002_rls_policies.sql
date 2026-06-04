-- Minimal RLS for dashboard reads (anon) + service-role writes (ingest bypasses RLS).
-- Run after 001_initial_schema.sql

ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_protocols ENABLE ROW LEVEL SECURITY;

-- Public read (matches NEXT_PUBLIC_SUPABASE_ANON_KEY in the app)
CREATE POLICY "anon_read_sources" ON sources FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_topics" ON topics FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_daily_rankings" ON daily_rankings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_tokens" ON tokens FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_protocols" ON protocols FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_topic_sources" ON topic_sources FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_topic_tokens" ON topic_tokens FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_topic_protocols" ON topic_protocols FOR SELECT TO anon, authenticated USING (true);

-- raw_items, ingest_runs: no anon policies (ingest uses service role only)
