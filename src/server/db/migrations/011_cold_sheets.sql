-- Connected Google Sheets for cold-calling contact lists.
CREATE TABLE cold_sheets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  sheet_id      TEXT NOT NULL,
  batch         TEXT,                          -- stamped as source_batch on contacts
  auto_assign   BOOLEAN NOT NULL DEFAULT FALSE,-- round-robin on sync?
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_row      INTEGER NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  last_result    TEXT,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX cold_sheets_active_idx ON cold_sheets (is_active);