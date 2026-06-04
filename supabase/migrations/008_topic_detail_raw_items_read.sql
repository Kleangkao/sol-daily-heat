-- Allow anon read of raw_items linked to topics (topic detail timeline).
-- Ingest still uses service role only.

ALTER TABLE raw_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_raw_items_via_topic_sources" ON raw_items
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM topic_sources ts WHERE ts.raw_item_id = raw_items.id
    )
  );
