-- ── Configurable lead statuses ──────────────────────────────────────
-- One list, admin-editable: New, No Answer, Interested, Callback,
-- Meeting Fixed, Site Visit, Closed, Lost, Hot, Warm, Cold, etc.
-- is_won / is_lost drive conversion metrics; is_default is where new
-- leads land.
CREATE TABLE lead_statuses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  color       TEXT,                              -- optional hex for the badge
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  is_won      BOOLEAN NOT NULL DEFAULT FALSE,
  is_lost     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── Configurable lead sources ───────────────────────────────────────
CREATE TABLE lead_sources (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── Leads ───────────────────────────────────────────────────────────
CREATE TABLE leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Required core
  name              TEXT NOT NULL,
  phone             VARCHAR(32) NOT NULL,   -- as received, for display
  phone_normalized  VARCHAR(20) NOT NULL,   -- E.164 — duplicate key

  -- Optional core (present on some campaigns, not others)
  alt_phone         VARCHAR(32),
  whatsapp          VARCHAR(32),
  email             VARCHAR(255),
  nationality       TEXT,

  -- Requirement
  budget_min        NUMERIC(14,2),
  budget_max        NUMERIC(14,2),
  preferred_type    TEXT,              -- free text from the sheet
  preferred_location TEXT,
  bedrooms          TEXT,              -- "studio", "2", "3+" — kept as text

  -- Pipeline
  status_id         UUID NOT NULL REFERENCES lead_statuses(id),
  source_id         UUID REFERENCES lead_sources(id),
  campaign          TEXT,              -- Meta campaign name

  assigned_to       UUID REFERENCES users(id),

  notes             TEXT,

  -- Everything campaign-specific that varies per sheet lands here.
  -- No migration needed when a new campaign adds a new column.
  extra             JSONB,

  next_follow_up_at TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,

  created_by        UUID REFERENCES users(id),   -- null = imported
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

-- Duplicate detection: one active lead per phone number.
CREATE UNIQUE INDEX leads_phone_unique
  ON leads (phone_normalized) WHERE deleted_at IS NULL;

-- Indexes for the filters/sorts the list will actually run — this is
-- what keeps it fast at tens of thousands of rows.
CREATE INDEX leads_assigned_idx  ON leads (assigned_to)       WHERE deleted_at IS NULL;
CREATE INDEX leads_status_idx    ON leads (status_id)         WHERE deleted_at IS NULL;
CREATE INDEX leads_source_idx    ON leads (source_id)         WHERE deleted_at IS NULL;
CREATE INDEX leads_followup_idx  ON leads (next_follow_up_at) WHERE deleted_at IS NULL;
CREATE INDEX leads_created_idx   ON leads (created_at DESC);

-- Fuzzy + substring name search (needs pg_trgm; safe if already enabled).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX leads_name_trgm_idx ON leads USING gin (name gin_trgm_ops);

-- ── Stage history: every status change, who + when ──────────────────
CREATE TABLE lead_stage_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id        UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  from_status_id UUID REFERENCES lead_statuses(id),
  to_status_id   UUID NOT NULL REFERENCES lead_statuses(id),
  changed_by     UUID REFERENCES users(id),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX lsh_lead_idx ON lead_stage_history (lead_id, created_at DESC);

-- ── Round-robin assignment pointer ──────────────────────────────────
-- One tiny row remembers which agent got the last lead, so the next
-- lead goes to the next agent in rotation.
CREATE TABLE assignment_state (
  id                 INTEGER PRIMARY KEY DEFAULT 1,
  last_agent_id      UUID REFERENCES users(id),
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO assignment_state (id) VALUES (1);

-- updated_at trigger (function already exists from properties migration)
CREATE TRIGGER leads_touch BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();