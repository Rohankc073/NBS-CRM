-- Cold-calling contacts: property-owner / prospect lists agents call through.
-- Separate from `leads` (Meta campaign leads) - different data shape.

CREATE TABLE cold_contacts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_no         INTEGER,                        -- human ID (#C1001)

  -- Core (name + phone always present; rest optional)
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL,
  phone_normalized TEXT,
  mobile         TEXT,
  secondary_mobile TEXT,
  email          TEXT,

  -- Property details (often present in cold lists)
  building       TEXT,
  unit_number    TEXT,
  no_of_beds     TEXT,
  sqft           TEXT,

  -- Workflow. Status is a simple fixed string (no lookup table).
  status         TEXT NOT NULL DEFAULT 'New',    -- New/Contacted/Not Interested/Interested/Callback/Converted
  assigned_to    UUID REFERENCES users(id),
  remark         TEXT,
  next_follow_up_at TIMESTAMPTZ,

  -- If this contact was converted into a pipeline lead, link to it.
  converted_lead_id UUID REFERENCES leads(id),
  converted_at   TIMESTAMPTZ,

  -- Anything else from the sheet we didn't map
  extra          JSONB DEFAULT '{}'::jsonb,

  -- Where it came from
  source_batch   TEXT,                           -- import label, e.g. "Marina Towers list"

  created_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

-- Human-friendly ref number (#C1001, C1002...).
CREATE SEQUENCE IF NOT EXISTS cold_ref_seq START 1001;
ALTER TABLE cold_contacts ALTER COLUMN ref_no SET DEFAULT nextval('cold_ref_seq');
CREATE UNIQUE INDEX cold_contacts_ref_idx ON cold_contacts (ref_no);

-- Dedup by phone within active contacts.
CREATE UNIQUE INDEX cold_contacts_phone_idx
  ON cold_contacts (phone_normalized)
  WHERE deleted_at IS NULL AND phone_normalized IS NOT NULL;

CREATE INDEX cold_contacts_assigned_idx ON cold_contacts (assigned_to);
CREATE INDEX cold_contacts_status_idx ON cold_contacts (status);
CREATE INDEX cold_contacts_created_idx ON cold_contacts (created_at DESC);

-- Channel activity log: every call/WhatsApp/email/SMS attempt.
CREATE TABLE contact_activity (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id   UUID NOT NULL REFERENCES cold_contacts(id) ON DELETE CASCADE,
  channel      TEXT NOT NULL,                    -- call/whatsapp/email/sms
  note         TEXT,
  done_by      UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX contact_activity_contact_idx ON contact_activity (contact_id, created_at DESC);

-- Self-contained touch function (doesn't depend on leads_touch existing).
CREATE OR REPLACE FUNCTION cold_contacts_touch_fn()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cold_contacts_touch
  BEFORE UPDATE ON cold_contacts
  FOR EACH ROW EXECUTE FUNCTION cold_contacts_touch_fn();