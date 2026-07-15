-- Postgres can generate UUIDs, but needs this extension enabled first.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- The four roles from your roadmap. An enum means the database itself
-- rejects a typo like 'sales_agnet' — it can never enter the table.
CREATE TYPE user_role AS ENUM (
  'super_admin', 'admin', 'sales_agent', 'telecaller'
);

CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           user_role NOT NULL DEFAULT 'sales_agent',

  is_active      BOOLEAN NOT NULL DEFAULT TRUE,

  -- Every token a user carries stamps this number inside it. Change a
  -- user's role (or reset their password) and you bump this — which
  -- instantly kills every token they're holding. Without it, you fire
  -- an agent at 10am and their login still works until the token expires.
  token_version  INTEGER NOT NULL DEFAULT 0,

  last_seen_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);