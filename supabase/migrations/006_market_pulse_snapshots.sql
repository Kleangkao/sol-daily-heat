-- Market Pulse snapshots (watchlist + hot tape). Latest row per slot; no topic clustering.

CREATE TABLE market_pulse_snapshots (
  slot TEXT PRIMARY KEY CHECK (slot IN ('watchlist', 'hot_tape')),
  payload_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_mix JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_market_pulse_fetched ON market_pulse_snapshots (fetched_at DESC);

ALTER TABLE market_pulse_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_market_pulse_snapshots"
  ON market_pulse_snapshots
  FOR SELECT
  TO anon, authenticated
  USING (true);
