-- ── Property types the Super Admin can reconfigure ──────────────────
-- A lookup table, not an enum — so "Add property type" is possible later
-- without a migration, same pattern as lead statuses.
CREATE TABLE property_types (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE
);

-- Define the touch function here too, in case the leads migration hasn't
-- run on this machine. CREATE OR REPLACE makes it safe if it already exists.
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Approval workflow lives in one enum. Admin/Super Admin creations jump
-- straight to 'approved'; agent creations start 'pending' and stay out of
-- the live list until someone approves.
CREATE TYPE property_status AS ENUM ('pending', 'approved', 'rejected');

-- Availability is separate from approval — an approved listing can still
-- be sold or rented out.
CREATE TYPE availability_status AS ENUM (
  'available', 'reserved', 'sold', 'rented', 'off_market'
);

CREATE TABLE properties (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core identity
  name              TEXT NOT NULL,
  project_name      TEXT,
  developer         TEXT,
  type_id           UUID REFERENCES property_types(id),
  description       TEXT,

  -- Specs
  bedrooms          INTEGER,
  bathrooms         INTEGER,
  built_up_area     NUMERIC(10,2),   -- sqft
  plot_size         NUMERIC(10,2),   -- sqft
  price             NUMERIC(14,2),

  -- Location
  community         TEXT,
  exact_location    TEXT,
  google_maps_url   TEXT,

  -- Amenities as a flexible list — varies wildly per property, so JSONB
  -- rather than 30 boolean columns.
  amenities         JSONB,

  -- Status
  availability      availability_status NOT NULL DEFAULT 'available',
  completion_date   DATE,

  -- People
  assigned_agent_id UUID REFERENCES users(id),
  owner_name        TEXT,
  owner_phone       VARCHAR(32),
  owner_email       VARCHAR(255),

  -- ── Approval workflow ──
  approval_status   property_status NOT NULL DEFAULT 'pending',
  created_by        UUID REFERENCES users(id),
  approved_by       UUID REFERENCES users(id),
  approved_at       TIMESTAMPTZ,
  rejection_reason  TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX properties_approval_idx     ON properties(approval_status) WHERE deleted_at IS NULL;
CREATE INDEX properties_availability_idx ON properties(availability)    WHERE deleted_at IS NULL;
CREATE INDEX properties_agent_idx        ON properties(assigned_agent_id) WHERE deleted_at IS NULL;
CREATE INDEX properties_created_by_idx   ON properties(created_by)      WHERE deleted_at IS NULL;
CREATE INDEX properties_type_idx         ON properties(type_id)         WHERE deleted_at IS NULL;

-- ── Media: one property, many files ─────────────────────────────────
CREATE TYPE media_kind AS ENUM ('image', 'floor_plan', 'brochure', 'video');

CREATE TABLE property_media (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  kind         media_kind NOT NULL,

  -- Path on disk relative to the uploads dir, e.g. 'properties/<id>/img1.jpg'.
  -- We store the PATH, never the file bytes — same rule as always.
  file_path    TEXT NOT NULL,
  original_name TEXT,
  size_bytes   INTEGER,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX property_media_prop_idx ON property_media(property_id, kind, sort_order);

-- The touch function is defined above, so this trigger can use it.
CREATE TRIGGER properties_touch BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();