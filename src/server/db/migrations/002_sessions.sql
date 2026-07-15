-- Makes login revocable. A JWT on its own can't be cancelled — fire an
-- agent at 10am and their token still opens the CRM until it expires.
-- One row here = one active login. Delete the row, the session dies.

CREATE TABLE sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ON DELETE CASCADE: delete a user, their sessions vanish with them.
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- A HASH of the refresh token, never the token itself. Same reasoning
  -- as passwords: if this table leaks, the contents are useless.
  refresh_token_hash  TEXT NOT NULL UNIQUE,

  -- Lets a user see "MacBook · Dubai · 2 hours ago" and revoke it.
  -- This is the "User Sessions" feature from your roadmap.
  user_agent          TEXT,
  ip                  VARCHAR(45),

  expires_at          TIMESTAMPTZ NOT NULL,
  revoked_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- "Agents Online" counts unexpired, unrevoked sessions per user.
-- Without this index that query scans the whole table.
CREATE INDEX sessions_user_idx ON sessions(user_id);