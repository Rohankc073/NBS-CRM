-- A short, human-friendly lead number (1001, 1002, ...) alongside the UUID.
-- Agents can search and reference "#1042" instead of a UUID.
CREATE SEQUENCE IF NOT EXISTS lead_ref_seq START 1001;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS ref_no INTEGER;

-- Backfill existing leads in creation order.
UPDATE leads SET ref_no = nextval('lead_ref_seq')
  WHERE ref_no IS NULL;

-- New leads auto-get the next number.
ALTER TABLE leads
  ALTER COLUMN ref_no SET DEFAULT nextval('lead_ref_seq');

-- Fast lookup + uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS leads_ref_no_idx ON leads (ref_no);