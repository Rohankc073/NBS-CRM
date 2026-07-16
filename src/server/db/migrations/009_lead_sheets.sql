-- Connected Google Sheets, one row per campaign sheet the Super Admin adds.
-- This table holds the CONNECTIONS, not leads. Leads always go to `leads`.
CREATE TABLE lead_sheets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,                 -- friendly label, e.g. "Downtown Q1"
  sheet_id      TEXT NOT NULL,                 -- the Google Sheet ID from the URL
  campaign      TEXT,                          -- stamped on every lead from this sheet
  source_id     UUID REFERENCES lead_sources(id),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,

  -- How many data rows we've already imported. Next sync reads only rows
  -- AFTER this, so the same leads are never re-processed.
  last_row      INTEGER NOT NULL DEFAULT 0,

  last_synced_at TIMESTAMPTZ,
  last_result    TEXT,                         -- summary of the last sync for the UI

  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX lead_sheets_active_idx ON lead_sheets (is_active);