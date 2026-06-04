-- Allow builder_watch in daily_rankings.section
ALTER TABLE daily_rankings DROP CONSTRAINT IF EXISTS daily_rankings_section_check;

ALTER TABLE daily_rankings ADD CONSTRAINT daily_rankings_section_check CHECK (
  section IN (
    'top_heat',
    'new_tokens',
    'defi_signals',
    'creator_angles',
    'investor_watchlist',
    'builder_watch'
  )
);
